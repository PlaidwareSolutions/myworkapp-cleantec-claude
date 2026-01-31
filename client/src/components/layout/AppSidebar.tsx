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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import cleantecLogo from "@/assets/images/cleantec-logo.png";
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
    label: "Main",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Activities", url: "/activities", icon: Activity, permissions: ["Analytics"] },
      { title: "Search", url: "/search", icon: Search },
    ],
  },
  {
    label: "Processes",
    items: [
      { title: "Orders", url: "/processes/orders", icon: ShoppingCart, permissions: ["OrderViewAll", "OrderViewSelf"] },
      { title: "Shipments", url: "/processes/shipments", icon: Truck, permissions: ["OrderViewAll", "OrderViewSelf"] },
      { title: "Inventory", url: "/processes/inventory", icon: Warehouse, permissions: ["Analytics"] },
    ],
  },
  {
    label: "Setup",
    items: [
      { title: "Products", url: "/setup/products", icon: Package, permissions: ["AssetManagement", "admin"] },
      { title: "Contacts", url: "/setup/contacts", icon: Users, permissions: ["UserManagement", "admin"] },
      { title: "Tags", url: "/setup/tags", icon: Tags, permissions: ["AssetManagement", "admin"] },
      { title: "Devices", url: "/setup/devices", icon: Cpu, permissions: ["AssetManagement", "admin"] },
    ],
  },
  {
    label: "Admin",
    items: [
      { title: "Settings", url: "/settings", icon: Settings, permissions: ["admin"] },
    ],
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout, hasPermission } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

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
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={myworkappIcon} alt="MyWorkApp" className="h-8 w-8 object-contain" />
          <Link href="/" className="flex-1 flex justify-center">
            <img src={cleantecLogo} alt="CleanTech Logistics" className="h-10 object-contain" />
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {filteredGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
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

      <SidebarFooter className="border-t p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {user?.name ? getInitials(user.name) : "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.type?.id || "Role"}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
