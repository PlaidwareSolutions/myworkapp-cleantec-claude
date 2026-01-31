import { useState } from "react";
import { useLocation } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ordersApi, contactsApi, productsApi, settingsApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const orderSchema = z.object({
  customer: z.string().min(1, "Customer is required"),
  carrier: z.string().optional(),
  type: z.enum(["INBOUND", "OUTBOUND"]),
  poNumber: z.string().optional(),
  requiredDate: z.string().optional(),
  shipDate: z.string().optional(),
  palletCount: z.coerce.number().min(1).default(1),
  items: z.array(z.object({
    product: z.string().min(1, "Product is required"),
    requiredQuantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  })).min(1, "At least one item is required"),
  receiverName: z.string().optional(),
  receiverAddressStreet: z.string().optional(),
  receiverAddressCity: z.string().optional(),
  receiverAddressState: z.string().optional(),
  receiverAddressZipCode: z.string().optional(),
  receiverAddressCountry: z.string().optional(),
});

type OrderForm = z.infer<typeof orderSchema>;

export default function AddOrderPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: customersData } = useQuery<any>({
    queryKey: ["/api/contact?type=CUSTOMER"],
  });

  const { data: carriersData } = useQuery<any>({
    queryKey: ["/api/contact?type=CARRIER"],
  });

  const { data: productsData } = useQuery<any>({
    queryKey: ["/api/entity/product"],
  });

  const { data: settingsData } = useQuery<any>({
    queryKey: ["/api/settings"],
  });

  const customers = customersData?.data || [];
  const carriers = carriersData?.data || [];
  const products = productsData?.data || [];
  const settings = settingsData?.data || {};

  const form = useForm<OrderForm>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customer: "",
      carrier: "",
      type: "INBOUND",
      poNumber: "",
      palletCount: 1,
      items: [{ product: "", requiredQuantity: 1 }],
      receiverName: "",
      receiverAddressStreet: "",
      receiverAddressCity: "",
      receiverAddressState: "",
      receiverAddressZipCode: "",
      receiverAddressCountry: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const createMutation = useMutation({
    mutationFn: (data: OrderForm) => ordersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/order');
        }
      });
      toast({ title: "Order created successfully" });
      setLocation("/processes/orders");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create order", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: OrderForm) => {
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/processes/orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Order</h1>
          <p className="text-muted-foreground">Create a new order for processing</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="customer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-customer">
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="carrier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carrier</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select carrier (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {carriers.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-order-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="INBOUND">Inbound</SelectItem>
                        <SelectItem value="OUTBOUND">Outbound</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="poNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PO Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter PO number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="palletCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pallet Count</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requiredDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Order Items</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ product: "", requiredQuantity: 1 })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-4 items-end">
                  <FormField
                    control={form.control}
                    name={`items.${index}.product`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Product</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {products.map((p: any) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.requiredQuantity`}
                    render={({ field }) => (
                      <FormItem className="w-32">
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Link href="/processes/orders">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-create-order">
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Order
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
