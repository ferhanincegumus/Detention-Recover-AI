import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { NAV_SECTIONS, type NavItem } from "@/features/admin/nav-config";
import { useDashboardStats } from "@/services/hooks/use-dashboard";

/** The navigation list — shared by the desktop rail and the mobile drawer. */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const { data: stats } = useDashboardStats();

  const isActive = (item: NavItem) =>
    item.matchPrefix ? pathname.startsWith(item.matchPrefix) : pathname === item.to;

  const badgeFor = (item: NavItem): number | undefined => {
    if (!item.badgeKey || !stats) return undefined;
    const value = stats[item.badgeKey];
    return value > 0 ? value : undefined;
  };

  return (
    <nav className="flex flex-col gap-6" aria-label="Main">
      {NAV_SECTIONS.map((section, i) => (
        <div key={section.title ?? i} className="flex flex-col gap-1">
          {section.title && (
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
          )}
          {section.items.map((item) => {
            const active = isActive(item);
            const badge = badgeFor(item);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={!item.matchPrefix}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/15 text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <item.icon
                  className={cn("h-[18px] w-[18px] shrink-0", active && "text-primary")}
                />
                <span className="flex-1">{item.label}</span>
                {badge != null && (
                  <Badge variant={active ? "primary" : "muted"} className="h-5 min-w-5 justify-center px-1.5">
                    {badge}
                  </Badge>
                )}
                {active && <span className="h-4 w-1 rounded-full bg-primary" aria-hidden />}
              </NavLink>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
