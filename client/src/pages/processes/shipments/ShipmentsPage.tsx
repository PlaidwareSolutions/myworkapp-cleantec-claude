import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Truck, Download } from "lucide-react";
import { bolsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function ShipmentsPage() {
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const { data: shipmentsData, isLoading: shipmentsLoading } = useQuery<any>({
    queryKey: ["/api/tracking/shipment"],
  });

  const { data: bolsData, isLoading: bolsLoading } = useQuery<any>({
    queryKey: ["/api/tracking/bol"],
  });

  const shipments = shipmentsData?.data || [];
  const bols = bolsData?.data || [];

  const downloadBolPdf = async (bolId: string, referenceId: string) => {
    try {
      const blob = await bolsApi.getPdf(bolId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${referenceId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({ title: "Failed to download BOL PDF", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Shipments & BOLs</h1>
        <p className="text-muted-foreground">Track shipments and bills of lading</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Shipments ({shipments.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {shipmentsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : shipments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No shipments found
              </div>
            ) : (
              <div className="space-y-3">
                {shipments.map((shipment: any) => (
                  <div
                    key={shipment.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">{shipment.referenceId}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(shipment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline">{shipment.status || "PENDING"}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bills of Lading ({bols.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {bolsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : bols.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No BOLs found
              </div>
            ) : (
              <div className="space-y-3">
                {bols.map((bol: any) => (
                  <div
                    key={bol.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">{bol.referenceId}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(bol.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => downloadBolPdf(bol.id, bol.referenceId)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
