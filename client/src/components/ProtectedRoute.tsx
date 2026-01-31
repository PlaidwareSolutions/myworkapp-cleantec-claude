import { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: string;
}

export default function ProtectedRoute({
  children,
  permissions = [],
  requireAll = false,
  fallback = "/auth/login",
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasPermission, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to={fallback} />;
  }

  if (permissions.length > 0) {
    const hasAccess = requireAll
      ? permissions.every(p => hasPermission(p))
      : permissions.some(p => hasPermission(p));

    if (!hasAccess) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access this page.
          </p>
        </div>
      );
    }
  }

  return <>{children}</>;
}
