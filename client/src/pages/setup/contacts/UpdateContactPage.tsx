import { useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { contactsApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, UserCog, Plus } from "lucide-react";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  active: z.boolean().default(true),
  notification: z.boolean().default(false),
  addressStreet: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressZipCode: z.string().optional(),
  addressCountry: z.string().optional(),
});

type ContactForm = z.infer<typeof contactSchema>;

export default function UpdateContactPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const { data, isLoading } = useQuery<any>({
    queryKey: [`/api/contact/${id}`],
    enabled: !!id,
  });

  const contact = data?.data;

  const form = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      active: true,
      notification: false,
    },
  });

  useEffect(() => {
    if (contact) {
      form.reset({
        name: contact.name || "",
        email: contact.email?.[0] || "",
        phone: contact.phone?.[0] || "",
        active: contact.active ?? true,
        notification: contact.notification ?? false,
        addressStreet: contact.addressStreet || "",
        addressCity: contact.addressCity || "",
        addressState: contact.addressState || "",
        addressZipCode: contact.addressZipCode || "",
        addressCountry: contact.addressCountry || "",
      });
    }
  }, [contact, form]);

  const updateMutation = useMutation({
    mutationFn: (data: ContactForm) => {
      const payload = {
        ...data,
        email: data.email ? [data.email] : [],
        phone: data.phone ? [data.phone] : [],
      };
      return contactsApi.update(id!, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact"] });
      queryClient.invalidateQueries({ queryKey: [`/api/contact/${id}`] });
      toast({ title: "Contact updated successfully" });
      setLocation("/setup/contacts");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update contact", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: ContactForm) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/setup/contacts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Contact</h1>
          <p className="text-muted-foreground">Update contact information</p>
        </div>
      </div>

      {isAdmin() && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              System User Access
            </CardTitle>
            <CardDescription>
              Manage login credentials for this contact
            </CardDescription>
          </CardHeader>
          <CardContent>
            {contact?.systemUserActive ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Username: {contact.systemUserUsername}</p>
                  <p className="text-sm text-muted-foreground">
                    Last login: {contact.systemUserLastLogin 
                      ? new Date(contact.systemUserLastLogin).toLocaleString() 
                      : "Never"}
                  </p>
                </div>
                <Badge variant="default">Active</Badge>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">No system user configured</p>
                <Link href={`/setup/contacts/update/${id}/system-user/add`}>
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Create System User
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel>Type</FormLabel>
                <div className="mt-2">
                  <Badge variant="outline">{typeof contact?.type === 'object' ? contact?.type?.id : contact?.type}</Badge>
                </div>
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="addressStreet"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Street</FormLabel>
                    <FormControl>
                      <Input placeholder="Street address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addressCity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addressState"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="State" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addressZipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zip Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Zip code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addressCountry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="Country" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <p className="text-sm text-muted-foreground">Contact is active</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notification"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Email Notifications</FormLabel>
                      <p className="text-sm text-muted-foreground">Receive email notifications</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Link href="/setup/contacts">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Contact
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
