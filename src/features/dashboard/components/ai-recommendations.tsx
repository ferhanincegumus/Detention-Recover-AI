import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChartCard } from "@/components/shared/chart";
import { EmptyState } from "@/components/shared/empty-state";
import { useAiRecommendations } from "@/services/hooks/use-dashboard";
import type { AiRecommendation } from "@/services/api/analytics";
import { routes } from "@/config/routes";

const PRIORITY_VARIANT: Record<AiRecommendation["priority"], "destructive" | "warning" | "muted"> = {
  high: "destructive",
  medium: "warning",
  low: "muted",
};

export function AiRecommendations() {
  const { data, isLoading } = useAiRecommendations();

  return (
    <ChartCard
      title="AI recommendations"
      action={
        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Prioritized
        </span>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState icon={Sparkles} title="All caught up" description="No actions need your attention right now." />
      ) : (
        <ul className="space-y-2">
          {data.map((rec) => {
            const body = (
              <div className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/40 hover:bg-accent/40">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={PRIORITY_VARIANT[rec.priority]} className="capitalize">
                      {rec.priority}
                    </Badge>
                    <p className="truncate text-sm font-medium">{rec.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{rec.detail}</p>
                </div>
                {rec.claimId && <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />}
              </div>
            );
            return (
              <li key={rec.id}>
                {rec.claimId ? <Link to={routes.claimDetail(rec.claimId)}>{body}</Link> : body}
              </li>
            );
          })}
        </ul>
      )}
    </ChartCard>
  );
}
