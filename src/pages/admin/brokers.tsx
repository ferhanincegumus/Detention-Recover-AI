import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Trophy } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { RiskBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBrokers, useBrokerLeaderboard } from "@/services/hooks/use-brokers";
import { useDebounce } from "@/hooks/use-debounce";
import { formatCurrency, formatPercent, initials } from "@/lib/format";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { routes } from "@/config/routes";

export default function BrokersPage() {
  useDocumentMeta({ title: "Broker Intelligence · Detention Recover AI" });
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [risk, setRisk] = useState("all");
  const debounced = useDebounce(search);
  const { data: brokers, isLoading } = useBrokers(
    useMemo(() => ({ search: debounced, riskLevel: risk === "all" ? undefined : risk }), [debounced, risk]),
  );
  const { data: leaderboard } = useBrokerLeaderboard();

  return (
    <div>
      <PageHeader title="Broker Intelligence" description="Know who pays, who stalls, and how to approach each broker." />

      {leaderboard && leaderboard.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" /> Top recoveries</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {leaderboard.slice(0, 3).map((row, i) => (
              <button
                key={row.brokerId}
                onClick={() => navigate(routes.brokerDetail(row.brokerId))}
                className="flex items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary/40"
              >
                <span className="tabular flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 font-display font-bold text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.name}</p>
                  <p className="tabular text-xs text-success">{formatCurrency(row.recoveredAmount)} recovered</p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Search brokers…" className="sm:max-w-xs" />
        <Select value={risk} onValueChange={setRisk}>
          <SelectTrigger className="sm:w-40"><SelectValue placeholder="Risk" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All risk</SelectItem>
            <SelectItem value="low">Low risk</SelectItem>
            <SelectItem value="medium">Medium risk</SelectItem>
            <SelectItem value="high">High risk</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : !brokers || brokers.length === 0 ? (
        <EmptyState icon={Building2} title="No brokers found" description="Brokers appear as you create claims." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Broker</TableHead>
                <TableHead>Recovered</TableHead>
                <TableHead>Recovery %</TableHead>
                <TableHead>Avg. pay days</TableHead>
                <TableHead>Claims</TableHead>
                <TableHead>Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brokers.map((broker) => (
                <TableRow key={broker.id} className="cursor-pointer" onClick={() => navigate(routes.brokerDetail(broker.id))}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9"><AvatarFallback>{initials(broker.name)}</AvatarFallback></Avatar>
                      <div>
                        <p className="font-medium">{broker.name}</p>
                        <p className="text-xs text-muted-foreground">{broker.mcNumber ?? "—"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="tabular font-medium text-success">{formatCurrency(broker.intel.recoveredAmount)}</TableCell>
                  <TableCell className="tabular">{formatPercent(broker.intel.recoveryRate)}</TableCell>
                  <TableCell className="tabular">{broker.intel.avgPaymentDays || "—"}</TableCell>
                  <TableCell className="tabular">{broker.intel.totalClaims}</TableCell>
                  <TableCell><RiskBadge level={broker.intel.riskLevel} score={broker.intel.riskScore} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
