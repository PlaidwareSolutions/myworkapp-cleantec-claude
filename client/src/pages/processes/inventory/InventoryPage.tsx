import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Warehouse, Users, Factory, Package } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground">View asset inventory and distribution</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{totalAssets}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Warehouse</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.CLEANED || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.ASSIGNED || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.PROCESSING || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="status" className="space-y-4">
        <TabsList>
          <TabsTrigger value="status">By Status</TabsTrigger>
          <TabsTrigger value="customers">By Customer</TabsTrigger>
        </TabsList>

        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle>Asset Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {statusLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : Object.keys(stats).length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No asset data available
                </p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(stats).map(([status, count]) => (
                    <div
                      key={status}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <span className="font-medium">{status}</span>
                      <span className="text-lg font-bold">{count as number}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle>Assets by Customer</CardTitle>
            </CardHeader>
            <CardContent>
              {customerLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : customerData.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No customer asset data available
                </p>
              ) : (
                <div className="space-y-3">
                  {customerData.map((item: any) => (
                    <div
                      key={item.customerId}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <span className="font-medium">{item.customerName || item.customerId}</span>
                      <span className="text-lg font-bold">{item.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
