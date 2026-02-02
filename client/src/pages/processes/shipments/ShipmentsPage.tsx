import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Truck, Download, FileText, ChevronDown, ChevronRight, Search, X, Filter } from "lucide-react";
import { bolsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type StatusFilter = "ALL" | "SHIPPED" | "DELIVERED" | "PENDING";
type TypeFilter = "ALL" | "INBOUND" | "OUTBOUND";

export default function ShipmentsPage() {
  const { toast } = useToast();
  const [expandedShipments, setExpandedShipments] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");

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

  const filteredShipments = useMemo(() => {
    return shipments.filter((shipment: any) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        shipment.referenceId?.toLowerCase().includes(searchLower) ||
        shipment.carrier?.name?.toLowerCase().includes(searchLower) ||
        shipment.driverName?.toLowerCase().includes(searchLower) ||
        (shipment.bols || []).some((bolId: string) => {
          const bol = bolsMap.get(bolId);
          return bol?.referenceId?.toLowerCase().includes(searchLower) ||
                 bol?.order?.referenceId?.toLowerCase().includes(searchLower) ||
                 bol?.order?.customer?.name?.toLowerCase().includes(searchLower);
        });

      const matchesStatus = statusFilter === "ALL" || 
        shipment.shipmentStatus?.toUpperCase() === statusFilter;

      const matchesType = typeFilter === "ALL" || 
        shipment.orderType?.toUpperCase() === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [shipments, searchQuery, statusFilter, typeFilter, bolsMap]);

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

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "ALL" || typeFilter !== "ALL";

  const isLoading = shipmentsLoading || bolsLoading;

  const statusCounts = useMemo(() => {
    const counts = { ALL: shipments.length, SHIPPED: 0, DELIVERED: 0, PENDING: 0 };
    shipments.forEach((s: any) => {
      const status = s.shipmentStatus?.toUpperCase();
      if (status === "SHIPPED") counts.SHIPPED++;
      else if (status === "DELIVERED") counts.DELIVERED++;
      else counts.PENDING++;
    });
    return counts;
  }, [shipments]);

  const typeCounts = useMemo(() => {
    const counts = { ALL: shipments.length, INBOUND: 0, OUTBOUND: 0 };
    shipments.forEach((s: any) => {
      const type = s.orderType?.toUpperCase();
      if (type === "INBOUND") counts.INBOUND++;
      else if (type === "OUTBOUND") counts.OUTBOUND++;
    });
    return counts;
  }, [shipments]);

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
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Shipments
              </CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by reference ID, carrier, driver, order, or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-shipments"
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Status:</span>
                <div className="flex gap-1">
                  {(["ALL", "SHIPPED", "DELIVERED", "PENDING"] as StatusFilter[]).map((status) => (
                    <Button
                      key={status}
                      variant={statusFilter === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter(status)}
                      data-testid={`filter-status-${status.toLowerCase()}`}
                    >
                      {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {statusCounts[status]}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Type:</span>
                <div className="flex gap-1">
                  {(["ALL", "INBOUND", "OUTBOUND"] as TypeFilter[]).map((type) => (
                    <Button
                      key={type}
                      variant={typeFilter === type ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTypeFilter(type)}
                      data-testid={`filter-type-${type.toLowerCase()}`}
                    >
                      {type === "ALL" ? "All" : type.charAt(0) + type.slice(1).toLowerCase()}
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {typeCounts[type]}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredShipments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-2 opacity-50" />
              {hasActiveFilters ? (
                <>
                  <p>No shipments match your filters</p>
                  <Button variant="ghost" onClick={clearFilters} className="mt-2">
                    Clear filters
                  </Button>
                </>
              ) : (
                <p>No shipments found</p>
              )}
            </div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground px-6 py-3 border-b">
                Showing {filteredShipments.length} of {shipments.length} shipments
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Reference ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Shipper</TableHead>
                      <TableHead>Receiver</TableHead>
                      <TableHead>Carrier</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-center">BOLs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredShipments.map((shipment: any) => {
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
                          asChild
                        >
                          <>
                            <CollapsibleTrigger asChild disabled={!hasBols}>
                              <TableRow
                                className={hasBols ? "cursor-pointer hover-elevate" : ""}
                                data-testid={`shipment-row-${shipment.id}`}
                              >
                                <TableCell className="w-10">
                                  {hasBols ? (
                                    isExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )
                                  ) : null}
                                </TableCell>
                                <TableCell className="font-medium">{shipment.referenceId}</TableCell>
                                <TableCell>
                                  <Badge className={getStatusColor(shipment.shipmentStatus)}>
                                    {shipment.shipmentStatus || "PENDING"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{shipment.orderType}</Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {shipment.shipper?.name || "-"}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {shipment.receiver?.name || "-"}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {shipment.carrier?.name || "-"}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {shipment.driverName || "-"}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {new Date(shipment.shipmentDate || shipment.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-center">
                                  {hasBols ? (
                                    <Badge variant="secondary" className="gap-1">
                                      <FileText className="h-3 w-3" />
                                      {shipmentBols.length}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            </CollapsibleTrigger>

                            <CollapsibleContent asChild>
                              <TableRow className="bg-muted/30 hover:bg-muted/30">
                                <TableCell colSpan={10} className="p-0">
                                  <div className="p-4">
                                    <div className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                      <FileText className="h-4 w-4" />
                                      Bills of Lading
                                    </div>
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>BOL Reference</TableHead>
                                          <TableHead>Order</TableHead>
                                          <TableHead>Customer</TableHead>
                                          <TableHead>Created</TableHead>
                                          <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {shipmentBols.map((bol: any) => (
                                          <TableRow key={bol.id} data-testid={`bol-row-${bol.id}`}>
                                            <TableCell className="font-medium">{bol.referenceId}</TableCell>
                                            <TableCell className="text-muted-foreground">
                                              {bol.order?.referenceId || "-"}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                              {bol.order?.customer?.name || "-"}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                              {new Date(bol.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
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
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </TableCell>
                              </TableRow>
                            </CollapsibleContent>
                          </>
                        </Collapsible>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
