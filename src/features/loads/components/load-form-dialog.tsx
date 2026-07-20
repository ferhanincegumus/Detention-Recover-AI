import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sparkles, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { calculateDetention } from "@/services/domain/detention";
import { aiApi } from "@/services/api/ai";
import { useCreateLoad, useUpdateLoad } from "@/services/hooks/use-loads";
import { useSettings } from "@/services/hooks/use-settings";
import { loadFormSchema, emptyLoadForm, type LoadFormValues } from "@/features/loads/load-schema";
import type { LoadInput } from "@/services/api/loads";
import { StopType, type Load } from "@/types/load";
import { ChargeType } from "@/types/common";

function toLoadInput(values: LoadFormValues): LoadInput {
  return {
    referenceNumber: values.referenceNumber,
    brokerName: values.brokerName,
    customerName: values.customerName,
    customerPhone: values.customerPhone,
    driverName: values.driverName,
    // Charge-type selector is added in the next step; detention is the default.
    chargeType: ChargeType.Detention,
    freeHours: values.freeHours,
    ratePerHour: values.ratePerHour,
    stops: values.stops.map((s) => ({
      type: s.type,
      sequence: s.sequence,
      facilityName: s.facilityName,
      address: s.address,
      appointmentAt: s.appointmentAt || undefined,
      arrivedAt: s.arrivedAt || undefined,
      departedAt: s.departedAt || undefined,
    })),
    documents: {
      hasRateConfirmation: values.hasRateConfirmation,
      hasBol: values.hasBol,
      hasPod: values.hasPod,
      hasTimestamps: values.stops.every((s) => s.arrivedAt && s.departedAt),
    },
    notes: values.notes,
  };
}

interface LoadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  load?: Load;
}

