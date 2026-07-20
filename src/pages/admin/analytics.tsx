import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, TrendingUp, Trophy, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard, ChartTooltip, useChartColors } from "@/components/shared/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RecoveryTrendChart } from "@/features/dashboard/components/recovery-trend-chart";
import {
  useDashboardStats,
  useMonthlyTrend,
  useBrokerRanking,
  useCustomerRanking,
  useForecast,
} from "@/services/hooks/use-dashboard";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import type { RankingRow } from "@/services/api/analytics";
import { useDocumentMeta } from "@/hooks/use-document-meta";

export default function AnalyticsPage() {
  useDocumentMeta({ title: "Analytics · Detention Recover AI" });
  const { data: stats, isLoading } = useDashboardStats();
  const { data: trend } = useMonthlyTrend(6);
  const { data: brokerRanking } = useBrokerRanking(6);
  const { data: customerRanking } = useCustomerRanking(6);
  const { data: forecast } = useForecast();
  const colors = useChartColors();

  const totalCommission = trend?.reduce((sum, p) => sum + p.commission, 0) ?? 0;

  return (
    <div>
      <PageHeader title="Analytics" description="Revenue, recovery performance, and forecasting across your book." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total recovered" value={formatCurrencyCompact(stats?.totalRecovered ?? 0)} tone="success" icon={TrendingUp} loading={isLoading} />
        <StatCard label="Commission (6mo)" value={formatCurrency(totalCommission)} tone="primary" loading={isLoading} />
        <StatCard label="Avg. recovery days" value={`${stats?.avgRecoveryDays ?? 0}`} hint="sent → paid" loading={isLoading} />
        <StatCard label="Next-month forecast" value={formatCurrency(forecast ?? 0)} tone="primary" icon={BarChart3} loading={isLoading} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <RecoveryTrendChart />
        <ChartCard title="Claims closed / month">
          {!trend ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                <XAxis dataKey="month" stroke={colors.axis} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={colors.axis} fontSize={12} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
                <Bar dataKey="claims" name="Claims" radius={[4, 4, 0, 0]}>
                  {trend.map((_, i) => <Cell key={i} fill={colors.primary} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <RankingCard title="Top brokers by recovery" icon={Trophy} rows={brokerRanking} />
        <RankingCard title="Top carriers by recovery" icon={Users} rows={customerRanking} />
      </div>
    </div>
  );
}

function RankingCard({ title, icon: Icon, rows }: { title: string; icon: typeof Trophy; rows?: RankingRow[] }) {
  const max = rows?.[0]?.recovered ?? 1;
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /> {title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {!rows || rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No data yet.</p>
        ) : (
          rows.map((row) => (
            <div key={row.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{row.name}</span>
                <span className="tabular text-success">{formatCurrency(row.recovered)}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((row.recovered / max) * 100)}%` }} />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
