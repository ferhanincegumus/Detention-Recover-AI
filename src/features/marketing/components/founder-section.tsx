import { Section } from "@/features/marketing/components/section";
import { Logo } from "@/components/shared/logo";

export function FounderSection() {
  return (
    <Section id="founder" className="bg-card/40">
      <div className="mx-auto grid max-w-4xl items-center gap-10 md:grid-cols-[0.8fr_1.2fr]">
        <div className="relative">
          <div className="aspect-square overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-asphalt-800 to-asphalt-950 p-8">
            <div className="flex h-full flex-col justify-between">
              <Logo />
              <blockquote className="font-display text-2xl font-semibold leading-tight">
                "I lost $30k to detention before I built the system that gets it back."
              </blockquote>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            Founder story
          </p>
          <h2 className="font-display text-3xl font-bold">Built by a carrier, for carriers.</h2>
          <div className="space-y-4 text-muted-foreground">
            <p>
              I ran freight for years and watched detention pile up unpaid. Brokers counted on me
              being too busy driving to chase $150 here, $300 there. Across a year, it was tens of
              thousands of dollars — gone.
            </p>
            <p>
              So I built the system I wished I had: AI that reads the rate con, assembles the claim,
              writes the broker, and negotiates until the money lands. No lawyers, no spreadsheets,
              no risk. If we don't recover, you don't pay.
            </p>
            <p className="font-medium text-foreground">
              That's the whole promise. No recovery, no fee.
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}
