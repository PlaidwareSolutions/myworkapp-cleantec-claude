import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { statsApi, ordersApi } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  ShoppingCart,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

export default function Dashboard() {
  const { user, hasPermission } = useAuth();

  const { data: assetStats, isLoading: assetLoading } = useQuery<any>({
    queryKey: ["/api/stats/asset/status"],
    enabled: hasPermission("Analytics"),
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery<any>({
    queryKey: ["/api/order?limit=5"],
  });

  const stats = assetStats?.data || {};
  const recentOrders = ordersData?.data || [];

  const statusColors: Record<string, string> = {
    INITIATED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    APPROVED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    SHIPPED: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    RECEIVED: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.name?.split(" ")[0] || "User"}
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening with your assets and orders today.
        </p>
      </div>

      {hasPermission("Analytics") && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assigned</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {assetLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{stats.ASSIGNED || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">Assets with customers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processing</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {assetLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{stats.PROCESSING || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">Being cleaned/processed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cleaned</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {assetLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{stats.CLEANED || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">Ready for assignment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Returned</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {assetLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{stats.RETURNED || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">Awaiting processing</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Recent Orders
            </CardTitle>
            <CardDescription>Latest orders in the system</CardDescription>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No orders found
              </p>
            ) : (
              <div className="space-y-3">
                {recentOrders.slice(0, 5).map((order: any) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">{order.referenceId}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.customer?.name || "Unknown Customer"}
                      </p>
                    </div>
                    <Badge className={statusColors[order.status] || ""}>
                      {order.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {hasPermission("Analytics") && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Asset Status Overview
              </CardTitle>
              <CardDescription>Current asset distribution</CardDescription>
            </CardHeader>
            <CardContent>
              {assetLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(stats).map(([status, count]) => (
                    <div
                      key={status}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">{status}</span>
                      <span className="font-medium">{count as number}</span>
                    </div>
                  ))}
                  {Object.keys(stats).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No asset data available
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
