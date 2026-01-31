import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import cleantecLogo from "@/assets/images/cleantec-logo.png";
import myworkappIcon from "@/assets/images/myworkapp-icon.png";

interface BaseLayoutProps {
  children: ReactNode;
}

export function BaseLayout({ children }: BaseLayoutProps) {
  const { user } = useAuth();

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
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex h-16 shrink-0 items-center justify-between bg-sidebar border-b border-sidebar-border px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-sidebar-foreground" data-testid="button-sidebar-toggle" />
              <img src={myworkappIcon} alt="MyWorkApp" className="h-10 w-10 object-contain" />
              <span className="text-sidebar-foreground font-semibold text-lg hidden sm:inline">MyWorkApp.io</span>
            </div>
            <div className="flex items-center">
              <img src={cleantecLogo} alt="CleanTech Logistics" className="h-12 object-contain" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sidebar-foreground text-sm hidden lg:block">
                Welcome To Cleantec Logistics, {user?.name || "User"}
              </span>
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-sm">
                  {user?.name ? getInitials(user.name) : "U"}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6 bg-muted/30">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
