import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  CircleDollarSign,
  Download,
  FileText,
  Mail,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ClaimStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClaimTimeline } from "@/features/claims/components/claim-timeline";
import { ClaimAiPanel } from "@/features/claims/components/claim-ai-panel";
import { MarkPaidDialog } from "@/features/claims/components/mark-paid-dialog";
import { exportClaimPdf } from "@/features/claims/claim-export";
import { useClaim, useSetClaimStatus } from "@/services/hooks/use-claims";
import { useLoad } from "@/services/hooks/use-loads";
import { useClaimThread } from "@/services/hooks/use-inbox";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatDateTime, formatPercent } from "@/lib/format";
import {
  CLAIM_STATUS_META,
  ClaimStatus,
  TERMINAL_CLAIM_STATUSES,
} from "@/types/claim";
import { MessageDirection } from "@/types/communication";
import { CHARGE_TYPE_LABELS } from "@/types/common";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { routes } from "@/config/routes";

export default function ClaimDetailPage() {
  const { claimId } = useParams();
  const { data: claim, isLoading } = useClaim(claimId);
  const { data: load } = useLoad(claim?.loadId);
  const { data: thread } = useClaimThread(claimId);
  const setStatus = useSetClaimStatus();
  const [paidOpen, setPaidOpen] = useState(false);
  useDocumentMeta({ title: claim ? `${claim.claimNumber} · Claims` : "Claim" });

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }
  if (!claim) {
    return (
      <EmptyState
        icon={FileText}
        title="Claim not found"
        description="This claim may have been removed."
        action={<Button asChild variant="outline"><Link to={routes.claims}>Back to claims</Link></Button>}
      />
    );
  }

  const latestInbound = thread?.filter((e) => e.direction === MessageDirection.Inbound).at(-1)?.body;
  const isTerminal = TERMINAL_CLAIM_STATUSES.includes(claim.status);

  const handleStatus = async (value: string) => {
    try {
      await setStatus.mutateAsync({ id: claim.id, status: value as ClaimStatus });
      toast.success("Status updated", CLAIM_STATUS_META[value as ClaimStatus].label);
    } catch {
      toast.error("Could not update status");
    }
  };

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to={routes.claims}><ArrowLeft className="h-4 w-4" /> Claims</Link>
      </Button>

      <PageHeader
        title={claim.claimNumber}
        description={`${claim.brokerName} · Load ${claim.loadReference}`}
        actions={
          <>
            <Button variant="outline" onClick={() => exportClaimPdf(claim)}>
              <Download className="h-4 w-4" /> Export PDF
            </Button>
            {!isTerminal && (
              <Button variant="success" onClick={() => setPaidOpen(true)}>
                <CircleDollarSign className="h-4 w-4" /> Mark paid
              </Button>
            )}
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <ClaimStatusBadge status={claim.status} />
        <Badge variant="muted">{CHARGE_TYPE_LABELS[claim.chargeType]}</Badge>
        {!isTerminal && (
          <Select value={claim.status} onValueChange={handleStatus}>
            <SelectTrigger className="h-8 w-52 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CLAIM_STATUS_META).map(([value, meta]) => (
                <SelectItem key={value} value={value}>Set: {meta.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Money summary */}
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
              <Metric label="Claimed" value={formatCurrency(claim.claimedAmount)} />
              <Metric label="Recovered" value={formatCurrency(claim.recoveredAmount)} tone="success" />
              <Metric label="Commission" value={formatCurrency(claim.commissionAmount)} />
              <Metric label="Carrier payout" value={formatCurrency(claim.carrierPayout)} />
            </CardContent>
          </Card>

          <ClaimAiPanel claim={claim} load={load} latestInbound={latestInbound} />

          {/* Email history */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-4 w-4" /> Email history</CardTitle></CardHeader>
            <CardContent>
              {!thread || thread.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No emails yet for this claim.</p>
              ) : (
                <ul className="space-y-3">
                  {thread.map((email) => {
                    const inbound = email.direction === MessageDirection.Inbound;
                    return (
                      <li key={email.id} className={`rounded-lg border p-3 ${inbound ? "border-primary/30 bg-primary/5" : "border-border"}`}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="flex items-center gap-2 text-sm font-medium">
                            {inbound ? <ArrowUpRight className="h-3.5 w-3.5 text-primary" /> : <Mail className="h-3.5 w-3.5 text-muted-foreground" />}
                            {inbound ? email.from : `To: ${email.to}`}
                          </span>
                          <span className="text-xs text-muted-foreground">{formatDateTime(email.sentAt)}</span>
                        </div>
                        <p className="text-sm font-medium">{email.subject}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{email.body}</p>
                        {email.classification && <Badge variant="warning" className="mt-2 capitalize">{email.classification.replace(/_/g, " ")}</Badge>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI prediction</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Recovery probability</span>
                  <span className="tabular font-semibold">{formatPercent(claim.recoveryProbability)}</span>
                </div>
                <Progress value={claim.recoveryProbability} />
              </div>
              {claim.predictedPaymentDate && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Predicted payment</span>
                  <span className="font-medium">{formatDateTime(claim.predictedPaymentDate)}</span>
                </div>
              )}
              {claim.settlementOffer != null && (
                <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                  <span>Settlement offer</span>
                  <span className="tabular font-semibold text-amber-700 dark:text-amber-300">{formatCurrency(claim.settlementOffer)}</span>
                </div>
              )}
              <Separator />
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to={routes.loadDetail(claim.loadId)}><FileText className="h-4 w-4" /> View load & evidence</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
            <CardContent><ClaimTimeline events={claim.timeline} /></CardContent>
          </Card>
        </div>
      </div>

      <MarkPaidDialog open={paidOpen} onOpenChange={setPaidOpen} claim={claim} />
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`tabular mt-1 font-display text-xl font-bold ${tone === "success" ? "text-success" : ""}`}>{value}</p>
    </div>
  );
}
