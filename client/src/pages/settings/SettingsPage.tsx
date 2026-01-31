import { useEffect, useState } from "react";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Settings, Building, Package, Warehouse, MapPin, Plus, Pencil, Trash2 } from "lucide-react";

interface WarehouseAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface WarehouseData {
  _id?: string;
  name: string;
  address: WarehouseAddress;
}

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

const warehouseSchema = z.object({
  name: z.string().min(1, "Warehouse name is required"),
  street: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "Zip code is required"),
  country: z.string().min(1, "Country is required"),
});

type SettingsForm = z.infer<typeof settingsSchema>;
type WarehouseForm = z.infer<typeof warehouseSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [warehouseDialogOpen, setWarehouseDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseData | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState<WarehouseData | null>(null);

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

  const warehouseForm = useForm<WarehouseForm>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      name: "",
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "USA",
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
      if (settings.warehouses) {
        setWarehouses(settings.warehouses);
      }
    }
  }, [settings, form]);

  const updateMutation = useMutation({
    mutationFn: (data: SettingsForm & { warehouses?: WarehouseData[] }) => settingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update settings", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: SettingsForm) => {
    updateMutation.mutate({ ...data, warehouses });
  };

  const openAddWarehouse = () => {
    setEditingWarehouse(null);
    warehouseForm.reset({
      name: "",
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "USA",
    });
    setWarehouseDialogOpen(true);
  };

  const openEditWarehouse = (warehouse: WarehouseData) => {
    setEditingWarehouse(warehouse);
    warehouseForm.reset({
      name: warehouse.name,
      street: warehouse.address?.street || "",
      city: warehouse.address?.city || "",
      state: warehouse.address?.state || "",
      zipCode: warehouse.address?.zipCode || "",
      country: warehouse.address?.country || "USA",
    });
    setWarehouseDialogOpen(true);
  };

  const handleWarehouseSubmit = (data: WarehouseForm) => {
    const newWarehouse: WarehouseData = {
      _id: editingWarehouse?._id || `new-${Date.now()}`,
      name: data.name,
      address: {
        street: data.street,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country,
      },
    };

    if (editingWarehouse) {
      setWarehouses(prev => prev.map(w => w._id === editingWarehouse._id ? newWarehouse : w));
      toast({ title: "Warehouse updated" });
    } else {
      setWarehouses(prev => [...prev, newWarehouse]);
      toast({ title: "Warehouse added" });
    }

    setWarehouseDialogOpen(false);
    setEditingWarehouse(null);
  };

  const confirmDeleteWarehouse = (warehouse: WarehouseData) => {
    setWarehouseToDelete(warehouse);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteWarehouse = () => {
    if (warehouseToDelete) {
      setWarehouses(prev => prev.filter(w => w._id !== warehouseToDelete._id));
      toast({ title: "Warehouse removed" });
    }
    setDeleteConfirmOpen(false);
    setWarehouseToDelete(null);
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
                      <Input placeholder="Enter company name" {...field} data-testid="input-company-name" />
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
                      <Input type="email" placeholder="contact@company.com" {...field} data-testid="input-company-email" />
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
                      <Input placeholder="(555) 123-4567" {...field} data-testid="input-company-phone" />
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
                      <Input placeholder="Full address" {...field} data-testid="input-company-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Warehouse className="h-5 w-5" />
                  Warehouses
                </CardTitle>
                <CardDescription>
                  Manage your warehouse locations
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={openAddWarehouse} data-testid="button-add-warehouse">
                <Plus className="h-4 w-4 mr-1" />
                Add Warehouse
              </Button>
            </CardHeader>
            <CardContent>
              {warehouses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Warehouse className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No warehouses configured</p>
                  <p className="text-sm">Click "Add Warehouse" to add your first warehouse</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {warehouses.map((warehouse, index) => (
                    <Card key={warehouse._id || index} className="bg-muted/30">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
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
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditWarehouse(warehouse)}
                              data-testid={`button-edit-warehouse-${index}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmDeleteWarehouse(warehouse)}
                              data-testid={`button-delete-warehouse-${index}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
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
                        data-testid="input-bins-per-pallet"
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
                        data-testid="input-pallet-weight"
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
                        data-testid="input-bin-weight"
                      />
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
                      <Input placeholder="ORD" {...field} data-testid="input-order-prefix" />
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
                      <Input placeholder="BOL" {...field} data-testid="input-bol-prefix" />
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
                      <Input placeholder="SHP" {...field} data-testid="input-shipment-prefix" />
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

      <Dialog open={warehouseDialogOpen} onOpenChange={setWarehouseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWarehouse ? "Edit Warehouse" : "Add Warehouse"}</DialogTitle>
            <DialogDescription>
              {editingWarehouse ? "Update the warehouse information" : "Enter the details for the new warehouse"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={warehouseForm.handleSubmit(handleWarehouseSubmit)} className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Warehouse Name *</label>
                <Input
                  {...warehouseForm.register("name")}
                  placeholder="Main Warehouse"
                  data-testid="input-warehouse-name"
                />
                {warehouseForm.formState.errors.name && (
                  <p className="text-sm text-destructive mt-1">{warehouseForm.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Street Address *</label>
                <Input
                  {...warehouseForm.register("street")}
                  placeholder="123 Main St"
                  data-testid="input-warehouse-street"
                />
                {warehouseForm.formState.errors.street && (
                  <p className="text-sm text-destructive mt-1">{warehouseForm.formState.errors.street.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">City *</label>
                  <Input
                    {...warehouseForm.register("city")}
                    placeholder="City"
                    data-testid="input-warehouse-city"
                  />
                  {warehouseForm.formState.errors.city && (
                    <p className="text-sm text-destructive mt-1">{warehouseForm.formState.errors.city.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">State *</label>
                  <Input
                    {...warehouseForm.register("state")}
                    placeholder="CA"
                    data-testid="input-warehouse-state"
                  />
                  {warehouseForm.formState.errors.state && (
                    <p className="text-sm text-destructive mt-1">{warehouseForm.formState.errors.state.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Zip Code *</label>
                  <Input
                    {...warehouseForm.register("zipCode")}
                    placeholder="90210"
                    data-testid="input-warehouse-zipcode"
                  />
                  {warehouseForm.formState.errors.zipCode && (
                    <p className="text-sm text-destructive mt-1">{warehouseForm.formState.errors.zipCode.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Country *</label>
                  <Input
                    {...warehouseForm.register("country")}
                    placeholder="USA"
                    data-testid="input-warehouse-country"
                  />
                  {warehouseForm.formState.errors.country && (
                    <p className="text-sm text-destructive mt-1">{warehouseForm.formState.errors.country.message}</p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setWarehouseDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" data-testid="button-save-warehouse">
                {editingWarehouse ? "Update" : "Add"} Warehouse
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Warehouse</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{warehouseToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteWarehouse} data-testid="button-confirm-delete">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
