import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { statsApi, ordersApi } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Plus,
  Users,
  Tags,
  FileText,
  Search,
  Cpu,
} from "lucide-react";

export default function Dashboard() {
  const { user, hasPermission } = useAuth();
  const [, setLocation] = useLocation();

  const { data: assetStats, isLoading: assetLoading } = useQuery<any>({
    queryKey: ["/api/stats/asset/status"],
    enabled: hasPermission("Analytics"),
  });

  const canViewOrders = hasPermission(["OrderViewSelf", "OrderViewAll", "OrderManagement"]);
  
  const { data: ordersData, isLoading: ordersLoading } = useQuery<any>({
    queryKey: ["/api/order?limit=5"],
    enabled: canViewOrders,
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {hasPermission("Create") && (
              <>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setLocation("/processes/orders/add")}
                  data-testid="button-quick-create-order"
                >
                  <Plus className="h-4 w-4" />
                  New Order
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setLocation("/setup/contacts/add")}
                  data-testid="button-quick-add-contact"
                >
                  <Users className="h-4 w-4" />
                  Add Contact
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setLocation("/setup/products/add")}
                  data-testid="button-quick-add-product"
                >
                  <Package className="h-4 w-4" />
                  Add Product
                </Button>
              </>
            )}
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setLocation("/processes/orders")}
              data-testid="button-quick-view-orders"
            >
              <ShoppingCart className="h-4 w-4" />
              View Orders
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setLocation("/processes/shipments")}
              data-testid="button-quick-view-shipments"
            >
              <Truck className="h-4 w-4" />
              View Shipments
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setLocation("/processes/inventory")}
              data-testid="button-quick-view-assets"
            >
              <Cpu className="h-4 w-4" />
              View Inventory
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setLocation("/setup/tags")}
              data-testid="button-quick-view-tags"
            >
              <Tags className="h-4 w-4" />
              View Tags
            </Button>
          </div>
        </CardContent>
      </Card>

      {hasPermission("Analytics") && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assigned</CardTitle>
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900">
                <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              {assetLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.ASSIGNED || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">Assets with customers</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processing</CardTitle>
              <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </CardHeader>
            <CardContent>
              {assetLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.PROCESSING || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">Being cleaned/processed</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cleaned</CardTitle>
              <div className="rounded-full bg-green-100 p-2 dark:bg-green-900">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              {assetLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.CLEANED || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">Ready for assignment</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Returned</CardTitle>
              <div className="rounded-full bg-orange-100 p-2 dark:bg-orange-900">
                <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
            </CardHeader>
            <CardContent>
              {assetLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.RETURNED || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">Awaiting processing</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {canViewOrders && (
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
        )}

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
