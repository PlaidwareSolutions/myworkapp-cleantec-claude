import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, Package, User, Truck, Calendar, Check, X, RotateCcw, Save, History } from "lucide-react";
import { ordersApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const statusColors: Record<string, string> = {
  INITIATED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  SHIPPED: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "SHIPPED-PARTIAL": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  RECEIVED: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  RETURNED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function UpdateOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [formData, setFormData] = useState({
    customerId: "",
    carrierId: "",
    poNumber: "",
    requiredDate: "",
    shipDate: "",
    driverName: "",
    trailerId: "",
  });

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: [`/api/order/${id}`],
    enabled: !!id,
  });

  const { data: contactsData } = useQuery<any>({
    queryKey: ["/api/contact?limit=100"],
  });

  const { data: productsData } = useQuery<any>({
    queryKey: ["/api/entity/product?limit=100"],
  });

  const order = data?.data;
  const contacts = contactsData?.data || [];
  const products = productsData?.data || [];
  
  const customers = contacts.filter((c: any) => c.type === "CUSTOMER" || c.type === "PROCESSOR");
  const carriers = contacts.filter((c: any) => c.type === "CARRIER");

  const isInitiated = order?.status === "INITIATED";
  const isApproved = order?.status === "APPROVED";
  const isOutboundApproved = order?.type === "OUTBOUND" && isApproved;
  const canEdit = isInitiated || isOutboundApproved;
  const canCancel = isInitiated || isApproved;
  const canApprove = isInitiated;
  const canRevoke = isApproved;

  useEffect(() => {
    if (order) {
      setFormData({
        customerId: order.customerId || "",
        carrierId: order.carrierId || "",
        poNumber: order.poNumber || "",
        requiredDate: order.requiredDate ? order.requiredDate.split("T")[0] : "",
        shipDate: order.shipDate ? order.shipDate.split("T")[0] : "",
        driverName: "",
        trailerId: "",
      });
    }
  }, [order]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PUT", `/api/order/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Order updated successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/order/${id}`] });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "Failed to update order", description: error.message, variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/order/${id}/approve`);
    },
    onSuccess: () => {
      toast({ title: "Order approved successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/order/${id}`] });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "Failed to approve order", description: error.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/order/${id}/cancel`);
    },
    onSuccess: () => {
      toast({ title: "Order cancelled" });
      queryClient.invalidateQueries({ queryKey: [`/api/order/${id}`] });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "Failed to cancel order", description: error.message, variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/order/${id}/revoke`);
    },
    onSuccess: () => {
      toast({ title: "Order approval revoked" });
      queryClient.invalidateQueries({ queryKey: [`/api/order/${id}`] });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "Failed to revoke approval", description: error.message, variant: "destructive" });
    },
  });

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

  const handleUpdate = () => {
    const updateData: any = {};
    
    if (isInitiated) {
      if (formData.customerId) updateData.customerId = formData.customerId;
      if (formData.carrierId) updateData.carrierId = formData.carrierId;
      if (formData.poNumber !== undefined) updateData.poNumber = formData.poNumber;
      if (formData.requiredDate) updateData.requiredDate = formData.requiredDate;
      if (formData.shipDate) updateData.shipDate = formData.shipDate;
    }
    
    if (isOutboundApproved) {
      if (formData.driverName) updateData.driverName = formData.driverName;
      if (formData.trailerId) updateData.trailerId = formData.trailerId;
    }

    updateMutation.mutate(updateData);
  };

  const getProductName = (productId: string) => {
    const product = products.find((p: any) => p.id === productId);
    return product?.name || productId;
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
          <Button variant="ghost" data-testid="link-back-to-orders">Back to Orders</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/processes/orders">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{order.referenceId}</h1>
            <p className="text-muted-foreground">Order Details</p>
          </div>
          <Badge className={statusColors[order.status] || ""}>{order.status}</Badge>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canCancel && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950" data-testid="button-cancel-order">
                  <X className="mr-2 h-4 w-4" />
                  Cancel Order
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Order</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to cancel this order? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-dialog-cancel">No</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => cancelMutation.mutate()} 
                    className="bg-red-600 hover:bg-red-700"
                    data-testid="button-confirm-cancel"
                  >
                    Yes, Cancel Order
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          
          {canRevoke && (
            <Button 
              variant="outline" 
              className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950"
              onClick={() => revokeMutation.mutate()}
              disabled={revokeMutation.isPending}
              data-testid="button-revoke-approval"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {revokeMutation.isPending ? "Revoking..." : "Revoke Approval"}
            </Button>
          )}
          
          {canApprove && (
            <Button 
              variant="default" 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              data-testid="button-approve"
            >
              <Check className="mr-2 h-4 w-4" />
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </Button>
          )}
          
          {canEdit && (
            <Button 
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
              data-testid="button-update"
            >
              <Save className="mr-2 h-4 w-4" />
              {updateMutation.isPending ? "Saving..." : "Update"}
            </Button>
          )}
          
          <Button variant="outline" onClick={downloadPdf} data-testid="button-download-pdf">
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Reference ID</Label>
                <Input value={order.referenceId} disabled data-testid="input-reference-id" />
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <Input value={order.status} disabled data-testid="input-status" />
              </div>
              <div>
                <Label className="text-muted-foreground">Type</Label>
                <Input value={order.type} disabled data-testid="input-type" />
              </div>
              <div>
                <Label className="text-muted-foreground">PO Number</Label>
                <Input 
                  value={formData.poNumber}
                  onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                  disabled={!isInitiated}
                  placeholder="Enter PO Number"
                  data-testid="input-po-number"
                />
              </div>
              <div>
                <Label className="text-muted-foreground">Pallet Count</Label>
                <Input value={order.palletCount || 0} disabled data-testid="input-pallet-count" />
              </div>
              <div>
                <Label className="text-muted-foreground">Order Weight (lbs)</Label>
                <Input value={order.orderWeight || 0} disabled data-testid="input-order-weight" />
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
              <Label className="text-muted-foreground">Customer</Label>
              <Select 
                value={formData.customerId} 
                onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                disabled={!isInitiated}
              >
                <SelectTrigger data-testid="select-customer">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-muted-foreground">Carrier</Label>
              <Select 
                value={formData.carrierId} 
                onValueChange={(value) => setFormData({ ...formData, carrierId: value })}
                disabled={!isInitiated}
              >
                <SelectTrigger data-testid="select-carrier">
                  <SelectValue placeholder="Select carrier" />
                </SelectTrigger>
                <SelectContent>
                  {carriers.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Delivery Date</Label>
                <Input 
                  type="date"
                  value={formData.requiredDate}
                  onChange={(e) => setFormData({ ...formData, requiredDate: e.target.value })}
                  disabled={!isInitiated}
                  data-testid="input-required-date"
                />
              </div>
              <div>
                <Label className="text-muted-foreground">Ship Date</Label>
                <Input 
                  type="date"
                  value={formData.shipDate}
                  onChange={(e) => setFormData({ ...formData, shipDate: e.target.value })}
                  disabled={!isInitiated}
                  data-testid="input-ship-date"
                />
              </div>
              <div>
                <Label className="text-muted-foreground">Created</Label>
                <Input 
                  value={order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "-"} 
                  disabled 
                  data-testid="input-created-at"
                />
              </div>
              <div>
                <Label className="text-muted-foreground">Updated</Label>
                <Input 
                  value={order.updatedAt ? new Date(order.updatedAt).toLocaleDateString() : "-"} 
                  disabled 
                  data-testid="input-updated-at"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {isOutboundApproved && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Driver Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Driver Name</Label>
                <Input 
                  value={formData.driverName}
                  onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                  placeholder="Enter driver name"
                  data-testid="input-driver-name"
                />
              </div>
              <div>
                <Label className="text-muted-foreground">Trailer ID</Label>
                <Input 
                  value={formData.trailerId}
                  onChange={(e) => setFormData({ ...formData, trailerId: e.target.value })}
                  placeholder="Enter trailer ID"
                  data-testid="input-trailer-id"
                />
              </div>
            </CardContent>
          </Card>
        )}

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
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`item-row-${index}`}>
                    <span className="font-medium">{getProductName(item.productId)}</span>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary">Required: {item.requiredQuantity}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No items in this order</p>
            )}
            
            {order.shippedItems?.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-medium mb-2">Shipped Items</h4>
                {order.shippedItems.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border mb-2" data-testid={`shipped-item-${index}`}>
                    <span className="font-medium">{getProductName(item.productId)}</span>
                    <Badge className="bg-purple-100 text-purple-800">Shipped: {item.shippedQuantity}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {order.history?.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Order History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.history.map((event: any, index: number) => (
                  <div key={index} className="flex items-start gap-4 p-3 rounded-lg border" data-testid={`history-item-${index}`}>
                    <Badge className={statusColors[event.status] || "bg-gray-100"}>{event.status}</Badge>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.createdAt).toLocaleString()}
                      </p>
                      {event.comment && <p className="text-sm mt-1">{event.comment}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
