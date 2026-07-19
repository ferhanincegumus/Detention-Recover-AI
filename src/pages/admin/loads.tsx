import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, MoreHorizontal, Plus, Truck, Pencil, Trash2, Eye } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { RiskBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoadFormDialog } from "@/features/loads/components/load-form-dialog";
import { useLoads, useCreateClaimFromLoad, useDeleteLoad } from "@/services/hooks/use-loads";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/format";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { routes } from "@/config/routes";
import type { Load } from "@/types/load";

export default function LoadsPage() {
  useDocumentMeta({ title: "Loads · Detention Recover AI" });
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [risk, setRisk] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Load | undefined>();
  const debounced = useDebounce(search);

  const filters = useMemo(
    () => ({ search: debounced, riskLevel: risk === "all" ? undefined : risk }),
    [debounced, risk],
  );
  const { data: loads, isLoading } = useLoads(filters);
  const createClaim = useCreateClaimFromLoad();
  const deleteLoad = useDeleteLoad();

  const openNew = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };
  const openEdit = (load: Load) => {
    setEditing(load);
    setDialogOpen(true);
  };

  const handleCreateClaim = async (load: Load) => {
    try {
      const claim = await createClaim.mutateAsync(load.id);
      toast.success("Claim created", `${claim.claimNumber} drafted from ${load.referenceNumber}.`);
      navigate(routes.claimDetail(claim.id));
    } catch {
      toast.error("Could not create claim");
    }
  };

  const handleDelete = async (load: Load) => {
    try {
      await deleteLoad.mutateAsync(load.id);
      toast.success("Load removed");
    } catch {
      toast.error("Could not remove load");
    }
  };

  return (
    <div>
      <PageHeader
        title="Loads"
        description="Every load, with detention calculated automatically from facility timestamps."
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> New load
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Search reference, broker, driver…" className="sm:max-w-xs" />
        <Select value={risk} onValueChange={setRisk}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder="Claim strength" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All strengths</SelectItem>
            <SelectItem value="low">Strong claim</SelectItem>
            <SelectItem value="medium">Moderate</SelectItem>
            <SelectItem value="high">Weak / risky</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : !loads || loads.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No loads yet"
          description="Add a load or upload a rate confirmation to start calculating detention."
          action={<Button onClick={openNew}><Plus className="h-4 w-4" /> New load</Button>}
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Broker</TableHead>
                <TableHead>Detention</TableHead>
                <TableHead>Claim strength</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loads.map((load) => (
                <TableRow
                  key={load.id}
                  className="cursor-pointer"
                  onClick={() => navigate(routes.loadDetail(load.id))}
                >
                  <TableCell className="font-medium">
                    {load.referenceNumber}
                    <span className="block text-xs text-muted-foreground">{load.customerName ?? "—"}</span>
                  </TableCell>
                  <TableCell>{load.brokerName}</TableCell>
                  <TableCell className="tabular font-medium">{formatCurrency(load.detentionAmount)}</TableCell>
                  <TableCell><RiskBadge level={load.riskLevel} /></TableCell>
                  <TableCell>
                    {load.claimId ? (
                      <Badge variant="primary">Claim created</Badge>
                    ) : load.missingDocuments.length > 0 ? (
                      <Badge variant="warning">{load.missingDocuments.length} docs missing</Badge>
                    ) : (
                      <Badge variant="muted">Ready</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(load.createdAt)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Actions">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(routes.loadDetail(load.id))}>
                          <Eye /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(load)}>
                          <Pencil /> Edit
                        </DropdownMenuItem>
                        {!load.claimId && (
                          <DropdownMenuItem onClick={() => handleCreateClaim(load)}>
                            <FileText /> Create claim
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDelete(load)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <LoadFormDialog open={dialogOpen} onOpenChange={setDialogOpen} load={editing} />
    </div>
  );
}
