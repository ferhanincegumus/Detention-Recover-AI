import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BellRing, Pause, Play, Send, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { FollowUpStatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFollowups, useSetFollowupStatus } from "@/services/hooks/use-followups";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/format";
import { FollowUpStatus, FOLLOWUP_CADENCE_DAYS, FollowUpCadence, type FollowUp } from "@/types/followup";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { routes } from "@/config/routes";

const CADENCE_LABEL: Record<FollowUpCadence, string> = {
  [FollowUpCadence.Day7]: "7 days",
  [FollowUpCadence.Day14]: "14 days",
  [FollowUpCadence.Day30]: "30 days",
  [FollowUpCadence.Custom]: "Custom",
};

export default function FollowupsPage() {
  useDocumentMeta({ title: "Follow-ups · Detention Recover AI" });
  const [status, setStatus] = useState("all");
  const setFollowupStatus = useSetFollowupStatus();
  const { data: followups, isLoading } = useFollowups(
    useMemo(() => ({ status: status as FollowUpStatus | "all" }), [status]),
  );

  const act = async (fu: FollowUp, next: FollowUpStatus, message: string) => {
    try {
      await setFollowupStatus.mutateAsync({ id: fu.id, status: next });
      toast.success(message);
    } catch {
      toast.error("Could not update follow-up");
    }
  };

  return (
    <div>
      <PageHeader
        title="Follow-ups"
        description="Automatic broker follow-ups keep claims moving. Pause, resume, or send early."
        actions={
          <Badge variant="muted">
            Auto-cadence: {FOLLOWUP_CADENCE_DAYS.day_7}/{FOLLOWUP_CADENCE_DAYS.day_14}/{FOLLOWUP_CADENCE_DAYS.day_30} days
          </Badge>
        }
      />

      <div className="mb-4">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value={FollowUpStatus.Scheduled}>Scheduled</SelectItem>
            <SelectItem value={FollowUpStatus.Sent}>Sent</SelectItem>
            <SelectItem value={FollowUpStatus.Paused}>Paused</SelectItem>
            <SelectItem value={FollowUpStatus.Cancelled}>Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : !followups || followups.length === 0 ? (
        <EmptyState icon={BellRing} title="No follow-ups" description="Follow-ups are scheduled automatically when claims are sent." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim</TableHead>
                <TableHead>Broker</TableHead>
                <TableHead>Cadence</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {followups.map((fu) => (
                <TableRow key={fu.id}>
                  <TableCell className="font-medium">
                    <Link to={routes.claimDetail(fu.claimId)} className="hover:text-primary">{fu.claimNumber}</Link>
                    <span className="block text-xs text-muted-foreground">Follow-up #{fu.sequence}</span>
                  </TableCell>
                  <TableCell>{fu.brokerName}</TableCell>
                  <TableCell>{CADENCE_LABEL[fu.cadence]}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(fu.scheduledFor)}</TableCell>
                  <TableCell><FollowUpStatusBadge status={fu.status} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {fu.status === FollowUpStatus.Scheduled && (
                        <>
                          <Button variant="ghost" size="icon-sm" aria-label="Send now" onClick={() => act(fu, FollowUpStatus.Sent, "Follow-up sent")}>
                            <Send className="h-4 w-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" aria-label="Pause" onClick={() => act(fu, FollowUpStatus.Paused, "Follow-up paused")}>
                            <Pause className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" aria-label="Cancel" onClick={() => act(fu, FollowUpStatus.Cancelled, "Follow-up cancelled")}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {fu.status === FollowUpStatus.Paused && (
                        <Button variant="ghost" size="icon-sm" aria-label="Resume" onClick={() => act(fu, FollowUpStatus.Scheduled, "Follow-up resumed")}>
                          <Play className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
