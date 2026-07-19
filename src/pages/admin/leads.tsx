import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Phone, Play, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { LeadStatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLeads, useStartRecovery } from "@/services/hooks/use-leads";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "@/hooks/use-toast";
import { formatPhone, formatRelative } from "@/lib/format";
import { LEAD_STATUS_META, LeadStatus, type CaseLead } from "@/types/lead";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { routes } from "@/config/routes";

export default function LeadsPage() {
  useDocumentMeta({ title: "Case Leads · Detention Recover AI" });
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const debounced = useDebounce(search);
  const startRecovery = useStartRecovery();

  const filters = useMemo(
    () => ({ search: debounced, status: status as LeadStatus | "all" }),
    [debounced, status],
  );
  const { data: leads, isLoading } = useLeads(filters);

  const handleStart = async (lead: CaseLead) => {
    try {
      await startRecovery.mutateAsync(lead.id);
      toast.success("Recovery started", `${lead.companyName} moved to active recovery.`);
    } catch {
      toast.error("Could not start recovery");
    }
  };

  const newCount = leads?.filter((l) => l.status === LeadStatus.New).length ?? 0;

  return (
    <div>
      <PageHeader
        title="Case Leads"
        description="Landing-page submissions and inbound recovery requests."
        actions={newCount > 0 ? <LeadStatusBadge status={LeadStatus.New} /> : undefined}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Search company, contact, broker…" className="sm:max-w-xs" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(LEAD_STATUS_META).map(([value, meta]) => (
              <SelectItem key={value} value={value}>{meta.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : !leads || leads.length === 0 ? (
        <EmptyState icon={Users} title="No leads yet" description="Submissions from the landing page will show up here." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Broker</TableHead>
                <TableHead>Loads</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Received</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id} className="cursor-pointer" onClick={() => navigate(routes.leadDetail(lead.id))}>
                  <TableCell className="font-medium">
                    {lead.companyName}
                    <span className="block text-xs text-muted-foreground">{lead.contactName} · {formatPhone(lead.phone)}</span>
                  </TableCell>
                  <TableCell>{lead.brokerName}</TableCell>
                  <TableCell>{lead.loadCount}</TableCell>
                  <TableCell><LeadStatusBadge status={lead.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatRelative(lead.createdAt)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label="Send SMS" asChild>
                        <a href={`sms:${lead.phone}`}><MessageSquare className="h-4 w-4" /></a>
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Call" asChild>
                        <a href={`tel:${lead.phone}`}><Phone className="h-4 w-4" /></a>
                      </Button>
                      {lead.status === LeadStatus.New || lead.status === LeadStatus.Reviewed || lead.status === LeadStatus.Contacted ? (
                        <Button variant="ghost" size="icon-sm" aria-label="Start recovery" onClick={() => handleStart(lead)}>
                          <Play className="h-4 w-4 text-primary" />
                        </Button>
                      ) : null}
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
