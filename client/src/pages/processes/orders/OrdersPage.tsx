import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, FileText, Check, X, Truck, Download, Filter, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

type StatusFilter = "ALL" | "INITIATED" | "APPROVED" | "SHIPPED" | "SHIPPED-PARTIAL" | "RECEIVED" | "RETURNED" | "CANCELLED";
type TypeFilter = "ALL" | "INBOUND" | "OUTBOUND";

const statusColors: Record<string, string> = {
  INITIATED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  SHIPPED: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  "SHIPPED-PARTIAL": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  RECEIVED: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  RETURNED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export default function OrdersPage() {
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const { hasPermission } = useAuth();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/order?limit=100"],
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
  const totalCount = data?.count || orders.length;

  const filteredOrders = useMemo(() => {
    return orders.filter((order: any) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        order.referenceId?.toLowerCase().includes(searchLower) ||
        order.poNumber?.toLowerCase().includes(searchLower) ||
        order.customer?.name?.toLowerCase().includes(searchLower) ||
        order.carrier?.name?.toLowerCase().includes(searchLower);

      const matchesStatus = statusFilter === "ALL" ||
        order.status?.toUpperCase() === statusFilter;

      const matchesType = typeFilter === "ALL" ||
        order.type?.toUpperCase() === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [orders, searchQuery, statusFilter, typeFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: orders.length };
    orders.forEach((o: any) => {
      const status = o.status?.toUpperCase() || "UNKNOWN";
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  const typeCounts = useMemo(() => {
    const counts = { ALL: orders.length, INBOUND: 0, OUTBOUND: 0 };
    orders.forEach((o: any) => {
      const type = o.type?.toUpperCase();
      if (type === "INBOUND") counts.INBOUND++;
      else if (type === "OUTBOUND") counts.OUTBOUND++;
    });
    return counts;
  }, [orders]);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "ALL" || typeFilter !== "ALL";

  const statusButtons: StatusFilter[] = ["ALL", "INITIATED", "APPROVED", "SHIPPED", "SHIPPED-PARTIAL", "RECEIVED", "RETURNED", "CANCELLED"];

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
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <CardTitle>All Orders ({totalCount})</CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by reference ID, PO number, customer, or carrier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-orders"
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Status:</span>
                <div className="flex gap-1 flex-wrap">
                  {statusButtons.map((status) => (
                    <Button
                      key={status}
                      variant={statusFilter === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter(status)}
                      data-testid={`filter-status-${status.toLowerCase()}`}
                    >
                      {status === "ALL" ? "All" : status === "SHIPPED-PARTIAL" ? "Partial" : status.charAt(0) + status.slice(1).toLowerCase()}
                      {statusCounts[status] !== undefined && (
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {statusCounts[status] || 0}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Type:</span>
                <div className="flex gap-1">
                  {(["ALL", "INBOUND", "OUTBOUND"] as TypeFilter[]).map((type) => (
                    <Button
                      key={type}
                      variant={typeFilter === type ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTypeFilter(type)}
                      data-testid={`filter-type-${type.toLowerCase()}`}
                    >
                      {type === "ALL" ? "All" : type.charAt(0) + type.slice(1).toLowerCase()}
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {typeCounts[type]}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </div>
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
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              {hasActiveFilters ? (
                <>
                  <p>No orders match your filters</p>
                  <Button variant="ghost" onClick={clearFilters} className="mt-2">
                    Clear filters
                  </Button>
                </>
              ) : (
                <p>No orders found</p>
              )}
            </div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground mb-4">
                Showing {filteredOrders.length} of {totalCount} orders
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference ID</TableHead>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Carrier</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Shipped Date</TableHead>
                    <TableHead>Returned Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order: any) => (
                    <TableRow 
                      key={order.id} 
                      data-testid={`row-order-${order.id}`}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/processes/orders/update/${order.id}`)}
                    >
                      <TableCell className="font-medium">{order.referenceId}</TableCell>
                      <TableCell>{order.poNumber || "-"}</TableCell>
                      <TableCell>{order.customer?.name || "-"}</TableCell>
                      <TableCell>{order.carrier?.name || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {order.type?.toUpperCase() === "INBOUND" ? (
                            <ArrowDownToLine className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <ArrowUpFromLine className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          )}
                          <span className="text-sm">{order.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[order.status] || ""}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.totalRequiredQuantity || 0}</TableCell>
                      <TableCell>
                        {order.shippedDate ? new Date(order.shippedDate).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell>
                        {order.returnedDate ? new Date(order.returnedDate).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Link href={`/processes/orders/update/${order.id}`}>
                            <Button variant="ghost" size="icon" title="View/Edit" data-testid={`button-view-${order.id}`}>
                              <FileText className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Download PDF"
                            onClick={() => downloadPdf(order.id, order.referenceId)}
                            data-testid={`button-download-${order.id}`}
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
                                data-testid={`button-approve-${order.id}`}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Cancel"
                                onClick={() => cancelMutation.mutate(order.id)}
                                disabled={cancelMutation.isPending}
                                data-testid={`button-cancel-${order.id}`}
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          )}
                          {order.status === "APPROVED" && (
                            <Link href={`/processes/shipments/add/${order.id}`}>
                              <Button variant="ghost" size="icon" title="Create Shipment" data-testid={`button-ship-${order.id}`}>
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
