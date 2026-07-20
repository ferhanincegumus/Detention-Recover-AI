import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { ClaimStatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useClaims } from "@/services/hooks/use-claims";
import { useBrokers } from "@/services/hooks/use-brokers";
import { useDebounce } from "@/hooks/use-debounce";
import { formatCurrency, formatRelative } from "@/lib/format";
import { CLAIM_STATUS_META, ClaimStatus } from "@/types/claim";
import { CHARGE_TYPE_LABELS } from "@/types/common";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { routes } from "@/config/routes";

export default function ClaimsPage() {
  useDocumentMeta({ title: "Claims · Detention Recover AI" });
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [brokerId, setBrokerId] = useState<string>("all");
  const [chargeType, setChargeType] = useState<string>("all");
  const debounced = useDebounce(search);
  const { data: brokers } = useBrokers();

  const filters = useMemo(
    () => ({
      search: debounced,
      status: status as ClaimStatus | "all" | "open",
      brokerId: brokerId === "all" ? undefined : brokerId,
      chargeType: chargeType === "all" ? undefined : chargeType,
    }),
    [debounced, status, brokerId, chargeType],
  );
  const { data: claims, isLoading } = useClaims(filters);

  return (
    <div>
      <PageHeader title="Claims" description="Track every recovery from draft to paid." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Search claim, broker, load…" className="sm:max-w-xs" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open only</SelectItem>
            {Object.entries(CLAIM_STATUS_META).map(([value, meta]) => (
              <SelectItem key={value} value={value}>{meta.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={brokerId} onValueChange={setBrokerId}>
          <SelectTrigger className="sm:w-48"><SelectValue placeholder="Broker" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All brokers</SelectItem>
            {brokers?.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={chargeType} onValueChange={setChargeType}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder="Charge type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(CHARGE_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : !claims || claims.length === 0 ? (
        <EmptyState icon={FileText} title="No claims found" description="Adjust your filters or create a claim from a load." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim</TableHead>
                <TableHead>Broker</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recovery odds</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.map((claim) => (
                <TableRow key={claim.id} className="cursor-pointer" onClick={() => navigate(routes.claimDetail(claim.id))}>
                  <TableCell className="font-medium">
                    {claim.claimNumber}
                    <span className="block text-xs text-muted-foreground">{claim.loadReference}</span>
                  </TableCell>
                  <TableCell>{claim.brokerName}</TableCell>
                  <TableCell><Badge variant="muted">{CHARGE_TYPE_LABELS[claim.chargeType]}</Badge></TableCell>
                  <TableCell className="tabular font-medium">
                    {claim.status === ClaimStatus.Paid ? (
                      <span className="text-success">{formatCurrency(claim.recoveredAmount)}</span>
                    ) : (
                      formatCurrency(claim.claimedAmount)
                    )}
                  </TableCell>
                  <TableCell><ClaimStatusBadge status={claim.status} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={claim.recoveryProbability} className="h-1.5 w-16" />
                      <span className="tabular flex items-center gap-1 text-xs text-muted-foreground">
                        <Sparkles className="h-3 w-3 text-primary" />{claim.recoveryProbability}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatRelative(claim.updatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
