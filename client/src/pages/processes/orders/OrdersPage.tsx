import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { ordersApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, FileText, Check, X, Truck, Download } from "lucide-react";

const ORDER_STATUSES = ["ALL", "INITIATED", "APPROVED", "SHIPPED", "RECEIVED", "CANCELLED"];

const statusColors: Record<string, string> = {
  INITIATED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  SHIPPED: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  RECEIVED: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const { hasPermission } = useAuth();
  const { toast } = useToast();

  const buildQueryString = () => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", "20");
    if (status !== "ALL") params.set("status", status);
    if (search) params.set("poNumber", search);
    return `/api/order?${params.toString()}`;
  };

  const { data, isLoading } = useQuery<any>({
    queryKey: [buildQueryString()],
  });

  const invalidateOrders = () => {
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/order');
      }
    });
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => ordersApi.approve(id),
    onSuccess: () => {
      invalidateOrders();
      toast({ title: "Order approved successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to approve order", description: error.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => ordersApi.cancel(id),
    onSuccess: () => {
      invalidateOrders();
      toast({ title: "Order cancelled successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to cancel order", description: error.message, variant: "destructive" });
    },
  });

  const downloadPdf = async (orderId: string, referenceId: string) => {
    try {
      const blob = await ordersApi.getPdf(orderId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${referenceId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({ title: "Failed to download PDF", variant: "destructive" });
    }
  };

  const orders = data?.data || [];
  const totalCount = data?.count || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">Manage your orders and shipments</p>
        </div>
        {hasPermission(["OrderCreateAll", "OrderCreateSelf"]) && (
          <Link href="/processes/orders/add">
            <Button data-testid="button-add-order">
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>All Orders ({totalCount})</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by PO Number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 w-[200px]"
                  data-testid="input-search-orders"
                />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === "ALL" ? "All Statuses" : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No orders found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference ID</TableHead>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: any) => (
                  <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                    <TableCell className="font-medium">{order.referenceId}</TableCell>
                    <TableCell>{order.poNumber || "-"}</TableCell>
                    <TableCell>{order.customer?.name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{order.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[order.status] || ""}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.totalRequiredQuantity || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link href={`/processes/orders/update/${order.id}`}>
                          <Button variant="ghost" size="icon" title="View/Edit">
                            <FileText className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Download PDF"
                          onClick={() => downloadPdf(order.id, order.referenceId)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {order.status === "INITIATED" && hasPermission("OrderManagement") && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Approve"
                              onClick={() => approveMutation.mutate(order.id)}
                              disabled={approveMutation.isPending}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Cancel"
                              onClick={() => cancelMutation.mutate(order.id)}
                              disabled={cancelMutation.isPending}
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                        {order.status === "APPROVED" && (
                          <Link href={`/processes/shipments/add/${order.id}`}>
                            <Button variant="ghost" size="icon" title="Create Shipment">
                              <Truck className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
