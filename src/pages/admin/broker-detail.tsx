import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Clock, Sparkles, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { RiskBadge, ClaimStatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBroker } from "@/services/hooks/use-brokers";
import { useClaims } from "@/services/hooks/use-claims";
import { formatCurrency, formatDuration, formatPercent, initials } from "@/lib/format";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { routes } from "@/config/routes";

export default function BrokerDetailPage() {
  const { brokerId } = useParams();
  const navigate = useNavigate();
  const { data: broker, isLoading } = useBroker(brokerId);
  const { data: claims } = useClaims({ brokerId, status: "all" });
  useDocumentMeta({ title: broker ? `${broker.name} · Broker` : "Broker" });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!broker) {
    return <EmptyState icon={Building2} title="Broker not found" description="This broker may not exist."
      action={<Button asChild variant="outline"><Link to={routes.brokers}>Back to brokers</Link></Button>} />;
  }

  const { intel } = broker;

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to={routes.brokers}><ArrowLeft className="h-4 w-4" /> Broker Intelligence</Link>
      </Button>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Avatar className="h-14 w-14"><AvatarFallback className="text-lg">{initials(broker.name)}</AvatarFallback></Avatar>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold">{broker.name}</h1>
          <p className="text-sm text-muted-foreground">{broker.mcNumber} · {broker.email}</p>
        </div>
        <RiskBadge level={intel.riskLevel} score={intel.riskScore} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Recovered" value={formatCurrency(intel.recoveredAmount)} tone="success" icon={TrendingUp} />
        <StatCard label="Pending" value={formatCurrency(intel.pendingAmount)} tone="primary" />
        <StatCard label="Recovery rate" value={formatPercent(intel.recoveryRate)} hint={`${intel.totalClaims} claims`} />
        <StatCard label="Avg. pay time" value={intel.avgPaymentDays ? `${intel.avgPaymentDays} days` : "—"} icon={Clock} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="border-primary/30 lg:col-span-1">
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI negotiation guidance</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">{intel.aiSuggestion}</p>
            <div className="space-y-2 border-t border-border pt-3">
              <Stat label="Delay score" value={`${intel.delayScore}/100`} />
              <Stat label="Avg. reply time" value={formatDuration(intel.avgReplyHours)} />
              <Stat label="Risk score" value={`${intel.riskScore}/100`} />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Claims with this broker</CardTitle></CardHeader>
          <CardContent className="p-0">
            {!claims || claims.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No claims yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim) => (
                    <TableRow key={claim.id} className="cursor-pointer" onClick={() => navigate(routes.claimDetail(claim.id))}>
                      <TableCell className="font-medium">
                        {claim.claimNumber}
                        <span className="block text-xs text-muted-foreground">{claim.loadReference}</span>
                      </TableCell>
                      <TableCell className="tabular">{formatCurrency(claim.claimedAmount)}</TableCell>
                      <TableCell><ClaimStatusBadge status={claim.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular font-medium">{value}</span>
    </div>
  );
}
