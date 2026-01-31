import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  Users,
  Tags,
  ShoppingCart,
  Truck,
  Warehouse,
  Activity,
  Settings,
  Search,
  LogOut,
  Cpu,
} from "lucide-react";

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  permissions?: string[];
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: "Home",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
    ],
  },
  {
    label: "Processes",
    items: [
      { title: "Orders", url: "/processes/orders", icon: ShoppingCart, permissions: ["OrderViewAll", "OrderViewSelf"] },
      { title: "Shipments", url: "/processes/shipments", icon: Truck, permissions: ["OrderViewAll", "OrderViewSelf"] },
      { title: "Inventory", url: "/processes/inventory", icon: Warehouse, permissions: ["Analytics"] },
      { title: "Search", url: "/search", icon: Search },
    ],
  },
  {
    label: "Setup",
    items: [
      { title: "Contacts", url: "/setup/contacts", icon: Users, permissions: ["UserManagement", "admin"] },
      { title: "Products", url: "/setup/products", icon: Package, permissions: ["AssetManagement", "admin"] },
      { title: "Activities", url: "/activities", icon: Activity, permissions: ["Analytics"] },
      { title: "Settings", url: "/settings", icon: Settings, permissions: ["admin"] },
    ],
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { logout, hasPermission } = useAuth();

  const filteredGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.permissions) return true;
        return item.permissions.some((p) => hasPermission(p));
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <Sidebar className="border-r-0">
      <SidebarContent className="pt-2">
        {filteredGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-sidebar-foreground/70 text-xs uppercase tracking-wider">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url || (item.url !== "/" && location.startsWith(item.url))}
                    >
                      <Link href={item.url} data-testid={`nav-${item.title.toLowerCase()}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={logout}
          data-testid="button-logout"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
