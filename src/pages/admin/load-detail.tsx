import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText, MapPin, Pencil, Truck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { RiskBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { LoadFormDialog } from "@/features/loads/components/load-form-dialog";
import { useLoad, useCreateClaimFromLoad } from "@/services/hooks/use-loads";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatDateTime, formatDuration, formatPhone } from "@/lib/format";
import { stopDetentionHours } from "@/services/domain/detention";
import { StopType } from "@/types/load";
import { ChargeType, CHARGE_TYPE_LABELS } from "@/types/common";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { routes } from "@/config/routes";

export default function LoadDetailPage() {
  const { loadId } = useParams();
  const navigate = useNavigate();
  const { data: load, isLoading } = useLoad(loadId);
  const createClaim = useCreateClaimFromLoad();
  const [editOpen, setEditOpen] = useState(false);
  useDocumentMeta({ title: load ? `${load.referenceNumber} · Loads` : "Load" });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!load) {
    return (
      <EmptyState
        icon={Truck}
        title="Load not found"
        description="This load may have been removed."
        action={<Button asChild variant="outline"><Link to={routes.loads}>Back to loads</Link></Button>}
      />
    );
  }

  const isDetention = load.chargeType === ChargeType.Detention;

  const handleCreateClaim = async () => {
    try {
      const claim = await createClaim.mutateAsync(load.id);
      toast.success("Claim created", claim.claimNumber);
      navigate(routes.claimDetail(claim.id));
    } catch {
      toast.error("Could not create claim");
    }
  };

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to={routes.loads}><ArrowLeft className="h-4 w-4" /> Loads</Link>
      </Button>

      <PageHeader
        title={load.referenceNumber}
        description={`${load.brokerName} · ${load.customerName ?? "—"}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
            {load.claimId ? (
              <Button asChild><Link to={routes.claimDetail(load.claimId)}><FileText className="h-4 w-4" /> View claim</Link></Button>
            ) : (
              <Button onClick={handleCreateClaim} loading={createClaim.isPending}>
                <FileText className="h-4 w-4" /> Create claim
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>
                {isDetention ? "Stops & detention" : `${CHARGE_TYPE_LABELS[load.chargeType]} charge`}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="muted">{CHARGE_TYPE_LABELS[load.chargeType]}</Badge>
                <RiskBadge level={load.riskLevel} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {load.stops.map((stop) => {
                const hours = stopDetentionHours(stop, load.freeHours);
                return (
                  <div key={stop.id} className="rounded-lg border border-border p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <MapPin className="h-4 w-4 text-primary" />
                        {stop.type === StopType.Pickup ? "Pickup" : "Delivery"} · {stop.facilityName ?? stop.address}
                      </span>
                      {isDetention && (
                        <span className="tabular text-sm font-medium text-success">
                          {formatCurrency(Math.round(hours * load.ratePerHour))}
                        </span>
                      )}
                    </div>
                    <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide">Arrived</p>
                        <p className="text-foreground">{formatDateTime(stop.arrivedAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide">Departed</p>
                        <p className="text-foreground">{formatDateTime(stop.departedAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide">Detained</p>
                        <p className="text-foreground">{formatDuration(hours)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{load.chargeBasis}</span>
                <span className="tabular font-display text-2xl font-bold text-success">
                  {formatCurrency(load.chargeAmount)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Detail label="Driver" value={load.driverName ?? "—"} />
              <Detail label="Customer phone" value={formatPhone(load.customerPhone)} />
              <Detail label="Detention rate" value={`${formatCurrency(load.ratePerHour)}/hr`} />
              <Detail label="Free time" value={`${load.freeHours}h`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Evidence</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                ["Rate confirmation", load.documents.hasRateConfirmation],
                ["BOL", load.documents.hasBol],
                ["POD", load.documents.hasPod],
                ["Gate timestamps", load.documents.hasTimestamps],
              ].map(([label, present]) => (
                <div key={String(label)} className="flex items-center justify-between text-sm">
                  <span>{label}</span>
                  {present ? <Badge variant="success">On file</Badge> : <Badge variant="warning">Missing</Badge>}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <LoadFormDialog open={editOpen} onOpenChange={setEditOpen} load={load} />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
