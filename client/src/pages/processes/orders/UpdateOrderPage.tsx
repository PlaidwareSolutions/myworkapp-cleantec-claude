import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, Truck, Check, X, RotateCcw, Save, History } from "lucide-react";
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
    palletCount: 0,
    orderWeight: 0,
    receiverId: "",
    items: [] as { productId: string; requiredQuantity: number }[],
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
        palletCount: order.palletCount || 0,
        orderWeight: order.orderWeight || 0,
        receiverId: order.receiverId || "",
        items: order.items?.map((item: any) => ({
          productId: item.productId,
          requiredQuantity: item.requiredQuantity,
        })) || [],
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
      
      // Include items for recalculating weights
      if (formData.items?.length > 0) {
        updateData.items = formData.items.map(item => ({
          productId: item.productId,
          requiredQuantity: item.requiredQuantity,
        }));
      }
      
      // Include receiver address from selected processor
      if (formData.receiverId) {
        const processor = contacts.find((c: any) => c.id === formData.receiverId && c.type === "PROCESSOR");
        if (processor) {
          updateData.receiverAddress = {
            name: processor.name,
            address: {
              street: processor.addressStreet || "",
              city: processor.addressCity || "",
              state: processor.addressState || "",
              zipCode: processor.addressZipCode || "",
              country: processor.addressCountry || "USA",
            }
          };
        }
      }
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

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label className="text-muted-foreground text-sm">Order ID</Label>
              <Input value={order.referenceId} disabled className="bg-muted" data-testid="input-reference-id" />
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Type</Label>
              <Input value={order.type} disabled className="bg-muted" data-testid="input-type" />
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Status</Label>
              <Input value={order.status} disabled className="bg-muted" data-testid="input-status" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-muted-foreground text-sm">* Customer</Label>
              <Select 
                value={formData.customerId} 
                onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                disabled={!isInitiated}
              >
                <SelectTrigger data-testid="select-customer" className={!isInitiated ? "bg-muted" : ""}>
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
              <Label className="text-muted-foreground text-sm">Carrier</Label>
              <Select 
                value={formData.carrierId} 
                onValueChange={(value) => setFormData({ ...formData, carrierId: value })}
                disabled={!isInitiated}
              >
                <SelectTrigger data-testid="select-carrier" className={!isInitiated ? "bg-muted" : ""}>
                  <SelectValue placeholder="Select carrier" />
                </SelectTrigger>
                <SelectContent>
                  {carriers.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-muted-foreground text-sm">* Delivery Date</Label>
              <Input 
                type="date"
                value={formData.requiredDate}
                onChange={(e) => setFormData({ ...formData, requiredDate: e.target.value })}
                disabled={!isInitiated}
                className={!isInitiated ? "bg-muted" : ""}
                data-testid="input-required-date"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Ship Date</Label>
              <Input 
                type="date"
                value={formData.shipDate}
                onChange={(e) => setFormData({ ...formData, shipDate: e.target.value })}
                disabled={!isInitiated}
                className={!isInitiated ? "bg-muted" : ""}
                placeholder="Select date"
                data-testid="input-ship-date"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-muted-foreground text-sm">Shipped Date</Label>
              <Input 
                type="date"
                value={order.shippingDetails?.[0]?.shipmentDate ? order.shippingDetails[0].shipmentDate.split("T")[0] : ""}
                disabled
                className="bg-muted"
                placeholder="Not shipped yet"
                data-testid="input-shipped-date"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">PO Number</Label>
              <Input 
                value={formData.poNumber}
                onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                disabled={!isInitiated}
                className={!isInitiated ? "bg-muted" : ""}
                placeholder="Enter PO Number"
                data-testid="input-po-number"
              />
            </div>
          </div>

          <div>
            <Label className="text-muted-foreground text-sm">Delivery Address</Label>
            {isInitiated ? (
              <Select 
                value={formData.receiverId || ""} 
                onValueChange={(value) => {
                  const processor = contacts.find((c: any) => c.id === value && c.type === "PROCESSOR");
                  if (processor) {
                    setFormData({ 
                      ...formData, 
                      receiverId: value,
                    });
                  }
                }}
              >
                <SelectTrigger data-testid="select-delivery-address">
                  <SelectValue placeholder="Select Cleantec Address">
                    {formData.receiverId ? contacts.find((c: any) => c.id === formData.receiverId)?.name : "Select Cleantec Address"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {contacts.filter((c: any) => c.type === "PROCESSOR").map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : order.receiverName ? (
              <div className="p-3 border rounded-md bg-muted/50 mt-1">
                <p className="font-medium">Name: {order.receiverName}</p>
                <p className="text-sm text-muted-foreground">
                  Address: {order.receiverAddressStreet}, {order.receiverAddressCity}, {order.receiverAddressState} - {order.receiverAddressZipCode}, {order.receiverAddressCountry}
                </p>
              </div>
            ) : (
              <Input value="No address set" disabled className="bg-muted mt-1" />
            )}
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-4">Items</h3>
            {formData.items?.length > 0 ? (
              formData.items.map((item, index: number) => (
                <div key={index} className="space-y-4" data-testid={`item-row-${index}`}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-muted-foreground text-sm">* Product</Label>
                      <Select 
                        value={item.productId} 
                        onValueChange={(value) => {
                          const newItems = [...formData.items];
                          newItems[index] = { ...newItems[index], productId: value };
                          setFormData({ ...formData, items: newItems });
                        }}
                        disabled={!isInitiated}
                      >
                        <SelectTrigger data-testid={`select-product-${index}`} className={!isInitiated ? "bg-muted" : ""}>
                          <SelectValue>{getProductName(item.productId)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">* Required Quantity</Label>
                      <Input 
                        type="number"
                        value={item.requiredQuantity}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[index] = { ...newItems[index], requiredQuantity: parseInt(e.target.value) || 0 };
                          setFormData({ ...formData, items: newItems });
                        }}
                        disabled={!isInitiated}
                        className={!isInitiated ? "bg-muted" : ""}
                        data-testid={`input-required-quantity-${index}`}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-muted-foreground text-sm">Pallet Count (auto-calculated)</Label>
                      <Input 
                        type="number"
                        value={formData.palletCount}
                        disabled
                        className="bg-muted"
                        data-testid="input-pallet-count"
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-sm">Order Weight(lb) (auto-calculated)</Label>
                      <Input 
                        type="number"
                        value={formData.orderWeight}
                        disabled
                        className="bg-muted"
                        data-testid="input-order-weight"
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No items in this order</p>
            )}
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-4">Asset Details</h3>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full" data-testid="table-asset-details">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Ordered</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Shipped</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Processing</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Returned</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t" data-testid="row-asset-summary">
                    <td className="px-4 py-3 text-sm">{order.referenceId}</td>
                    <td className="px-4 py-3 text-center text-sm">{order.totalRequiredQuantity || 0}</td>
                    <td className="px-4 py-3 text-center text-sm">{order.totalShippedQuantity || 0}</td>
                    <td className="px-4 py-3 text-center text-sm">{order.totalProcessorPingQuantity || 0}</td>
                    <td className="px-4 py-3 text-center text-sm">{order.totalReturnedQuantity || 0}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {isOutboundApproved && (
            <div className="border-t pt-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Driver Information
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground text-sm">Driver Name</Label>
                  <Input 
                    value={formData.driverName}
                    onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                    placeholder="Enter driver name"
                    data-testid="input-driver-name"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Trailer ID</Label>
                  <Input 
                    value={formData.trailerId}
                    onChange={(e) => setFormData({ ...formData, trailerId: e.target.value })}
                    placeholder="Enter trailer ID"
                    data-testid="input-trailer-id"
                  />
                </div>
              </div>
            </div>
          )}

          {order.history?.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <History className="h-5 w-5" />
                Order History
              </h3>
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
