import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, Paperclip, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Section } from "@/features/marketing/components/section";
import { toast } from "@/hooks/use-toast";
import {
  caseLeadSchema,
  LOAD_COUNT_OPTIONS,
  type CaseLeadInput,
} from "@/features/marketing/lead-schema";
import { submitPublicLead } from "@/features/marketing/lead-submission";
import { uploadFile, assertUploadable, ACCEPTED_UPLOAD_TYPES } from "@/services/storage";
import { uid } from "@/lib/utils";
import { formatBytes } from "@/lib/format";
import type { LeadAttachment } from "@/types/lead";

const MAX_FILES = 8;

export function CaseFormSection() {
  const [submitted, setSubmitted] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  const form = useForm<CaseLeadInput>({
    resolver: zodResolver(caseLeadSchema),
    defaultValues: {
      companyName: "",
      contactName: "",
      phone: "",
      email: "",
      brokerName: "",
      loadCount: "1",
      estimatedAmount: "",
      details: "",
    },
  });

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming: File[] = [];
    for (const file of Array.from(list)) {
      try {
        assertUploadable(file);
        incoming.push(file);
      } catch (err) {
        toast.error("File not added", err instanceof Error ? err.message : undefined);
      }
    }
    setFiles((prev) => [...prev, ...incoming].slice(0, MAX_FILES));
    if (fileInput.current) fileInput.current.value = "";
  };

  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const onSubmit = async (values: CaseLeadInput) => {
    try {
      const attachments: LeadAttachment[] = [];
      for (const file of files) {
        const stored = await uploadFile(file, { folder: "lead-uploads", isPublic: true });
        attachments.push({
          id: uid("att"),
          name: stored.name,
          url: stored.url,
          contentType: stored.contentType,
          sizeBytes: stored.sizeBytes,
        });
      }
      await submitPublicLead(values, attachments);
      setSubmitted(true);
      toast.success("Case received", "We'll text you within one business day.");
    } catch (err) {
      toast.error("Something went wrong", err instanceof Error ? err.message : "Please try again or email us directly.");
    }
  };

  return (
    <Section
      id="case-form"
      eyebrow="Get started"
      title="Start a recovery in 60 seconds"
      description="Tell us who owes you. We'll confirm what's recoverable and start the claim — free."
    >
      <Card className="mx-auto max-w-2xl">
        <CardContent className="p-6 sm:p-8">
          {submitted ? (
            <SuccessState onReset={() => { setSubmitted(false); form.reset(); setFiles([]); }} />
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company / your name</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Trucking LLC" autoComplete="organization" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact name</FormLabel>
                        <FormControl>
                          <Input placeholder="Marcus Davis" autoComplete="name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile phone</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4567" inputMode="tel" autoComplete="tel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="you@company.com" type="email" autoComplete="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="brokerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Which broker owes you?</FormLabel>
                        <FormControl>
                          <Input placeholder="TQL, RXO, Coyote…" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="loadCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>How many loads?</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {LOAD_COUNT_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="details"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Anything else? (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detained 5 hours at delivery, broker won't respond…"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <Label>Attach proof (optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Rate confirmation, BOL, POD, or gate-time screenshots — the more you send, the
                    faster and more accurately we can build your claim.
                  </p>
                  <input
                    ref={fileInput}
                    type="file"
                    multiple
                    accept={ACCEPTED_UPLOAD_TYPES}
                    className="hidden"
                    onChange={(e) => addFiles(e.target.files)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInput.current?.click()}
                    disabled={files.length >= MAX_FILES}
                  >
                    <Paperclip className="h-4 w-4" />
                    {files.length >= MAX_FILES ? "Maximum files added" : "Add documents"}
                  </Button>
                  {files.length > 0 && (
                    <ul className="space-y-1.5">
                      {files.map((file, index) => (
                        <li
                          key={`${file.name}-${index}`}
                          className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                        >
                          <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate">{file.name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
                            aria-label={`Remove ${file.name}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {form.formState.isSubmitting ? "Uploading & submitting…" : "Recover my money"}
                </Button>

                <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-success" />
                  No recovery, no fee. Your info stays private.
                </p>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </Section>
  );
}

function SuccessState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
        <CheckCircle2 className="h-8 w-8 text-success" />
      </div>
      <div className="space-y-1">
        <h3 className="font-display text-2xl font-bold">Case received.</h3>
        <p className="max-w-md text-muted-foreground">
          We'll review your load and text you within one business day with what's recoverable. Keep
          an eye on your phone.
        </p>
      </div>
      <Button variant="outline" onClick={onReset}>
        Submit another load
      </Button>
    </div>
  );
}
