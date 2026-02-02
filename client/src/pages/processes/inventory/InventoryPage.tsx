import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Warehouse, Users, Factory, Package, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  CLEANED: "bg-green-500",
  RETURNED: "bg-yellow-500",
  FIXED: "bg-orange-500",
  DAMAGED: "bg-red-500",
  ASSIGNED: "bg-blue-500",
  PROCESSING: "bg-purple-500",
  DECOMMISSIONED: "bg-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  CLEANED: "Ready to Use",
  RETURNED: "Returned (Dirty)",
  FIXED: "Fixed",
  DAMAGED: "Damaged",
  ASSIGNED: "With Customers",
  PROCESSING: "Processing",
  DECOMMISSIONED: "Decommissioned",
};

export default function InventoryPage() {
  const { data: assetStatus, isLoading: statusLoading } = useQuery<any>({
    queryKey: ["/api/stats/asset/status"],
  });

  const { data: customerStats, isLoading: customerLoading } = useQuery<any>({
    queryKey: ["/api/stats/asset/customer"],
  });

  const stats = assetStatus?.data || {};
  const customerData = customerStats?.data || [];

  const totalAssets = Object.values(stats).reduce((sum: number, count: any) => sum + (count || 0), 0);
  
  const inWarehouse = (stats.CLEANED || 0) + (stats.RETURNED || 0) + (stats.FIXED || 0) + (stats.DAMAGED || 0);
  const readyToUse = stats.CLEANED || 0;
  const dirty = (stats.RETURNED || 0) + (stats.FIXED || 0);
  const damaged = stats.DAMAGED || 0;
  const withCustomers = stats.ASSIGNED || 0;
  const processing = stats.PROCESSING || 0;

  const statusEntries = Object.entries(stats).filter(([_, count]) => (count as number) > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Inventory</h1>
        <p className="text-muted-foreground">View asset inventory and distribution</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-total-assets">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-assets">{totalAssets.toLocaleString()}</div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-with-customers">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">With Customers</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-blue-600" data-testid="text-with-customers">{withCustomers.toLocaleString()}</div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-processing">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Factory className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-purple-600" data-testid="text-processing">{processing.toLocaleString()}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-in-warehouse">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
          <div className="flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg font-semibold">In Warehouse</CardTitle>
          </div>
          {statusLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <span className="text-2xl font-bold" data-testid="text-in-warehouse">{inWarehouse.toLocaleString()}</span>
          )}
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3 p-4 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-400" data-testid="text-ready-to-use">{readyToUse.toLocaleString()}</div>
                  <div className="text-sm text-green-600 dark:text-green-500">Ready to Use</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 rounded-lg border bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900">
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
                <div>
                  <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400" data-testid="text-dirty">{dirty.toLocaleString()}</div>
                  <div className="text-sm text-yellow-600 dark:text-yellow-500">Dirty (Needs Cleaning)</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 rounded-lg border bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
                <AlertCircle className="h-8 w-8 text-red-600" />
                <div>
                  <div className="text-2xl font-bold text-red-700 dark:text-red-400" data-testid="text-damaged">{damaged.toLocaleString()}</div>
                  <div className="text-sm text-red-600 dark:text-red-500">Damaged</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-status-breakdown">
        <CardHeader>
          <CardTitle>Assets by Status</CardTitle>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : statusEntries.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No asset data available
            </p>
          ) : (
            <div className="space-y-4">
              {statusEntries.map(([status, count]) => {
                const percentage = totalAssets > 0 ? ((count as number) / totalAssets) * 100 : 0;
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{STATUS_LABELS[status] || status}</span>
                      <span className="text-muted-foreground">
                        {(count as number).toLocaleString()} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${STATUS_COLORS[status] || 'bg-gray-500'} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-by-customer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg font-semibold">Assets by Customer</CardTitle>
          </div>
          {customerLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <span className="text-2xl font-bold" data-testid="text-total-with-customers">{withCustomers.toLocaleString()}</span>
          )}
        </CardHeader>
        <CardContent>
          {customerLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : customerData.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No customer asset data available
            </p>
          ) : (
            <div className="space-y-3">
              {customerData.map((item: any) => {
                const assetCount = item.totalQuantityWithCustomer || item.count || 0;
                const percentage = withCustomers > 0 ? (assetCount / withCustomers) * 100 : 0;
                
                return (
                  <div
                    key={item._id || item.customerId}
                    className="relative p-4 rounded-lg border overflow-hidden"
                    data-testid={`card-customer-${item._id || item.customerId}`}
                  >
                    <div 
                      className="absolute inset-0 bg-blue-100 dark:bg-blue-950/30 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="relative flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-medium">{item.customer?.name || item.customerName || item._id}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.totalOrderCount} order{item.totalOrderCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-lg font-bold">
                          {assetCount.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">({percentage.toFixed(1)}%)</span>
                        </span>
                        <span className="text-xs text-muted-foreground">assets</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
