import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { tagsApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";

const tagSchema = z.object({
  epc: z.string().min(1, "EPC is required"),
  type: z.string().default("RFID"),
  active: z.boolean().default(true),
});

type TagForm = z.infer<typeof tagSchema>;

export default function AddTagPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<TagForm>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      epc: "",
      type: "RFID",
      active: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: TagForm) => tagsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entity/tag"] });
      toast({ title: "Tag created successfully" });
      setLocation("/setup/tags");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create tag", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: TagForm) => {
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/setup/tags">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Tag</h1>
          <p className="text-muted-foreground">Register a new RFID/EPC tag</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tag Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="epc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>EPC *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter EPC code" 
                        className="font-mono"
                        data-testid="input-tag-epc"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="RFID">RFID</SelectItem>
                        <SelectItem value="BARCODE">Barcode</SelectItem>
                        <SelectItem value="QR">QR Code</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4 pt-4">
                <Link href="/setup/tags">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-tag">
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Tag
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
