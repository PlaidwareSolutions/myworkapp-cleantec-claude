import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
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
  BarChart3,
} from "lucide-react";
import myworkappIcon from "@/assets/images/myworkapp-icon.png";

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
    label: "Reports",
    items: [
      { title: "Cycle Time", url: "/reports/cycle-time", icon: BarChart3, permissions: ["Analytics", "OrderManagement"] },
      { title: "Tote Status", url: "/reports/tote-status", icon: Package, permissions: ["Analytics", "OrderManagement"] },
    ],
  },
];

const setupGroup: MenuGroup = {
  label: "Setup",
  items: [
    { title: "Contacts", url: "/setup/contacts", icon: Users, permissions: ["UserManagement", "admin"] },
    { title: "Products", url: "/setup/products", icon: Package, permissions: ["AssetManagement", "admin"] },
    { title: "Activities", url: "/activities", icon: Activity, permissions: ["Analytics"] },
    { title: "Settings", url: "/settings", icon: Settings, permissions: ["admin"] },
  ],
};

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

  const filteredSetupItems = setupGroup.items.filter((item) => {
    if (!item.permissions) return true;
    return item.permissions.some((p) => hasPermission(p));
  });

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="h-16 px-4 border-b border-sidebar-border flex items-center">
        <div className="flex items-center gap-2">
          <img src={myworkappIcon} alt="MyWorkApp" className="h-8 w-8 object-contain" />
          <span className="text-sidebar-foreground font-semibold text-lg">MyWorkApp.io</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="pt-2 flex flex-col">
        <div className="flex-1">
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
        </div>
        
        {filteredSetupItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/70 text-xs uppercase tracking-wider">
              {setupGroup.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredSetupItems.map((item) => (
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
        )}
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