export function LoadFormDialog({ open, onOpenChange, load }: LoadFormDialogProps) {
  const { data: settings } = useSettings();
  const createLoad = useCreateLoad();
  const updateLoad = useUpdateLoad();
  const [parsing, setParsing] = useState(false);

  const defaults = useMemo<LoadFormValues>(() => {
    if (load) {
      return {
        referenceNumber: load.referenceNumber,
        brokerName: load.brokerName,
        customerName: load.customerName ?? "",
        customerPhone: load.customerPhone ?? "",
        driverName: load.driverName ?? "",
        freeHours: load.freeHours,
        ratePerHour: load.ratePerHour,
        stops: load.stops.map((s) => ({
          type: s.type,
          sequence: s.sequence,
          facilityName: s.facilityName ?? "",
          address: s.address,
          appointmentAt: s.appointmentAt ?? "",
          arrivedAt: s.arrivedAt ? s.arrivedAt.slice(0, 16) : "",
          departedAt: s.departedAt ? s.departedAt.slice(0, 16) : "",
        })),
        hasRateConfirmation: load.documents.hasRateConfirmation,
        hasBol: load.documents.hasBol,
        hasPod: load.documents.hasPod,
        notes: load.notes ?? "",
      };
    }
    return emptyLoadForm(settings?.defaultFreeHours ?? 2, settings?.defaultRatePerHour ?? 75);
  }, [load, settings]);

  const form = useForm<LoadFormValues>({
    resolver: zodResolver(loadFormSchema),
    values: defaults,
  });

  const watched = form.watch();
  const detentionPreview = useMemo(() => {
    const stops = watched.stops.map((s, i) => ({
      id: String(i),
      type: s.type,
      sequence: s.sequence,
      address: s.address,
      arrivedAt: s.arrivedAt || undefined,
      departedAt: s.departedAt || undefined,
    }));
    return calculateDetention(stops, Number(watched.freeHours) || 0, Number(watched.ratePerHour) || 0);
  }, [watched]);

  const handleParse = async () => {
    setParsing(true);
    try {
      const parsed = await aiApi.parseRateConfirmation(`rate-con-${Date.now()}.pdf`);
      form.setValue("brokerName", parsed.brokerName);
      form.setValue("referenceNumber", parsed.referenceNumber);
      form.setValue("freeHours", parsed.freeHours);
      form.setValue("ratePerHour", parsed.ratePerHour);
      if (parsed.customerPhone) form.setValue("customerPhone", parsed.customerPhone);
      if (parsed.driverName) form.setValue("driverName", parsed.driverName);
      form.setValue(
        "stops",
        parsed.stops.map((s) => ({
          type: s.type,
          sequence: s.sequence,
          facilityName: s.facilityName ?? "",
          address: s.address,
          appointmentAt: s.appointmentAt ?? "",
          arrivedAt: "",
          departedAt: "",
        })),
      );
      toast.success("Rate confirmation parsed", `${Math.round(parsed.confidence * 100)}% confidence — review and add timestamps.`);
    } catch {
      toast.error("Could not parse the document");
    } finally {
      setParsing(false);
    }
  };

  const onSubmit = async (values: LoadFormValues) => {
    try {
      if (load) {
        await updateLoad.mutateAsync({ id: load.id, input: toLoadInput(values) });
        toast.success("Load updated");
      } else {
        await createLoad.mutateAsync(toLoadInput(values));
        toast.success("Load created", "Detention calculated automatically.");
      }
      onOpenChange(false);
    } catch {
      toast.error("Could not save the load");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{load ? "Edit load" : "New load"}</DialogTitle>
          <DialogDescription>
            {load ? "Update load details and detention timestamps." : "Add a load manually or upload a rate confirmation to auto-fill."}
          </DialogDescription>
        </DialogHeader>

        {!load && (
          <Button type="button" variant="outline" onClick={handleParse} disabled={parsing}>
            {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {parsing ? "Reading rate confirmation…" : "Upload rate confirmation (AI parse)"}
            {!parsing && <Sparkles className="h-3.5 w-3.5 text-primary" />}
          </Button>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="referenceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Load reference</FormLabel>
                    <FormControl><Input placeholder="LD-12345" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="brokerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Broker</FormLabel>
                    <FormControl><Input placeholder="TQL Logistics" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carrier / customer</FormLabel>
                    <FormControl><Input placeholder="Ironhorse Carriers" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer phone</FormLabel>
                    <FormControl><Input inputMode="tel" placeholder="(555) 123-4567" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="freeHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Free hours</FormLabel>
                    <FormControl><Input type="number" step="0.5" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ratePerHour"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detention rate / hour ($)</FormLabel>
                    <FormControl><Input type="number" step="5" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <p className="text-sm font-semibold">Stops & timestamps</p>
              {watched.stops.map((stop, index) => (
                <div key={index} className="rounded-lg border border-border p-3">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {stop.type === StopType.Pickup ? "Pickup" : "Delivery"}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name={`stops.${index}.address`}
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Facility address</FormLabel>
                          <FormControl><Input placeholder="City, ST" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`stops.${index}.arrivedAt`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Arrived (gate in)</FormLabel>
                          <FormControl><Input type="datetime-local" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`stops.${index}.departedAt`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Departed (gate out)</FormLabel>
                          <FormControl><Input type="datetime-local" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/10 p-4">
              <span className="text-sm font-medium">Calculated detention</span>
              <span className="tabular font-display text-xl font-bold text-success">
                {formatCurrency(detentionPreview.amount)}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {detentionPreview.billableHours}h billable
                </span>
              </span>
            </div>

            <div className="space-y-3">
              <Label>Documents on file</Label>
              <div className="flex flex-wrap gap-4">
                {([
                  ["hasRateConfirmation", "Rate confirmation"],
                  ["hasBol", "BOL"],
                  ["hasPod", "POD"],
                ] as const).map(([name, label]) => (
                  <label key={name} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.watch(name)}
                      onCheckedChange={(v) => form.setValue(name, Boolean(v))}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea rows={2} placeholder="Optional notes…" {...field} /></FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={form.formState.isSubmitting}>
                {load ? "Save changes" : "Create load"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
