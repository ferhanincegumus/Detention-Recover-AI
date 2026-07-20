import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartCard, ChartTooltip, useChartColors } from "@/components/shared/chart";
import { formatCurrencyCompact } from "@/lib/format";
import { useMonthlyTrend } from "@/services/hooks/use-dashboard";

export function RecoveryTrendChart() {
  const { data, isLoading } = useMonthlyTrend(6);
  const colors = useChartColors();

  return (
    <ChartCard title="Recovery trend" className="lg:col-span-2">
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <ResponsiveContainer width="100%" height={256}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="recoveredFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.primary} stopOpacity={0.35} />
                <stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="commissionFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.success} stopOpacity={0.25} />
                <stop offset="100%" stopColor={colors.success} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
            <XAxis dataKey="month" stroke={colors.axis} fontSize={12} tickLine={false} axisLine={false} />
            <YAxis
              stroke={colors.axis}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatCurrencyCompact(Number(v))}
              width={52}
            />
            <Tooltip
              content={<ChartTooltip formatter={(v) => formatCurrencyCompact(Number(v))} />}
              cursor={{ stroke: colors.grid }}
            />
            <Area
              type="monotone"
              dataKey="recovered"
              name="Recovered"
              stroke={colors.primary}
              strokeWidth={2}
              fill="url(#recoveredFill)"
            />
            <Area
              type="monotone"
              dataKey="commission"
              name="Commission"
              stroke={colors.success}
              strokeWidth={2}
              fill="url(#commissionFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
