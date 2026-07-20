import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { auth } from "@/features/auth/auth-adapter";
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
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    auth
      .getSession()
      .then((session) => active && setUser(session))
      .finally(() => active && setIsLoading(false));

    // Supabase updates the session on OAuth/magic-link return; keep in sync.
    const unsubscribe = auth.onAuthChange?.((next) => {
      if (active) setUser(next);
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const loginWithPassword = useCallback(async (email: string, password: string) => {
    setUser(await auth.loginWithPassword(email, password));
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const next = await auth.loginWithGoogle();
    if (next) setUser(next);
  }, []);

  const register = useCallback(async (input: { name: string; email: string; password: string }) => {
    setUser(await auth.register(input));
  }, []);

  const verifyMagicLink = useCallback(async (token: string) => {
    setUser(await auth.verifyMagicLink(token));
  }, []);

  const logout = useCallback(async () => {
    await auth.logout();
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
