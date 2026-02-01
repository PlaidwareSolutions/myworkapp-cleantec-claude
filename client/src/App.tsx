import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { BaseLayout } from "@/components/layout/BaseLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";
import Login from "@/pages/auth/Login";
import Dashboard from "@/pages/dashboard/Dashboard";
import OrdersPage from "@/pages/processes/orders/OrdersPage";
import AddOrderPage from "@/pages/processes/orders/AddOrderPage";
import UpdateOrderPage from "@/pages/processes/orders/UpdateOrderPage";
import ShipmentsPage from "@/pages/processes/shipments/ShipmentsPage";
import AddShipmentPage from "@/pages/processes/shipments/AddShipmentPage";
import InventoryPage from "@/pages/processes/inventory/InventoryPage";
import ProductsPage from "@/pages/setup/products/ProductsPage";
import AddProductPage from "@/pages/setup/products/AddProductPage";
import UpdateProductPage from "@/pages/setup/products/UpdateProductPage";
import ContactsPage from "@/pages/setup/contacts/ContactsPage";
import AddContactPage from "@/pages/setup/contacts/AddContactPage";
import UpdateContactPage from "@/pages/setup/contacts/UpdateContactPage";
import AddSystemUserPage from "@/pages/setup/contacts/AddSystemUserPage";
import TagsPage from "@/pages/setup/tags/TagsPage";
import AddTagPage from "@/pages/setup/tags/AddTagPage";
import DevicesPage from "@/pages/setup/devices/DevicesPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import ChangePasswordPage from "@/pages/settings/ChangePasswordPage";
import ActivitiesPage from "@/pages/activities/ActivitiesPage";
import SearchPage from "@/pages/search/SearchPage";
import DocsPage from "@/pages/docs/DocsPage";
import CycleTimeReport from "@/pages/reports/CycleTimeReport";

function AuthRoutes() {
  return (
    <Switch>
      <Route path="/auth/login" component={Login} />
      <Route path="/auth" component={Login} />
    </Switch>
  );
}

function AppRoutes() {
  return (
    <ProtectedRoute>
      <BaseLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          
          <Route path="/activities">
            <ProtectedRoute permissions={["Analytics"]}>
              <ActivitiesPage />
            </ProtectedRoute>
          </Route>
          
          <Route path="/search">
            <ProtectedRoute permissions={["AssetManagement", "OrderViewAll", "admin"]}>
              <SearchPage />
            </ProtectedRoute>
          </Route>
          
          <Route path="/processes/orders">
            <ProtectedRoute permissions={["OrderViewAll", "OrderViewSelf"]}>
              <OrdersPage />
            </ProtectedRoute>
          </Route>
          <Route path="/processes/orders/add">
            <ProtectedRoute permissions={["OrderCreateAll", "OrderCreateSelf"]}>
              <AddOrderPage />
            </ProtectedRoute>
          </Route>
          <Route path="/processes/orders/update/:id">
            <ProtectedRoute permissions={["OrderViewAll", "OrderViewSelf"]}>
              <UpdateOrderPage />
            </ProtectedRoute>
          </Route>
          
          <Route path="/processes/shipments">
            <ProtectedRoute permissions={["OrderViewAll", "OrderViewSelf"]}>
              <ShipmentsPage />
            </ProtectedRoute>
          </Route>
          <Route path="/processes/shipments/add/:orderId">
            <ProtectedRoute permissions={["OrderManagement"]}>
              <AddShipmentPage />
            </ProtectedRoute>
          </Route>
          
          <Route path="/processes/inventory">
            <ProtectedRoute permissions={["Analytics"]}>
              <InventoryPage />
            </ProtectedRoute>
          </Route>
          
          <Route path="/setup/products">
            <ProtectedRoute permissions={["AssetManagement", "admin"]}>
              <ProductsPage />
            </ProtectedRoute>
          </Route>
          <Route path="/setup/products/add">
            <ProtectedRoute permissions={["AssetManagement", "admin"]}>
              <AddProductPage />
            </ProtectedRoute>
          </Route>
          <Route path="/setup/products/update/:id">
            <ProtectedRoute permissions={["AssetManagement", "admin"]}>
              <UpdateProductPage />
            </ProtectedRoute>
          </Route>
          
          <Route path="/setup/contacts">
            <ProtectedRoute permissions={["UserManagement", "admin"]}>
              <ContactsPage />
            </ProtectedRoute>
          </Route>
          <Route path="/setup/contacts/add">
            <ProtectedRoute permissions={["UserManagement", "admin"]}>
              <AddContactPage />
            </ProtectedRoute>
          </Route>
          <Route path="/setup/contacts/update/:id/system-user/add">
            <ProtectedRoute permissions={["UserManagement", "admin"]}>
              <AddSystemUserPage />
            </ProtectedRoute>
          </Route>
          <Route path="/setup/contacts/update/:id">
            <ProtectedRoute permissions={["UserManagement", "admin"]}>
              <UpdateContactPage />
            </ProtectedRoute>
          </Route>
          
          <Route path="/setup/tags">
            <ProtectedRoute permissions={["AssetManagement", "admin"]}>
              <TagsPage />
            </ProtectedRoute>
          </Route>
          <Route path="/setup/tags/add">
            <ProtectedRoute permissions={["AssetManagement", "admin"]}>
              <AddTagPage />
            </ProtectedRoute>
          </Route>
          
          <Route path="/setup/devices">
            <ProtectedRoute permissions={["AssetManagement", "admin"]}>
              <DevicesPage />
            </ProtectedRoute>
          </Route>
          
          <Route path="/settings/change-password" component={ChangePasswordPage} />
          
          <Route path="/settings">
            <ProtectedRoute permissions={["admin"]}>
              <SettingsPage />
            </ProtectedRoute>
          </Route>
          
          <Route path="/reports/cycle-time">
            <ProtectedRoute permissions={["Analytics", "OrderManagement"]}>
              <CycleTimeReport />
            </ProtectedRoute>
          </Route>
          
          <Route path="/docs" component={DocsPage} />
          
          <Route component={NotFound} />
        </Switch>
      </BaseLayout>
    </ProtectedRoute>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth/:rest*" component={AuthRoutes} />
      <Route component={AppRoutes} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
