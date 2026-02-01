import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Clock,
  TrendingUp,
  AlertTriangle,
  Download,
  Search,
  ChevronDown,
  ChevronRight,
  Package,
  Calendar,
  Filter,
} from "lucide-react";

type ViewMode = "active" | "closed" | "combined";
type ThresholdDays = 30 | 60 | 90;

interface CycleTimeOrder {
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  poNumber: string;
  outboundDate: string | null;
  returnDate: string | null;
  cycleDays: number;
  status: string;
  isActive: boolean;
  assetCount: number;
  exceedsThreshold: boolean;
}

interface CycleTimeAsset {
  assetId: string;
  tagId: string;
  tagSerial: string | null;
  outboundDate: string | null;
  returnDate: string | null;
  cycleDays: number;
  isReturned: boolean;
  lastState: string;
}

interface CycleTimeSummary {
  avgCycleActive: number;
  avgCycleClosed: number;
  avgCycleCombined: number;
  exceedsThresholdCount: number;
  threshold: number;
  activeCount: number;
  closedCount: number;
  totalCount: number;
}

interface ApiResponse {
  success: boolean;
  data: CycleTimeOrder[];
  summary: CycleTimeSummary;
  pagination: { page: number; limit: number; skip: number };
  count: number;
}

interface AssetApiResponse {
  success: boolean;
  data: CycleTimeAsset[];
  order: { id: string; referenceId: string; poNumber: string; status: string };
}

