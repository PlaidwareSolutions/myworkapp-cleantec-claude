import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useLocation } from "wouter";

interface Permission {
  admin?: boolean;
  Analytics?: boolean;
  OrderViewAll?: boolean;
  OrderViewSelf?: boolean;
  OrderCreateAll?: boolean;
  OrderCreateSelf?: boolean;
  UserManagement?: boolean;
  AssetManagement?: boolean;
  OrderManagement?: boolean;
  [key: string]: boolean | undefined;
}

interface Role {
  id: string;
  permissions: Permission;
}

interface Contact {
  id: string;
  name: string;
  email: string[];
  phone: string[];
  type: Role;
  active: boolean;
  systemUserActive?: boolean;
  systemUserUsername?: string;
  profilePicture?: string | null;
  addressStreet?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZipCode?: string | null;
  addressCountry?: string | null;
}

interface AuthContextType {
  user: Contact | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string | string[]) => boolean;
  isAdmin: () => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "cleantech_token";
const USER_KEY = "cleantech_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Contact | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await fetch("/api/user/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Login failed");
    }

    const data = await response.json();
    const { token: newToken, contact } = data.data;

    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(contact));
    setToken(newToken);
    setUser(contact);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setLocation("/auth/login");
  }, [setLocation]);

  const refreshUser = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch("/api/user/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.contact);
        localStorage.setItem(USER_KEY, JSON.stringify(data.contact));
      } else if (response.status === 401) {
        logout();
      }
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  }, [token, logout]);

  const hasPermission = useCallback((permission: string | string[]): boolean => {
    if (!user?.type?.permissions) return false;
    
    if (user.type.permissions.admin) return true;
    
    const permissions = Array.isArray(permission) ? permission : [permission];
    return permissions.some(p => user.type.permissions[p] === true);
  }, [user]);

  const isAdmin = useCallback((): boolean => {
    return user?.type?.permissions?.admin === true;
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        hasPermission,
        isAdmin,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
