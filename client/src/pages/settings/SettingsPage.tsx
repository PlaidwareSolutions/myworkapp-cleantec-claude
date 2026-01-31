import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings, Building, Package, Warehouse, MapPin } from "lucide-react";

const settingsSchema = z.object({
  companyName: z.string().optional().or(z.literal("")),
  companyAddress: z.string().optional().or(z.literal("")),
  companyPhone: z.string().optional().or(z.literal("")),
  companyEmail: z.string().email().optional().or(z.literal("")),
  orderPrefix: z.string().optional().or(z.literal("")),
  bolPrefix: z.string().optional().or(z.literal("")),
  shipmentPrefix: z.string().optional().or(z.literal("")),
  binsPerPallet: z.number().optional(),
  palletWeight: z.number().optional(),
  binWeight: z.number().optional(),
});

type SettingsForm = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { toast } = useToast();

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/settings"],
  });

  const settings = data?.data;

  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      companyName: "",
      companyAddress: "",
      companyPhone: "",
      companyEmail: "",
      orderPrefix: "ORD",
      bolPrefix: "BOL",
      shipmentPrefix: "SHP",
      binsPerPallet: 48,
      palletWeight: 50,
      binWeight: 5,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        companyName: settings.companyName || "",
        companyAddress: settings.companyAddress || "",
        companyPhone: settings.companyPhone || "",
        companyEmail: settings.companyEmail || "",
        orderPrefix: settings.orderPrefix || "ORD",
        bolPrefix: settings.bolPrefix || "BOL",
        shipmentPrefix: settings.shipmentPrefix || "SHP",
        binsPerPallet: settings.binsPerPallet ?? 48,
        palletWeight: settings.palletWeight ?? 50,
        binWeight: settings.binWeight ?? 5,
      });
    }
  }, [settings, form]);

  const updateMutation = useMutation({
    mutationFn: (data: SettingsForm) => settingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update settings", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: SettingsForm) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Configure application settings</p>
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure application settings</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Company Information
              </CardTitle>
              <CardDescription>
                Your company details shown on orders and documents
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter company name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contact@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyAddress"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Company Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Full address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Reference ID Prefixes
              </CardTitle>
              <CardDescription>
                Customize prefixes for generated reference IDs
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="orderPrefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Prefix</FormLabel>
                    <FormControl>
                      <Input placeholder="ORD" {...field} />
                    </FormControl>
                    <FormDescription>e.g., ORD-2024-0001</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bolPrefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BOL Prefix</FormLabel>
                    <FormControl>
                      <Input placeholder="BOL" {...field} />
                    </FormControl>
                    <FormDescription>e.g., BOL-2024-0001</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shipmentPrefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shipment Prefix</FormLabel>
                    <FormControl>
                      <Input placeholder="SHP" {...field} />
                    </FormControl>
                    <FormDescription>e.g., SHP-2024-0001</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Weight & Pallet Settings
              </CardTitle>
              <CardDescription>
                Configure default weights and pallet settings
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="binsPerPallet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bins Per Pallet</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="48" 
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="palletWeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pallet Weight (lbs)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1"
                        placeholder="50" 
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="binWeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bin Weight (lbs)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1"
                        placeholder="5" 
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-settings">
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
          </div>
        </form>
      </Form>

      {settings?.warehouses && settings.warehouses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="h-5 w-5" />
              Warehouses
            </CardTitle>
            <CardDescription>
              Configured warehouse locations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {settings.warehouses.map((warehouse: any, index: number) => (
                <Card key={warehouse._id || index} className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <h4 className="font-semibold">{warehouse.name}</h4>
                        {warehouse.address && (
                          <p className="text-sm text-muted-foreground">
                            {warehouse.address.street}<br />
                            {warehouse.address.city}, {warehouse.address.state} {warehouse.address.zipCode}<br />
                            {warehouse.address.country}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
