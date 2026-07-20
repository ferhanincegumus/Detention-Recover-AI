import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { routes } from "@/config/routes";
import { PageLoader } from "@/components/shared/page-loader";
import { ProtectedRoute } from "@/features/auth/protected-route";
import { AdminLayout } from "@/features/admin/components/admin-layout";
import { env } from "@/config/env";

// Public / marketing
const LandingPage = lazy(() => import("@/pages/landing"));
const NotFoundPage = lazy(() => import("@/pages/not-found"));

// Auth
const LoginPage = lazy(() => import("@/pages/auth/login"));
const RegisterPage = lazy(() => import("@/pages/auth/register"));
const MagicLinkPage = lazy(() => import("@/pages/auth/magic-link"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/forgot-password"));
const ResetPasswordPage = lazy(() => import("@/pages/auth/reset-password"));

// Admin
const DashboardPage = lazy(() => import("@/pages/admin/dashboard"));
const LoadsPage = lazy(() => import("@/pages/admin/loads"));
const LoadDetailPage = lazy(() => import("@/pages/admin/load-detail"));
const ClaimsPage = lazy(() => import("@/pages/admin/claims"));
const ClaimDetailPage = lazy(() => import("@/pages/admin/claim-detail"));
const LeadsPage = lazy(() => import("@/pages/admin/leads"));
const LeadDetailPage = lazy(() => import("@/pages/admin/lead-detail"));
const InboxPage = lazy(() => import("@/pages/admin/inbox"));
const BrokersPage = lazy(() => import("@/pages/admin/brokers"));
const BrokerDetailPage = lazy(() => import("@/pages/admin/broker-detail"));
const FollowupsPage = lazy(() => import("@/pages/admin/followups"));
const DocumentsPage = lazy(() => import("@/pages/admin/documents"));
const AnalyticsPage = lazy(() => import("@/pages/admin/analytics"));
const SettingsPage = lazy(() => import("@/pages/admin/settings"));
const ProfilePage = lazy(() => import("@/pages/admin/profile"));

const s = (node: React.ReactNode) => <Suspense fallback={<PageLoader />}>{node}</Suspense>;

// Strip the trailing slash from Vite's BASE_URL so routing works both at the
// domain root ("/") and under a GitHub Pages subpath ("/detention-recover-ai").
const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

const router = createBrowserRouter([
  { path: routes.home, element: s(<LandingPage />) },

  { path: routes.login, element: s(<LoginPage />) },
  {
    path: routes.register,
    element: env.features.publicRegistration ? s(<RegisterPage />) : <Navigate to={routes.login} replace />,
  },
  { path: routes.magicLink, element: s(<MagicLinkPage />) },
  { path: routes.forgotPassword, element: s(<ForgotPasswordPage />) },
  { path: routes.resetPassword, element: s(<ResetPasswordPage />) },

  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: routes.dashboard, element: s(<DashboardPage />) },
          { path: routes.loads, element: s(<LoadsPage />) },
          { path: routes.loadDetail(), element: s(<LoadDetailPage />) },
          { path: routes.claims, element: s(<ClaimsPage />) },
          { path: routes.claimDetail(), element: s(<ClaimDetailPage />) },
          { path: routes.leads, element: s(<LeadsPage />) },
          { path: routes.leadDetail(), element: s(<LeadDetailPage />) },
          { path: routes.inbox, element: s(<InboxPage />) },
          { path: routes.brokers, element: s(<BrokersPage />) },
          { path: routes.brokerDetail(), element: s(<BrokerDetailPage />) },
          { path: routes.followups, element: s(<FollowupsPage />) },
          { path: routes.documents, element: s(<DocumentsPage />) },
          { path: routes.analytics, element: s(<AnalyticsPage />) },
          { path: routes.settings, element: s(<SettingsPage />) },
          { path: routes.profile, element: s(<ProfilePage />) },
        ],
      },
    ],
  },

  { path: "*", element: s(<NotFoundPage />) },
], { basename });

export function AppRouter() {
  return <RouterProvider router={router} />;
}
