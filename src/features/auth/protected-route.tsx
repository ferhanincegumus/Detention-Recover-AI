import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/auth-context";
import { PageLoader } from "@/components/shared/page-loader";
import { UserRole } from "@/types/user";
import { routes } from "@/config/routes";
import { isSupabaseBackend } from "@/config/env";
import { initDataStore, isStoreReady } from "@/services/backend/store";
import { toast } from "@/hooks/use-toast";

interface ProtectedRouteProps {
  /** Minimum role required. Defaults to admin. */
  requiredRole?: UserRole;
}

/** Route guard — redirects unauthenticated users to login, preserving intent. */
export function ProtectedRoute({ requiredRole = UserRole.Admin }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const [storeReady, setStoreReady] = useState(() => isStoreReady());

  // In Supabase mode, bootstrap the in-memory mirror store once authenticated.
  useEffect(() => {
    if (!isSupabaseBackend || !isAuthenticated || storeReady) return;
    let active = true;
    initDataStore()
      .then(() => active && setStoreReady(true))
      .catch((err) => {
        console.error("Failed to load data:", err);
        if (active) toast.error("Could not load your data", "Check your connection and refresh.");
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated, storeReady]);

  if (isLoading) return <PageLoader />;

  if (!isAuthenticated) {
    return <Navigate to={routes.login} replace state={{ from: location.pathname }} />;
  }

  const roleRank: Record<UserRole, number> = { [UserRole.Viewer]: 0, [UserRole.Admin]: 1 };
  if (user && roleRank[user.role] < roleRank[requiredRole]) {
    return <Navigate to={routes.dashboard} replace />;
  }

  if (isSupabaseBackend && !storeReady) return <PageLoader />;

  return <Outlet />;
}
