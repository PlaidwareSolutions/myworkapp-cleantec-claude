import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, Upload, FileArchive, CheckCircle2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import cleantecLogo from "@/assets/images/cleantec-logo.png";
import myworkappIcon from "@/assets/images/myworkapp-icon.png";

const setupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  username: z.string().min(3, "Username must be at least 3 characters").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SetupForm = z.infer<typeof setupSchema>;

interface ImportStats {
  roles: number;
  contacts: number;
  products: number;
  tags: number;
  assets: number;
  orders: number;
  orderEvents: number;
  assetEvents: number;
  bols: number;
  shipments: number;
}

export default function Setup() {
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importComplete, setImportComplete] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const response = await fetch("/api/user/setup-status");
        const data = await response.json();
        
        if (!data.data?.setupRequired) {
          setLocation("/auth/login");
        }
      } catch (error) {
        console.error("Failed to check setup status:", error);
      } finally {
        setIsChecking(false);
      }
    };
    
    checkSetupStatus();
  }, [setLocation]);

  const form = useForm<SetupForm>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.zip')) {
        toast({
          title: "Invalid file type",
          description: "Please select a ZIP file",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setImportError(null);
      setImportComplete(false);
      setImportStats(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    setImportProgress(10);
    setImportError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      setImportProgress(30);

      const response = await fetch("/api/user/setup/import", {
        method: "POST",
        body: formData,
      });

      setImportProgress(70);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Import failed");
      }

      setImportProgress(100);
      setImportComplete(true);
      setImportStats(result.data?.stats || null);

      toast({
        title: "Import Successful!",
        description: "Legacy data has been imported. You can now log in with your existing credentials.",
      });

      setTimeout(() => {
        setLocation("/auth/login");
      }, 3000);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Import failed");
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import data",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const onSubmit = async (data: SetupForm) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          username: data.username,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Setup failed");
      }

      localStorage.setItem("cleantech_token", result.data.token);
      localStorage.setItem("cleantech_user", JSON.stringify(result.data.contact));

      toast({
        title: "Setup Complete!",
        description: "Your admin account has been created. Redirecting to dashboard...",
      });

      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (error) {
      toast({
        title: "Setup failed",
        description: error instanceof Error ? error.message : "Failed to create admin account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="absolute top-4 left-4">
        <img src={myworkappIcon} alt="MyWorkApp" className="h-10 w-10 object-contain" />
      </div>
      <div className="flex flex-col gap-6 w-full max-w-md">
        <Card>
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <img src={cleantecLogo} alt="CleanTech Logistics" className="h-12 object-contain" />
            </div>
            <div className="flex items-center justify-center gap-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
              <CardTitle className="text-xl">Initial Setup</CardTitle>
            </div>
            <CardDescription>
              Create a new admin account or import data from your legacy system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileArchive className="h-4 w-4 text-muted-foreground" />
                <span>Import from Legacy System (Optional)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                If you have an export file from the legacy MongoDB system, you can import it here. 
                This will restore all your data including users, assets, orders, and more.
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-import-file"
              />

              {!importComplete && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    data-testid="button-select-file"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {selectedFile ? selectedFile.name : "Select ZIP File"}
                  </Button>
                  {selectedFile && (
                    <Button
                      type="button"
                      onClick={handleImport}
                      disabled={isImporting}
                      data-testid="button-import"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        "Import"
                      )}
                    </Button>
                  )}
                </div>
              )}

              {isImporting && (
                <div className="space-y-2">
                  <Progress value={importProgress} className="h-2" />
                  <p className="text-xs text-center text-muted-foreground">
                    Importing data... This may take a few minutes.
                  </p>
                </div>
              )}

              {importComplete && importStats && (
                <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Import Complete!</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    <span>Roles: {importStats.roles}</span>
                    <span>Contacts: {importStats.contacts}</span>
                    <span>Products: {importStats.products}</span>
                    <span>Tags: {importStats.tags}</span>
                    <span>Assets: {importStats.assets}</span>
                    <span>Orders: {importStats.orders}</span>
                    <span>BOLs: {importStats.bols}</span>
                    <span>Shipments: {importStats.shipments}</span>
                  </div>
                  <div className="text-xs text-green-700 dark:text-green-400 space-y-1">
                    <p className="font-medium">Redirecting to login...</p>
                    <p>Use your existing username with password: <code className="bg-green-100 dark:bg-green-800 px-1 rounded">admin123</code></p>
                    <p className="text-green-600 dark:text-green-500">Please change your password after logging in.</p>
                  </div>
                </div>
              )}

              {importError && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{importError}</span>
                  </div>
                </div>
              )}
            </div>

            {!importComplete && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      Or create new account
                    </span>
                  </div>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="John Smith"
                              data-testid="input-setup-name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="admin@company.com"
                              data-testid="input-setup-email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="admin"
                              data-testid="input-setup-username"
                              {...field}
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
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Min 6 characters"
                              data-testid="input-setup-password"
                              {...field}
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
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Confirm your password"
                              data-testid="input-setup-confirm-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading || isImporting}
                      data-testid="button-setup-submit"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        "Create Admin Account"
                      )}
                    </Button>
                  </form>
                </Form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
