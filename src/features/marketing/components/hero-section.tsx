import { ArrowRight, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecoveryCalculator } from "@/features/marketing/components/recovery-calculator";
import { LiveRecoveredCounter } from "@/features/marketing/components/live-recovered-counter";

const TRUST_BADGES = [
  { icon: ShieldCheck, label: "No recovery, no fee" },
  { icon: Zap, label: "AI-drafted claims" },
  { icon: Sparkles, label: "Zero paperwork" },
] as const;

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-24">
      {/* Animated backdrop */}
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[880px] -translate-x-1/2 rounded-full bg-primary/20 blur-[140px]"
        aria-hidden
      />

      <div className="container relative grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col items-start gap-6 text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-amber-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-primary" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <LiveRecoveredCounter /> recovered for carriers
          </span>

          <h1 className="text-balance font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
            Brokers owe you for detention. <span className="text-primary">We get it back.</span>
          </h1>

          <p className="max-w-xl text-lg text-muted-foreground">
            Stop writing off detention, layover, and TONU. Our AI builds the claim, writes the
            broker, and negotiates until you're paid. You forward one email — we do the rest.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <a href="#case-form">
                Recover my money
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>

          <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-2">
            {TRUST_BADGES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="h-4 w-4 text-success" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="animate-fade-in-up">
          <RecoveryCalculator />
        </div>
      </div>
    </section>
  );
}
