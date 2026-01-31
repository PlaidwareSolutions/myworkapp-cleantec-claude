import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Truck, Plus, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function AddShipmentPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [driverName, setDriverName] = useState("");
  const [trailerId, setTrailerId] = useState("");
  const [items, setItems] = useState<{ productId: string; productName: string; quantity: number; maxQuantity: number }[]>([]);

  const { data: orderData, isLoading } = useQuery<any>({
    queryKey: [`/api/order/${orderId}`],
    enabled: !!orderId,
  });

  const order = orderData?.data;

  useEffect(() => {
    if (order?.items) {
      setItems(order.items.map((item: any) => ({
        productId: item.productId,
        productName: item.product?.name || item.productId,
        quantity: item.requiredQuantity - (item.shippedQuantity || 0),
        maxQuantity: item.requiredQuantity - (item.shippedQuantity || 0),
      })));
    }
  }, [order]);

  const createShipmentMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/tracking/shipment/create", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      toast({ title: "Shipment created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/tracking/shipment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/order"] });
      navigate("/processes/shipments");
    },
    onError: (error: any) => {
      toast({ title: "Failed to create shipment", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!order) return;

    const validItems = items.filter(item => item.quantity > 0);
    if (validItems.length === 0) {
      toast({ title: "Please add at least one item with quantity", variant: "destructive" });
      return;
    }

    const shipmentData = {
      driverName,
      trailerId,
      bols: [{
        orderId: order.id,
        items: validItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      }],
    };

    createShipmentMutation.mutate(shipmentData);
  };

  const updateQuantity = (index: number, delta: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i === index) {
        const newQty = Math.max(0, Math.min(item.maxQuantity, item.quantity + delta));
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
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

  if (order.status !== "APPROVED" && order.status !== "SHIPPED-PARTIAL") {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Order must be APPROVED or SHIPPED-PARTIAL to create a shipment</p>
        <p className="text-sm text-muted-foreground mt-2">Current status: {order.status}</p>
        <Link href="/processes/orders">
          <Button variant="ghost" className="mt-4" data-testid="link-back-to-orders">Back to Orders</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/processes/orders">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Shipment</h1>
          <p className="text-muted-foreground">For Order: {order.referenceId}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Shipment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Order Reference</Label>
              <Input value={order.referenceId} disabled className="bg-muted" />
            </div>
            <div>
              <Label>Order Type</Label>
              <div className="mt-2">
                <Badge variant="outline">{order.type}</Badge>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Customer</Label>
              <Input value={order.customer?.name || "-"} disabled className="bg-muted" />
            </div>
            <div>
              <Label>Carrier</Label>
              <Input value={order.carrier?.name || "-"} disabled className="bg-muted" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="driverName">Driver Name</Label>
              <Input 
                id="driverName"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Enter driver name"
                data-testid="input-driver-name"
              />
            </div>
            <div>
              <Label htmlFor="trailerId">Trailer ID</Label>
              <Input 
                id="trailerId"
                value={trailerId}
                onChange={(e) => setTrailerId(e.target.value)}
                placeholder="Enter trailer ID"
                data-testid="input-trailer-id"
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-4">Items to Ship</h3>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.productId} className="flex items-center justify-between p-3 border rounded-md" data-testid={`item-row-${index}`}>
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">Max available: {item.maxQuantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(index, -1)}
                      disabled={item.quantity <= 0}
                      data-testid={`button-decrease-${index}`}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setItems(prev => prev.map((it, i) => 
                          i === index ? { ...it, quantity: Math.max(0, Math.min(it.maxQuantity, val)) } : it
                        ));
                      }}
                      className="w-20 text-center"
                      min={0}
                      max={item.maxQuantity}
                      data-testid={`input-quantity-${index}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(index, 1)}
                      disabled={item.quantity >= item.maxQuantity}
                      data-testid={`button-increase-${index}`}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Link href="/processes/orders">
              <Button variant="outline" data-testid="button-cancel">Cancel</Button>
            </Link>
            <Button 
              onClick={handleSubmit}
              disabled={createShipmentMutation.isPending}
              data-testid="button-create-shipment"
            >
              <Truck className="mr-2 h-4 w-4" />
              {createShipmentMutation.isPending ? "Creating..." : "Create Shipment"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
