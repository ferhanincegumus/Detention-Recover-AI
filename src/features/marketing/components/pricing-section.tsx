import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/features/marketing/components/section";

const INCLUDED = [
  "AI-drafted detention, layover & TONU claims",
  "Every broker reply and follow-up handled for you",
  "SMS updates at each milestone",
  "Full evidence package (rate con, BOL, POD)",
  "Settlement negotiation to maximize recovery",
  "No caps, no monthly fees, no contracts",
] as const;

const EXCLUDED = [
  "Upfront costs",
  "Subscription fees",
  "Charges if we recover nothing",
] as const;

export function PricingSection() {
  return (
    <Section
      id="pricing"
      eyebrow="Pricing"
      title="One honest deal: no recovery, no fee."
      description="We only make money when you do. Our fee comes out of what we recover — never out of your pocket."
    >
      <Card className="mx-auto max-w-2xl overflow-hidden border-primary/30 shadow-glow">
        <CardContent className="p-8 sm:p-10">
          <div className="flex flex-col items-center gap-3 text-center">
            <Badge variant="primary">Contingency</Badge>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-5xl font-bold">$0</span>
              <span className="text-muted-foreground">upfront, ever</span>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              We keep an agreed percentage of what we recover. You keep the rest. If we recover
              nothing, you owe nothing.
            </p>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <ul className="space-y-3">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <ul className="space-y-3">
              {EXCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button asChild size="lg" className="mt-8 w-full">
            <a href="#case-form">Start a recovery — free</a>
          </Button>
        </CardContent>
      </Card>
    </Section>
  );
}
