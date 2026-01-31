import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Truck, Download, FileText, ChevronDown, ChevronRight, Package } from "lucide-react";
import { bolsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function ShipmentsPage() {
  const { toast } = useToast();
  const [expandedShipments, setExpandedShipments] = useState<Set<string>>(new Set());

  const { data: shipmentsData, isLoading: shipmentsLoading } = useQuery<any>({
    queryKey: ["/api/tracking/shipment"],
  });

  const { data: bolsData, isLoading: bolsLoading } = useQuery<any>({
    queryKey: ["/api/tracking/bol"],
  });

  const shipments = shipmentsData?.data || [];
  const bols = bolsData?.data || [];

  const bolsMap = new Map<string, any>();
  bols.forEach((bol: any) => {
    bolsMap.set(bol.id, bol);
  });

  const toggleShipment = (shipmentId: string) => {
    setExpandedShipments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(shipmentId)) {
        newSet.delete(shipmentId);
      } else {
        newSet.add(shipmentId);
      }
      return newSet;
    });
  };

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

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "SHIPPED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "DELIVERED":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const isLoading = shipmentsLoading || bolsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Shipments & BOLs</h1>
        <p className="text-muted-foreground">Track shipments and their associated bills of lading</p>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4" />
          <span>{shipments.length} Shipments</span>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span>{bols.length} Bills of Lading</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Shipments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : shipments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No shipments found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shipments.map((shipment: any) => {
                const shipmentBols = (shipment.bols || [])
                  .map((bolId: string) => bolsMap.get(bolId))
                  .filter(Boolean);
                const isExpanded = expandedShipments.has(shipment.id);
                const hasBols = shipmentBols.length > 0;

                return (
                  <Collapsible
                    key={shipment.id}
                    open={isExpanded}
                    onOpenChange={() => hasBols && toggleShipment(shipment.id)}
                  >
                    <div className="border rounded-lg">
                      <CollapsibleTrigger asChild disabled={!hasBols}>
                        <div
                          className={`flex items-center justify-between p-4 ${hasBols ? "cursor-pointer hover-elevate" : ""}`}
                          data-testid={`shipment-row-${shipment.id}`}
                        >
                          <div className="flex items-center gap-3">
                            {hasBols ? (
                              isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )
                            ) : (
                              <div className="w-4" />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">{shipment.referenceId}</p>
                                <Badge className={getStatusColor(shipment.shipmentStatus)}>
                                  {shipment.shipmentStatus || "PENDING"}
                                </Badge>
                                <Badge variant="outline">{shipment.orderType}</Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                <span>Carrier: {shipment.carrier?.name || "N/A"}</span>
                                <span>Date: {new Date(shipment.shipmentDate || shipment.createdAt).toLocaleDateString()}</span>
                                {shipment.driverName && <span>Driver: {shipment.driverName}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasBols && (
                              <Badge variant="secondary" className="gap-1">
                                <FileText className="h-3 w-3" />
                                {shipmentBols.length} BOL{shipmentBols.length !== 1 ? "s" : ""}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t bg-muted/30 p-4">
                          <div className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Bills of Lading
                          </div>
                          <div className="space-y-2">
                            {shipmentBols.map((bol: any) => (
                              <div
                                key={bol.id}
                                className="flex items-center justify-between p-3 rounded-lg border bg-background"
                                data-testid={`bol-row-${bol.id}`}
                              >
                                <div className="flex items-center gap-3">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium">{bol.referenceId}</p>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                      {bol.order && (
                                        <span>Order: {bol.order.referenceId}</span>
                                      )}
                                      {bol.order?.customer && (
                                        <span>Customer: {bol.order.customer.name}</span>
                                      )}
                                      <span>Created: {new Date(bol.createdAt).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadBolPdf(bol.id, bol.referenceId);
                                  }}
                                  data-testid={`button-download-bol-${bol.id}`}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  PDF
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
