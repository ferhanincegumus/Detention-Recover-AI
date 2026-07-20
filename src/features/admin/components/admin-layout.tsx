import { Suspense, useEffect, useLayoutEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { applyHtmlTheme, useTheme } from "@/app/theme-provider";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Logo } from "@/components/shared/logo";
import { PageLoader } from "@/components/shared/page-loader";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { Topbar } from "@/features/admin/components/topbar";
import { SidebarNav } from "@/features/admin/components/sidebar-nav";
import { CommandPalette } from "@/features/admin/components/command-palette";
import { routes } from "@/config/routes";

export function AdminLayout() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { theme } = useTheme();

  // The admin panel is light by default; keep the document theme in sync with
  // the founder's preference (and re-apply after returning from a dark surface).
  useLayoutEffect(() => {
    applyHtmlTheme(theme);
  }, [theme]);

  // ⌘K / Ctrl-K opens global search.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-card/40 lg:flex">
        <div className="flex h-16 items-center px-6">
          <Link to={routes.dashboard} aria-label="Dashboard">
            <Logo />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <SidebarNav />
        </div>
      </aside>

      {/* Mobile nav drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex h-16 items-center px-6">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Logo />
          </div>
          <div className="overflow-y-auto px-4 pb-6">
            <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <div className="lg:pl-64">
        <Topbar
          onOpenSearch={() => setSearchOpen(true)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
