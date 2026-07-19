import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

export function CaseFormSection() {
  const [submitted, setSubmitted] = useState(false);

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

  const onSubmit = async (values: CaseLeadInput) => {
    try {
      await submitPublicLead(values);
      setSubmitted(true);
      toast.success("Case received", "We'll text you within one business day.");
    } catch {
      toast.error("Something went wrong", "Please try again or email us directly.");
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
            <SuccessState onReset={() => { setSubmitted(false); form.reset(); }} />
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

                <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Recover my money
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
