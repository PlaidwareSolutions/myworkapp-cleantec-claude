import { ReactNode } from "react";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
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
            <div className="flex items-end h-full">
              <img
                src={cleantecLogo}
                alt="CleanTech Logistics"
                className="h-16 object-contain"
              />
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
