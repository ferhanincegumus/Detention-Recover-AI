import { Sparkles, User } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import type { ClaimTimelineEvent } from "@/types/claim";

export function ClaimTimeline({ events }: { events: ClaimTimelineEvent[] }) {
  const ordered = [...events].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <ol className="relative space-y-5 pl-6">
      <span className="absolute bottom-2 left-[7px] top-2 w-px bg-border" aria-hidden />
      {ordered.map((event) => (
        <li key={event.id} className="relative">
          <span
            className={`absolute -left-[22px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background ${
              event.automated ? "bg-primary" : "bg-muted-foreground"
            }`}
            aria-hidden
          />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{event.title}</p>
              {event.description && <p className="text-xs text-muted-foreground">{event.description}</p>}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(event.at)}</span>
          </div>
          <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {event.automated ? <Sparkles className="h-2.5 w-2.5 text-primary" /> : <User className="h-2.5 w-2.5" />}
            {event.automated ? "Automated" : "You"}
          </span>
        </li>
      ))}
    </ol>
  );
}
