import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, Eye, FileText, MessageSquare, Paperclip, Phone, Play, Send, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LeadStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLead, useSetLeadStatus, useAddLeadNote, useStartRecovery, useSetLeadTags } from "@/services/hooks/use-leads";
import { toast } from "@/hooks/use-toast";
import { formatBytes, formatCurrency, formatDateTime, formatPhone, formatRelative } from "@/lib/format";
import { LEAD_STATUS_META, LeadStatus } from "@/types/lead";
import { useDocumentMeta } from "@/hooks/use-document-meta";
import { routes } from "@/config/routes";

export default function LeadDetailPage() {
  const { leadId } = useParams();
  const { data: lead, isLoading } = useLead(leadId);
  const setStatus = useSetLeadStatus();
  const addNote = useAddLeadNote();
  const setTags = useSetLeadTags();
  const startRecovery = useStartRecovery();
  const [note, setNote] = useState("");
  const [tag, setTag] = useState("");
  useDocumentMeta({ title: lead ? `${lead.companyName} · Leads` : "Lead" });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!lead) {
    return (
      <EmptyState icon={Users} title="Lead not found" description="This lead may have been removed."
        action={<Button asChild variant="outline"><Link to={routes.leads}>Back to leads</Link></Button>} />
    );
  }

  const submitNote = async () => {
    if (!note.trim()) return;
    await addNote.mutateAsync({ id: lead.id, body: note.trim() });
    setNote("");
    toast.success("Note added");
  };

  const addTag = async () => {
    const t = tag.trim();
    if (!t || lead.tags.includes(t)) return;
    await setTags.mutateAsync({ id: lead.id, tags: [...lead.tags, t] });
    setTag("");
  };

  const removeTag = async (t: string) => {
    await setTags.mutateAsync({ id: lead.id, tags: lead.tags.filter((x) => x !== t) });
  };

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to={routes.leads}><ArrowLeft className="h-4 w-4" /> Case Leads</Link>
      </Button>

      <PageHeader
        title={lead.companyName}
        description={`${lead.contactName} · ${lead.brokerName}`}
        actions={
          <>
            <Button variant="outline" asChild><a href={`tel:${lead.phone}`}><Phone className="h-4 w-4" /> Call</a></Button>
            <Button variant="outline" asChild><a href={`sms:${lead.phone}`}><MessageSquare className="h-4 w-4" /> SMS</a></Button>
            <Button onClick={() => startRecovery.mutateAsync(lead.id).then(() => toast.success("Recovery started"))}>
              <Play className="h-4 w-4" /> Start recovery
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Details</CardTitle>
              <LeadStatusBadge status={lead.status} />
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Detail label="Contact" value={lead.contactName} />
              <Detail label="Phone" value={formatPhone(lead.phone)} />
              <Detail label="Email" value={lead.email} />
              <Detail label="Broker" value={lead.brokerName} />
              <Detail label="Loads" value={lead.loadCount} />
              <Detail label="Est. amount" value={lead.estimatedAmount ? formatCurrency(lead.estimatedAmount) : "—"} />
              {lead.details && (
                <div className="sm:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes from submission</p>
                  <p className="mt-1 text-sm">{lead.details}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Add a note…" />
                <Button onClick={submitNote} disabled={!note.trim()}><Send className="h-4 w-4" /></Button>
              </div>
              {lead.notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notes yet.</p>
              ) : (
                <ul className="space-y-3">
                  {lead.notes.map((n) => (
                    <li key={n.id} className="rounded-lg border border-border p-3">
                      <p className="text-sm">{n.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatRelative(n.at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" /> Proof documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lead.attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No documents attached with this submission.
                </p>
              ) : (
                <ul className="space-y-2">
                  {lead.attachments.map((att) => (
                    <li
                      key={att.id}
                      className="flex items-center gap-3 rounded-lg border border-border p-3"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileText className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{att.name}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(att.sizeBytes)}</p>
                      </div>
                      <Button variant="ghost" size="icon-sm" aria-label="Open" asChild>
                        <a href={att.url} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" /></a>
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Download" asChild>
                        <a href={att.url} download={att.name}><Download className="h-4 w-4" /></a>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Status</CardTitle></CardHeader>
            <CardContent>
              <Select value={lead.status} onValueChange={(v) => setStatus.mutateAsync({ id: lead.id, status: v as LeadStatus }).then(() => toast.success("Status updated"))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAD_STATUS_META).map(([value, meta]) => (
                    <SelectItem key={value} value={value}>{meta.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {lead.lastContactedAt && (
                <p className="mt-3 text-xs text-muted-foreground">Last contacted {formatDateTime(lead.lastContactedAt)}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Tags</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {lead.tags.length === 0 && <span className="text-sm text-muted-foreground">No tags</span>}
                {lead.tags.map((t) => (
                  <button key={t} onClick={() => removeTag(t)} className="group">
                    <Badge variant="outline" className="gap-1">{t} <span className="text-muted-foreground group-hover:text-destructive">×</span></Badge>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Add tag" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} />
                <Button variant="outline" onClick={addTag}>Add</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}
