import { cn } from "@/lib/utils";
import { useTheme } from "@/app/theme-provider";

/** Chart palette — amber primary + asphalt grays. Consumed by Recharts. */
export const CHART_COLORS = {
  primary: "hsl(38 92% 50%)",
  success: "hsl(142 64% 45%)",
  muted: "hsl(218 11% 60%)",
  grid: "hsl(220 12% 22%)",
  series: ["#f59e0b", "#22c55e", "#647082", "#fcd34d", "#4f596b"],
} as const;

/**
 * Theme-aware chart colors. Recharts sets stroke/fill as attributes (which
 * don't resolve CSS variables reliably), so we return concrete hsl() values
 * matched to the current admin theme — readable grid/axis on both light and
 * dark surfaces.
 */
export function useChartColors() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  return {
    series: CHART_COLORS.series,
    primary: dark ? "hsl(38 92% 50%)" : "hsl(30 95% 44%)",
    success: dark ? "hsl(142 64% 45%)" : "hsl(152 68% 30%)",
    grid: dark ? "hsl(220 12% 24%)" : "hsl(220 16% 88%)",
    axis: dark ? "hsl(218 11% 60%)" : "hsl(220 13% 42%)",
  };
}

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

/** Themed tooltip for all Recharts surfaces. `formatter` shapes each value. */
export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  formatter?: (value: number | string, name?: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-card-lg">
      {label != null && <p className="mb-1 font-medium text-foreground">{label}</p>}
      <div className="space-y-0.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} aria-hidden />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="tabular font-medium text-foreground">
              {formatter ? formatter(entry.value ?? 0, entry.name) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 shadow-card", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
