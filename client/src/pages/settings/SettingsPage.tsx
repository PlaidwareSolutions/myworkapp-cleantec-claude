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
import { Loader2, Settings, Mail, Building } from "lucide-react";

const settingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companyAddress: z.string().optional(),
  companyPhone: z.string().optional(),
  companyEmail: z.string().email().optional().or(z.literal("")),
  orderPrefix: z.string().optional(),
  bolPrefix: z.string().optional(),
  shipmentPrefix: z.string().optional(),
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

          <div className="flex justify-end">
            <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-settings">
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
