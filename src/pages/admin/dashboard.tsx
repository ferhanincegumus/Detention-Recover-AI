import {
  AlarmClock,
  BellRing,
  CircleDollarSign,
  Clock,
  FileText,
  Mail,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { RecoveryTrendChart } from "@/features/dashboard/components/recovery-trend-chart";
import { ActivityFeed } from "@/features/dashboard/components/activity-feed";
import { AiRecommendations } from "@/features/dashboard/components/ai-recommendations";
import { useDashboardStats, useForecast } from "@/services/hooks/use-dashboard";
import { useAuth } from "@/features/auth/auth-context";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import { useDocumentMeta } from "@/hooks/use-document-meta";

export default function DashboardPage() {
  useDocumentMeta({ title: "Dashboard · Detention Recover AI" });
  const { user } = useAuth();
  const { data: stats, isLoading } = useDashboardStats();
  const { data: forecast } = useForecast();

  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${user?.name ?? "Founder"}`}
        description="Here's what's moving across your recovery pipeline today."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Recovered this month"
          value={formatCurrency(stats?.recoveredThisMonth ?? 0)}
          icon={CircleDollarSign}
          tone="success"
          hint="collected from brokers"
          loading={isLoading}
        />
        <StatCard
          label="Recovered this year"
          value={formatCurrencyCompact(stats?.recoveredThisYear ?? 0)}
          icon={TrendingUp}
          tone="success"
          hint="year to date"
          loading={isLoading}
        />
        <StatCard
          label="Monthly revenue"
          value={formatCurrency(stats?.monthlyRevenue ?? 0)}
          icon={Wallet}
          tone="primary"
          hint="commission this month"
          loading={isLoading}
        />
        <StatCard
          label="Avg. recovery time"
          value={`${stats?.avgRecoveryDays ?? 0} days`}
          icon={Clock}
          hint="claim sent → paid"
          loading={isLoading}
        />
        <StatCard
          label="Open claims"
          value={String(stats?.openClaims ?? 0)}
          icon={FileText}
          hint="in progress"
          loading={isLoading}
        />
        <StatCard
          label="Pending replies"
          value={String(stats?.pendingReplies ?? 0)}
          icon={Mail}
          hint="broker emails to read"
          loading={isLoading}
        />
        <StatCard
          label="Needs attention"
          value={String(stats?.needsAttention ?? 0)}
          icon={AlarmClock}
          hint="awaiting your action"
          loading={isLoading}
        />
        <StatCard
          label="Upcoming follow-ups"
          value={String(stats?.upcomingFollowups ?? 0)}
          icon={BellRing}
          hint="scheduled"
          loading={isLoading}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <RecoveryTrendChart />
        <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-5 shadow-card">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-primary" />
            Next month forecast
          </div>
          <p className="tabular mt-4 font-display text-4xl font-bold text-primary">
            {formatCurrency(forecast ?? 0)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Projected recovery based on your trailing pipeline momentum.
          </p>
          <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total recovered</span>
              <span className="tabular font-medium">{formatCurrency(stats?.totalRecovered ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active carriers</span>
              <span className="tabular font-medium">{stats?.activeCarriers ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <AiRecommendations />
        <ActivityFeed />
      </div>
    </div>
  );
}
