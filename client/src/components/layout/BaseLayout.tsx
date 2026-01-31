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
      <div className="flex flex-col h-screen w-full">
        <header className="flex h-14 shrink-0 items-center justify-between bg-sidebar border-b border-sidebar-border px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="text-sidebar-foreground" data-testid="button-sidebar-toggle" />
            <img src={myworkappIcon} alt="MyWorkApp" className="h-8 w-8 object-contain" />
            <span className="text-sidebar-foreground font-semibold text-lg">MyWorkApp.io</span>
          </div>
          <div className="flex items-center gap-4">
            <img src={cleantecLogo} alt="CleanTech Logistics" className="h-10 object-contain" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sidebar-foreground text-sm hidden md:block">
              Welcome To Cleantec Logistics, {user?.name || "User"}
            </span>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-sm">
                {user?.name ? getInitials(user.name) : "U"}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <SidebarInset className="flex flex-col flex-1 bg-muted/30">
            <main className="flex-1 overflow-auto p-4 md:p-6">
              {children}
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
