import { useParams, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, UserCog } from "lucide-react";

const systemUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SystemUserForm = z.infer<typeof systemUserSchema>;

export default function AddSystemUserPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<any>({
    queryKey: [`/api/contact/${id}`],
    enabled: !!id,
  });

  const contact = data?.data;

  const form = useForm<SystemUserForm>({
    resolver: zodResolver(systemUserSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: SystemUserForm) => 
      api.post(`/user/create-system-user/${id}`, {
        username: data.username,
        password: data.password,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact"] });
      queryClient.invalidateQueries({ queryKey: [`/api/contact/${id}`] });
      toast({ title: "System user created successfully" });
      setLocation(`/setup/contacts/update/${id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create system user", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: SystemUserForm) => {
    createMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (contact?.systemUserActive) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/setup/contacts/update/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System User Already Exists</h1>
            <p className="text-muted-foreground">This contact already has a system user account</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/setup/contacts/update/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create System User</h1>
          <p className="text-muted-foreground">Create login credentials for {contact?.name}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                Login Credentials
              </CardTitle>
              <CardDescription>
                Set up username and password for this contact to access the system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter username" 
                        {...field} 
                        data-testid="input-username"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password *</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Enter password" 
                        {...field}
                        data-testid="input-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password *</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Confirm password" 
                        {...field}
                        data-testid="input-confirm-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Link href={`/setup/contacts/update/${id}`}>
              <Button type="button" variant="outline" data-testid="button-cancel">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create System User
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
