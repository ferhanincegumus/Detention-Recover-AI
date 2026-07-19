import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { routes } from "@/config/routes";
import { PageLoader } from "@/components/shared/page-loader";

const LandingPage = lazy(() => import("@/pages/landing"));
const NotFoundPage = lazy(() => import("@/pages/not-found"));

function withSuspense(node: React.ReactNode) {
  return <Suspense fallback={<PageLoader />}>{node}</Suspense>;
}

const router = createBrowserRouter([
  {
    path: routes.home,
    element: withSuspense(<LandingPage />),
  },
  {
    path: "*",
    element: withSuspense(<NotFoundPage />),
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
