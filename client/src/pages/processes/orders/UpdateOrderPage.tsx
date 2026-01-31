import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Download, Package, User, Truck, Calendar } from "lucide-react";
import { ordersApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  INITIATED: "bg-blue-100 text-blue-800",
  APPROVED: "bg-green-100 text-green-800",
  SHIPPED: "bg-purple-100 text-purple-800",
  RECEIVED: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function UpdateOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/order", id],
    enabled: !!id,
  });

  const order = data?.data;

  const downloadPdf = async () => {
    if (!order) return;
    try {
      const blob = await ordersApi.getPdf(order.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${order.referenceId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({ title: "Failed to download PDF", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Order not found</p>
        <Link href="/processes/orders">
          <Button variant="link">Back to Orders</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/processes/orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{order.referenceId}</h1>
            <p className="text-muted-foreground">Order Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadPdf}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Order Information
              <Badge className={statusColors[order.status] || ""}>{order.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Reference ID</p>
                <p className="font-medium">{order.referenceId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">PO Number</p>
                <p className="font-medium">{order.poNumber || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <Badge variant="outline">{order.type}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pallet Count</p>
                <p className="font-medium">{order.palletCount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Order Weight</p>
                <p className="font-medium">{order.orderWeight} lbs</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer & Carrier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-medium">{order.customer?.name || "-"}</p>
              <p className="text-sm text-muted-foreground">{order.customer?.email?.[0]}</p>
            </div>
            {order.carrier && (
              <div>
                <p className="text-sm text-muted-foreground">Carrier</p>
                <p className="font-medium">{order.carrier?.name}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {order.items?.length > 0 ? (
              <div className="space-y-2">
                {order.items.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="font-medium">Product ID: {item.productId}</span>
                    <Badge variant="secondary">Qty: {item.requiredQuantity}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No items in this order</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
