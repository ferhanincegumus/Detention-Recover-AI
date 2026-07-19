import { useState } from "react";
import { Link } from "react-router-dom";
import { Inbox, MailOpen, RefreshCw, Sparkles, Plus, Mailbox } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useInbox, useMarkInboxRead, useScanInbox } from "@/services/hooks/use-inbox";
import { useSettings } from "@/services/hooks/use-settings";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatRelative } from "@/lib/format";
import { REPLY_CLASSIFICATION_LABELS } from "@/types/communication";
import type { RecoveryOpportunity } from "@/services/api/inbox";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { routes } from "@/config/routes";

export default function InboxPage() {
  useDocumentMeta({ title: "Recovery Inbox · Detention Recover AI" });
  const { data: emails, isLoading } = useInbox();
  const { data: settings } = useSettings();
  const markRead = useMarkInboxRead();
  const scan = useScanInbox();
  const [opportunities, setOpportunities] = useState<RecoveryOpportunity[]>([]);

  const runScan = async () => {
    try {
      const found = await scan.mutateAsync();
      setOpportunities(found);
      toast.success("Scan complete", `${found.length} recovery opportunities found.`);
    } catch {
      toast.error("Scan failed");
    }
  };

  return (
    <div>
      <PageHeader
        title="Recovery Inbox"
        description="Scan your mailbox for unclaimed detention, layover, TONU, and accessorials."
        actions={
          <Button onClick={runScan} loading={scan.isPending}>
            <RefreshCw className="h-4 w-4" /> Scan inbox
          </Button>
        }
      />

      <Card className="mb-6">
        <CardContent className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
              <Mailbox className="h-5 w-5 text-muted-foreground" />
            </span>
            <div>
              <p className="text-sm font-medium">Connected mailbox</p>
              <p className="text-xs text-muted-foreground">{settings?.connectedMailbox ?? settings?.companyEmail ?? "Not connected"}</p>
            </div>
          </div>
          <Badge variant="success">Connected</Badge>
        </CardContent>
      </Card>

      {opportunities.length > 0 && (
        <Card className="mb-6 border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Detected opportunities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {opportunities.map((opp) => (
              <div key={opp.id} className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="warning" className="capitalize">{opp.detectedType}</Badge>
                    <p className="truncate text-sm font-medium">{opp.subject}</p>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{opp.from} · {opp.snippet}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="tabular text-sm font-semibold text-success">{formatCurrency(opp.estimatedAmount)}</span>
                  <Button asChild size="sm"><Link to={routes.loads}><Plus className="h-4 w-4" /> Recover</Link></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Broker replies</h2>
      {isLoading ? (
        <ListSkeleton />
      ) : !emails || emails.length === 0 ? (
        <EmptyState icon={Inbox} title="Inbox is clear" description="No inbound broker replies waiting for you." />
      ) : (
        <Card className="divide-y divide-border">
          {emails.map((email) => (
            <Link
              key={email.id}
              to={email.claimId ? routes.claimDetail(email.claimId) : routes.inbox}
              onClick={() => !email.read && markRead.mutate(email.id)}
              className="flex items-start gap-3 p-4 transition-colors hover:bg-accent/40"
            >
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${email.read ? "bg-transparent" : "bg-primary"}`} aria-hidden />
              <MailOpen className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={`truncate text-sm ${email.read ? "font-normal" : "font-semibold"}`}>{email.from}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(email.sentAt)}</span>
                </div>
                <p className="truncate text-sm">{email.subject}</p>
                <p className="truncate text-xs text-muted-foreground">{email.body}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  {email.claimNumber && <Badge variant="muted">{email.claimNumber}</Badge>}
                  {email.classification && <Badge variant="warning">{REPLY_CLASSIFICATION_LABELS[email.classification]}</Badge>}
                </div>
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
