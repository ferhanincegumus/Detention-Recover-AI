import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authService } from "@/features/auth/auth-service";
import { UserRole, type User } from "@/types/user";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (input: { name: string; email: string; password: string }) => Promise<void>;
  verifyMagicLink: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUser(authService.getSession());
    setIsLoading(false);
  }, []);

  const loginWithPassword = useCallback(async (email: string, password: string) => {
    setUser(await authService.loginWithPassword(email, password));
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setUser(await authService.loginWithGoogle());
  }, []);

  const register = useCallback(async (input: { name: string; email: string; password: string }) => {
    setUser(await authService.register(input));
  }, []);

  const verifyMagicLink = useCallback(async (token: string) => {
    setUser(await authService.verifyMagicLink(token));
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      isAdmin: user?.role === UserRole.Admin,
      loginWithPassword,
      loginWithGoogle,
      register,
      verifyMagicLink,
      logout,
    }),
    [user, isLoading, loginWithPassword, loginWithGoogle, register, verifyMagicLink, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