function formatDate(date: string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function OrderRow({
  order,
  threshold,
  isExpanded,
  onToggle,
}: {
  order: CycleTimeOrder;
  threshold: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { data: assetsData, isLoading: assetsLoading } = useQuery<AssetApiResponse>({
    queryKey: ["/api/stats/cycle-time/order", order.orderId, "assets"],
    queryFn: async () => {
      const res = await fetch(`/api/stats/cycle-time/order/${order.orderId}/assets`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("cleantech_token")}`,
        },
      });
      return res.json();
    },
    enabled: isExpanded,
  });

  const assets = assetsData?.data || [];

  return (
    <>
      <TableRow 
        className="cursor-pointer hover-elevate" 
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        data-testid={`row-order-${order.orderId}`}
      >
        <TableCell>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            data-testid={`button-expand-${order.orderId}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </TableCell>
        <TableCell className="font-medium" data-testid={`text-order-number-${order.orderId}`}>
          {order.orderNumber || "-"}
        </TableCell>
        <TableCell data-testid={`text-customer-${order.orderId}`}>{order.customerName || "-"}</TableCell>
        <TableCell data-testid={`text-po-${order.orderId}`}>{order.poNumber || "-"}</TableCell>
        <TableCell data-testid={`text-outbound-${order.orderId}`}>{formatDate(order.outboundDate)}</TableCell>
        <TableCell data-testid={`text-return-${order.orderId}`}>{formatDate(order.returnDate)}</TableCell>
        <TableCell data-testid={`text-cycle-days-${order.orderId}`}>
          <span
            className={
              order.exceedsThreshold
                ? "text-red-600 dark:text-red-400 font-semibold"
                : ""
            }
          >
            {order.cycleDays}
          </span>
        </TableCell>
        <TableCell>
          <Badge
            variant={order.isActive ? "default" : "secondary"}
            data-testid={`badge-status-${order.orderId}`}
          >
            {order.isActive ? "Active" : "Closed"}
          </Badge>
        </TableCell>
        <TableCell data-testid={`text-asset-count-${order.orderId}`}>{order.assetCount}</TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow data-testid={`row-assets-${order.orderId}`}>
          <TableCell colSpan={9} className="p-0">
            <div className="bg-muted/50 p-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Assets ({assets.length})
              </h4>
              {assetsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : assets.length === 0 ? (
                <p className="text-sm text-muted-foreground">No assets found for this order.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tag ID</TableHead>
                      <TableHead>Serial</TableHead>
                      <TableHead>Outbound Date</TableHead>
                      <TableHead>Return Date</TableHead>
                      <TableHead>Cycle Days</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((asset) => (
                      <TableRow key={asset.assetId} data-testid={`row-asset-${asset.assetId}`}>
                        <TableCell className="font-mono text-xs">{asset.tagId}</TableCell>
                        <TableCell>{asset.tagSerial || "-"}</TableCell>
                        <TableCell>{formatDate(asset.outboundDate)}</TableCell>
                        <TableCell>{formatDate(asset.returnDate)}</TableCell>
                        <TableCell>
                          <span
                            className={
                              asset.cycleDays > threshold
                                ? "text-red-600 dark:text-red-400 font-semibold"
                                : ""
                            }
                          >
                            {asset.cycleDays}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={asset.isReturned ? "secondary" : "default"}>
                            {asset.isReturned ? "Returned" : "Active"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function CycleTimeReport() {
  const { hasPermission } = useAuth();
  const [view, setView] = useState<ViewMode>("combined");
  const [threshold, setThreshold] = useState<ThresholdDays>(60);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("view", view);
    params.set("threshold", threshold.toString());
    params.set("page", page.toString());
    params.set("limit", "20");
    if (search) params.set("search", search);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    return params.toString();
  }, [view, threshold, search, page, dateFrom, dateTo]);

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["/api/stats/cycle-time", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/stats/cycle-time?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("cleantech_token")}`,
        },
      });
      return res.json();
    },
  });

  const orders = data?.data || [];
  const summary = data?.summary;
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / 20);

  const handleExport = async () => {
    const params = new URLSearchParams();
    params.set("view", view);
    params.set("threshold", threshold.toString());
    if (search) params.set("search", search);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    const token = localStorage.getItem("cleantech_token");
    
    try {
      const response = await fetch(`/api/stats/cycle-time/export?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Export failed");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cycle-time-report-${view}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export error:", error);
    }
  };

  const toggleOrder = (orderId: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cycle Time Report</h1>
          <p className="text-muted-foreground">
            Analyze tote/asset cycle time from outbound to return
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleExport}
          data-testid="button-export-csv"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="card-avg-active">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Cycle (Active)</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-avg-active">
                {summary?.avgCycleActive || 0} days
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {summary?.activeCount || 0} active orders
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-closed">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Cycle (Closed)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-avg-closed">
                {summary?.avgCycleClosed || 0} days
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {summary?.closedCount || 0} closed orders
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-combined">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Cycle (Combined)</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-avg-combined">
                {summary?.avgCycleCombined || 0} days
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {summary?.totalCount || 0} total orders
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-exceeds-threshold">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exceeds Threshold</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-exceeds-count">
                {summary?.exceedsThresholdCount || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Orders exceeding {threshold} days
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">View</label>
              <Select
                value={view}
                onValueChange={(v) => {
                  setView(v as ViewMode);
                  setPage(1);
                }}
              >
                <SelectTrigger data-testid="select-view">
                  <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="combined">Active + Closed (Combined)</SelectItem>
                  <SelectItem value="active">Active Orders Only</SelectItem>
                  <SelectItem value="closed">Closed Orders Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Cycle Threshold</label>
              <Select
                value={threshold.toString()}
                onValueChange={(v) => setThreshold(parseInt(v) as ThresholdDays)}
              >
                <SelectTrigger data-testid="select-threshold">
                  <SelectValue placeholder="Select threshold" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 Days</SelectItem>
                  <SelectItem value="60">60 Days</SelectItem>
                  <SelectItem value="90">90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Order #, PO #..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="text-sm font-medium mb-2 block">From Date</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                data-testid="input-date-from"
              />
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="text-sm font-medium mb-2 block">To Date</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                data-testid="input-date-to"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>
            Click on a row to expand and see asset-level details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No orders found matching your criteria
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Customer PO</TableHead>
                      <TableHead>Outbound Date</TableHead>
                      <TableHead>Return Date</TableHead>
                      <TableHead>Cycle Days</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assets</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <OrderRow
                        key={order.orderId}
                        order={order}
                        threshold={threshold}
                        isExpanded={expandedOrders.has(order.orderId)}
                        onToggle={() => toggleOrder(order.orderId)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * 20 + 1}-{Math.min(page * 20, totalCount)} of {totalCount} orders
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    data-testid="button-prev-page"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    data-testid="button-next-page"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
