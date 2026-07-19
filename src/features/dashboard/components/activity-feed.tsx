import { Link } from "react-router-dom";
import {
  Bot,
  CircleDollarSign,
  FileText,
  MailOpen,
  Send,
  Sparkles,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartCard } from "@/components/shared/chart";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelative } from "@/lib/format";
import { ActivityType, type Activity } from "@/types/communication";
import { useRecentActivity } from "@/services/hooks/use-dashboard";
import { routes } from "@/config/routes";

const ICON_FOR: Record<string, LucideIcon> = {
  [ActivityType.PaymentReceived]: CircleDollarSign,
  [ActivityType.BrokerReplied]: MailOpen,
  [ActivityType.ClaimSent]: Send,
  [ActivityType.ClaimCreated]: FileText,
  [ActivityType.LeadCreated]: UserPlus,
  [ActivityType.AiAction]: Bot,
  [ActivityType.FollowUpSent]: Send,
};

function activityLink(a: Activity): string | null {
  if (a.claimId) return routes.claimDetail(a.claimId);
  if (a.leadId) return routes.leadDetail(a.leadId);
  if (a.loadId) return routes.loadDetail(a.loadId);
  return null;
}

export function ActivityFeed() {
  const { data, isLoading } = useRecentActivity(10);

  return (
    <ChartCard title="Recent activity">
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState icon={Sparkles} title="No activity yet" description="Actions will appear here as they happen." />
      ) : (
        <ul className="space-y-1">
          {data.map((a) => {
            const Icon = ICON_FOR[a.type] ?? Sparkles;
            const to = activityLink(a);
            const content = (
              <div className="flex gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  {a.description && <p className="truncate text-xs text-muted-foreground">{a.description}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-xs text-muted-foreground">{formatRelative(a.createdAt)}</span>
                  {a.automated && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary">
                      <Sparkles className="h-2.5 w-2.5" /> AI
                    </span>
                  )}
                </div>
              </div>
            );
            return <li key={a.id}>{to ? <Link to={to}>{content}</Link> : content}</li>;
          })}
        </ul>
      )}
    </ChartCard>
  );
}
