import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { tagsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, Tags, Package, AlertCircle } from "lucide-react";

export default function SearchPage() {
  const [epc, setEpc] = useState("");
  const { toast } = useToast();

  const searchMutation = useMutation({
    mutationFn: (epcCode: string) => tagsApi.search(epcCode),
    onError: (error: Error) => {
      toast({ 
        title: "Search failed", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!epc.trim()) {
      toast({ title: "Please enter an EPC code", variant: "destructive" });
      return;
    }
    searchMutation.mutate(epc.trim());
  };

  const result = searchMutation.data as any;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Search</h1>
        <p className="text-muted-foreground">Search for tags and assets by EPC code</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Tag Search
          </CardTitle>
          <CardDescription>
            Enter an EPC code to find the associated tag and asset information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Enter EPC code..."
              value={epc}
              onChange={(e) => setEpc(e.target.value)}
              className="font-mono"
              data-testid="input-search-epc"
            />
            <Button type="submit" disabled={searchMutation.isPending} data-testid="button-search">
              {searchMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {searchMutation.isSuccess && result?.data && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tags className="h-5 w-5" />
                Tag Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">EPC</p>
                <p className="font-mono font-medium">{result.data.tag?.epc}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <Badge variant="outline">{result.data.tag?.type || "RFID"}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={result.data.tag?.active ? "default" : "secondary"}>
                  {result.data.tag?.active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {result.data.asset && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Asset Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Asset ID</p>
                  <p className="font-medium">{result.data.asset.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge>{result.data.asset.status}</Badge>
                </div>
                {result.data.asset.customer && (
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium">{result.data.asset.customer.name}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {searchMutation.isSuccess && !result?.data?.tag && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Results Found</h3>
            <p className="text-muted-foreground mt-2">
              No tag found with EPC code: <span className="font-mono">{epc}</span>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
