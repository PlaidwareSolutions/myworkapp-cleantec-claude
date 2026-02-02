import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Package,
  Download,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Truck,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type Category = "all" | "rtu" | "dirty" | "inuse" | "damaged";

interface ToteData {
  assetId: string;
  tagId: string;
  tagSerial: string | null;
  state: string;
  inspectionDate: string | null;
  inspectedBy: string | null;
  usageCount: number;
  lastUseDate: string | null;
  lastCustomerId: string | null;
  lastCustomerName: string | null;
  currentOrderId: string | null;
  currentOrderNumber: string | null;
  assignedDate: string | null;
}

interface ApiResponse {
  success: boolean;
  data: ToteData[];
  summary: {
    totalCount: number;
    category: string;
    categoryLabel: string;
  };
  pagination: {
    page: number;
    limit: number;
    skip: number;
  };
  count: number;
}

interface Contact {
  id: string;
  name: string;
  type: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const CATEGORY_CONFIG = {
  all: {
    label: "All",
    icon: Package,
    color: "text-foreground",
    bgColor: "bg-muted",
  },
  rtu: {
    label: "Ready To Use",
    icon: CheckCircle,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950",
  },
  dirty: {
    label: "Dirty",
    icon: AlertCircle,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-50 dark:bg-yellow-950",
  },
  inuse: {
    label: "In Use",
    icon: Truck,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950",
  },
  damaged: {
    label: "Damaged",
    icon: AlertTriangle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950",
  },
};

export default function ToteStatusReport() {
  const { hasPermission } = useAuth();
  const [category, setCategory] = useState<Category>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [customerId, setCustomerId] = useState<string>("");
  const [carrierId, setCarrierId] = useState<string>("");
  const [inspectionDateFrom, setInspectionDateFrom] = useState("");
  const [inspectionDateTo, setInspectionDateTo] = useState("");

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("category", category);
    params.set("page", page.toString());
    params.set("limit", "20");
    if (search) params.set("search", search);
    if (customerId) params.set("customerId", customerId);
    if (carrierId) params.set("carrierId", carrierId);
    if (inspectionDateFrom) params.set("inspectionDateFrom", inspectionDateFrom);
    if (inspectionDateTo) params.set("inspectionDateTo", inspectionDateTo);
    return params.toString();
  }, [category, page, search, customerId, carrierId, inspectionDateFrom, inspectionDateTo]);

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["/api/stats/tote-status", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/stats/tote-status?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("cleantech_token")}`,
        },
      });
      return res.json();
    },
  });

  const { data: customersData } = useQuery<{ success: boolean; data: Contact[] }>({
    queryKey: ["/api/contact", "customers"],
    queryFn: async () => {
      const res = await fetch("/api/contact?type=CUSTOMER", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("cleantech_token")}`,
        },
      });
      return res.json();
    },
  });

  const { data: carriersData } = useQuery<{ success: boolean; data: Contact[] }>({
    queryKey: ["/api/contact", "carriers"],
    queryFn: async () => {
      const res = await fetch("/api/contact?type=CARRIER", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("cleantech_token")}`,
        },
      });
      return res.json();
    },
  });

  const { data: countsData } = useQuery<{ success: boolean; data: Record<string, number> }>({
    queryKey: ["/api/stats/tote-status/counts"],
    queryFn: async () => {
      const res = await fetch("/api/stats/tote-status/counts", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("cleantech_token")}`,
        },
      });
      return res.json();
    },
  });

  const categoryCounts = countsData?.data || {};

  const totes = data?.data || [];
  const summary = data?.summary;
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / 20);
  const customers = customersData?.data || [];
  const carriers = carriersData?.data || [];

  const handleExport = async () => {
    const params = new URLSearchParams();
    params.set("category", category);
    if (search) params.set("search", search);
    if (customerId) params.set("customerId", customerId);
    if (carrierId) params.set("carrierId", carrierId);
    if (inspectionDateFrom) params.set("inspectionDateFrom", inspectionDateFrom);
    if (inspectionDateTo) params.set("inspectionDateTo", inspectionDateTo);

    const token = localStorage.getItem("cleantech_token");

    try {
      const response = await fetch(`/api/stats/tote-status/export?${params.toString()}`, {
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
      a.download = `tote-status-${category}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export error:", error);
    }
  };

  const handleCategoryChange = (newCategory: Category) => {
    setCategory(newCategory);
    setPage(1);
  };

  const CategoryIcon = CATEGORY_CONFIG[category].icon;

  if (!hasPermission("Analytics") && !hasPermission("OrderManagement")) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">You do not have permission to view this report.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tote Status Report</h1>
          <p className="text-muted-foreground">View totes by status category</p>
        </div>
        <Button onClick={handleExport} variant="outline" data-testid="button-export-csv">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(CATEGORY_CONFIG) as Category[]).map((cat) => {
          const config = CATEGORY_CONFIG[cat];
          const Icon = config.icon;
          const isActive = category === cat;
          const catCount = categoryCounts[cat] || 0;
          return (
            <Button
              key={cat}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => handleCategoryChange(cat)}
              className={isActive ? "" : `${config.color}`}
              data-testid={`button-filter-${cat}`}
            >
              <Icon className="h-4 w-4 mr-1" />
              {config.label}
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {catCount.toLocaleString()}
              </Badge>
            </Button>
          );
        })}
      </div>

      <Card data-testid="card-summary">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CategoryIcon className={`h-5 w-5 ${CATEGORY_CONFIG[category].color}`} />
            {CATEGORY_CONFIG[category].label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold" data-testid="text-total-count">
            {isLoading ? <Skeleton className="h-9 w-24" /> : summary?.totalCount.toLocaleString() || 0}
          </div>
          <p className="text-sm text-muted-foreground">Total totes</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer</label>
              <Select
                value={customerId}
                onValueChange={(v) => {
                  setCustomerId(v === "all" ? "" : v);
                  setPage(1);
                }}
                data-testid="select-customer"
              >
                <SelectTrigger data-testid="select-customer-trigger">
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Carrier</label>
              <Select
                value={carrierId}
                onValueChange={(v) => {
                  setCarrierId(v === "all" ? "" : v);
                  setPage(1);
                }}
                data-testid="select-carrier"
              >
                <SelectTrigger data-testid="select-carrier-trigger">
                  <SelectValue placeholder="All Carriers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Carriers</SelectItem>
                  {carriers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Search Tote ID</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Tag ID..."
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Inspection From</label>
              <Input
                type="date"
                value={inspectionDateFrom}
                onChange={(e) => {
                  setInspectionDateFrom(e.target.value);
                  setPage(1);
                }}
                data-testid="input-date-from"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Inspection To</label>
              <Input
                type="date"
                value={inspectionDateTo}
                onChange={(e) => {
                  setInspectionDateTo(e.target.value);
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
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Totes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : totes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No totes found matching the selected criteria.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tote ID</TableHead>
                      <TableHead>Serial</TableHead>
                      <TableHead>Inspection Date</TableHead>
                      <TableHead>Inspected By</TableHead>
                      <TableHead>Usage Count</TableHead>
                      <TableHead>Last Use Date</TableHead>
                      <TableHead>Last Customer</TableHead>
                      <TableHead>Current Order</TableHead>
                      <TableHead>Assigned Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {totes.map((tote) => (
                      <TableRow key={tote.assetId} data-testid={`row-tote-${tote.assetId}`}>
                        <TableCell className="font-mono text-xs" data-testid={`text-tagid-${tote.assetId}`}>
                          {tote.tagId}
                        </TableCell>
                        <TableCell data-testid={`text-serial-${tote.assetId}`}>
                          {tote.tagSerial || "-"}
                        </TableCell>
                        <TableCell data-testid={`text-inspection-date-${tote.assetId}`}>
                          {formatDate(tote.inspectionDate)}
                        </TableCell>
                        <TableCell data-testid={`text-inspected-by-${tote.assetId}`}>
                          {tote.inspectedBy || "-"}
                        </TableCell>
                        <TableCell data-testid={`text-usage-count-${tote.assetId}`}>
                          {tote.usageCount}
                        </TableCell>
                        <TableCell data-testid={`text-last-use-${tote.assetId}`}>
                          {formatDate(tote.lastUseDate)}
                        </TableCell>
                        <TableCell data-testid={`text-last-customer-${tote.assetId}`}>
                          {tote.lastCustomerName || "-"}
                        </TableCell>
                        <TableCell data-testid={`text-current-order-${tote.assetId}`}>
                          {tote.currentOrderNumber || "-"}
                        </TableCell>
                        <TableCell data-testid={`text-assigned-date-${tote.assetId}`}>
                          {formatDate(tote.assignedDate)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, totalCount)} of {totalCount} totes
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      data-testid="button-prev-page"
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      data-testid="button-next-page"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
