import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/auth-context";
import { PageLoader } from "@/components/shared/page-loader";
import { UserRole } from "@/types/user";
import { routes } from "@/config/routes";

interface ProtectedRouteProps {
  /** Minimum role required. Defaults to admin. */
  requiredRole?: UserRole;
}

/** Route guard — redirects unauthenticated users to login, preserving intent. */
export function ProtectedRoute({ requiredRole = UserRole.Admin }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoader />;

  if (!isAuthenticated) {
    return <Navigate to={routes.login} replace state={{ from: location.pathname }} />;
  }

  const roleRank: Record<UserRole, number> = { [UserRole.Viewer]: 0, [UserRole.Admin]: 1 };
  if (user && roleRank[user.role] < roleRank[requiredRole]) {
    return <Navigate to={routes.dashboard} replace />;
  }

  return <Outlet />;
}
