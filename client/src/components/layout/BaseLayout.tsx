import { ReactNode } from "react";
import { Link } from "wouter";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KeyRound, LogOut, User } from "lucide-react";
import cleantecLogo from "@/assets/images/cleantec-logo.png";
import myworkappIcon from "@/assets/images/myworkapp-icon.png";

interface BaseLayoutProps {
  children: ReactNode;
}

export function BaseLayout({ children }: BaseLayoutProps) {
  const { user, logout } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const sidebarStyle = {
    "--sidebar-width": "14rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full relative">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex h-16 shrink-0 items-center justify-between bg-sidebar border-b border-sidebar-border px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger
                className="text-sidebar-foreground"
                data-testid="button-sidebar-toggle"
              />
            </div>
            <div className="flex items-center justify-center">
              <img
                src={cleantecLogo}
                alt="CleanTech Logistics"
                className="h-12 object-contain"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sidebar-foreground text-sm hidden lg:block">
                Welcome To Cleantec Logistics, {user?.name || "User"}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="h-9 w-9 cursor-pointer" data-testid="button-user-menu">
                    <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-sm">
                      {user?.name ? getInitials(user.name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem disabled className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="truncate">{user?.systemUserUsername || user?.name}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <Link href="/settings/change-password">
                    <DropdownMenuItem className="flex items-center gap-2 cursor-pointer" data-testid="menu-change-password">
                      <KeyRound className="h-4 w-4" />
                      Change Password
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="flex items-center gap-2 cursor-pointer text-destructive"
                    onClick={logout}
                    data-testid="menu-logout"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6 bg-muted/30 relative">
            {children}
            <div className="fixed bottom-4 right-4 opacity-20 pointer-events-none z-10">
              <img
                src={myworkappIcon}
                alt="MyWorkApp"
                className="h-24 w-24 object-contain"
              />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
