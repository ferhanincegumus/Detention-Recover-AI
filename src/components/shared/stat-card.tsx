import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  hint?: string;
  /** Positive/negative delta as a percentage; renders a trend chip. */
  deltaPercent?: number;
  tone?: "default" | "success" | "primary";
  loading?: boolean;
}

const TONE_ICON_BG: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "bg-muted text-muted-foreground",
  success: "bg-success/15 text-success",
  primary: "bg-primary/15 text-primary",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  deltaPercent,
  tone = "default",
  loading,
}: StatCardProps) {
  if (loading) {
    return (
      <Card className="p-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-8 w-32" />
        <Skeleton className="mt-3 h-3 w-20" />
      </Card>
    );
  }

  const positive = (deltaPercent ?? 0) >= 0;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", TONE_ICON_BG[tone])}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="tabular mt-2 font-display text-3xl font-bold">{value}</p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {deltaPercent != null && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              positive ? "text-success" : "text-destructive",
            )}
          >
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(deltaPercent)}%
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </Card>
  );
}
