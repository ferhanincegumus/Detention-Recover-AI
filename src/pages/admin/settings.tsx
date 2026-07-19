import { useEffect, useState } from "react";
import { Database, Percent, RefreshCw, Save, Zap } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useSettings, useUpdateSettings, useResetDemoData } from "@/services/hooks/use-settings";
import { toast } from "@/hooks/use-toast";
import { isMockBackend } from "@/config/env";
import type { AppSettings } from "@/types/user";
import { useDocumentMeta } from "@/hooks/use-document-meta";

export default function SettingsPage() {
  useDocumentMeta({ title: "Settings · Detention Recover AI" });
  const { data: settings, isLoading } = useSettings();
  const update = useUpdateSettings();
  const reset = useResetDemoData();
  const [form, setForm] = useState<AppSettings | null>(null);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  if (isLoading || !form) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const save = async () => {
    try {
      await update.mutateAsync(form);
      toast.success("Settings saved");
    } catch {
      toast.error("Could not save settings");
    }
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Recovery defaults, automation, and company identity."
        actions={<Button onClick={save} loading={update.isPending}><Save className="h-4 w-4" /> Save changes</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Percent className="h-4 w-4 text-primary" /> Recovery defaults</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Default commission rate (%)">
              <Input
                type="number"
                value={Math.round(form.defaultCommissionRate * 100)}
                onChange={(e) => set("defaultCommissionRate", Number(e.target.value) / 100)}
              />
            </Field>
            <Field label="Default free hours">
              <Input type="number" step="0.5" value={form.defaultFreeHours} onChange={(e) => set("defaultFreeHours", Number(e.target.value))} />
            </Field>
            <Field label="Default detention rate ($/hr)">
              <Input type="number" step="5" value={form.defaultRatePerHour} onChange={(e) => set("defaultRatePerHour", Number(e.target.value))} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Automation</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <Toggle label="Auto-schedule follow-ups" description="Create 7/14/30-day follow-ups when a claim is sent." checked={form.autoFollowUps} onChange={(v) => set("autoFollowUps", v)} />
            <Toggle label="Auto-draft broker replies" description="Draft replies to inbound broker emails for your review." checked={form.autoDraftReplies} onChange={(v) => set("autoDraftReplies", v)} />
            <Toggle label="Notify on broker reply" description="Get notified when a broker responds." checked={form.notifyOnBrokerReply} onChange={(v) => set("notifyOnBrokerReply", v)} />
            <Toggle label="Notify on payment" description="Get notified when a claim is paid." checked={form.notifyOnPayment} onChange={(v) => set("notifyOnPayment", v)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Company identity</CardTitle><CardDescription>Used on outbound claims and emails.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Company name"><Input value={form.companyName} onChange={(e) => set("companyName", e.target.value)} /></Field>
            <Field label="Company email"><Input type="email" value={form.companyEmail} onChange={(e) => set("companyEmail", e.target.value)} /></Field>
            <Field label="Company phone"><Input value={form.companyPhone} onChange={(e) => set("companyPhone", e.target.value)} /></Field>
            <Field label="Connected mailbox"><Input value={form.connectedMailbox ?? ""} placeholder="recovery@yourcompany.com" onChange={(e) => set("connectedMailbox", e.target.value)} /></Field>
          </CardContent>
        </Card>

        {isMockBackend && (
          <Card className="border-destructive/30">
            <CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-4 w-4" /> Demo data</CardTitle><CardDescription>This build runs on a local mock backend.</CardDescription></CardHeader>
            <CardContent>
              <Separator className="mb-4" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Reset demo data</p>
                  <p className="text-xs text-muted-foreground">Restore the seeded dataset. This clears your changes.</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => reset.mutateAsync().then(() => toast.success("Demo data reset"))}
                  loading={reset.isPending}
                >
                  <RefreshCw className="h-4 w-4" /> Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
