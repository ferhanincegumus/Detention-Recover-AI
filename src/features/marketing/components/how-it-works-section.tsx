import { FileText, Gavel, HandCoins, MessagesSquare } from "lucide-react";
import { Section } from "@/features/marketing/components/section";
import { HOW_IT_WORKS } from "@/features/marketing/constants";

const STEP_ICONS = [FileText, Gavel, MessagesSquare, HandCoins] as const;

export function HowItWorksSection() {
  return (
    <Section
      id="how-it-works"
      eyebrow="How it works"
      title="Four steps. Almost none of them are yours."
      description="We designed this so a driver can start a recovery from the cab in under a minute."
    >
      <ol className="relative grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        {HOW_IT_WORKS.map((step, index) => {
          const Icon = STEP_ICONS[index];
          return (
            <li key={step.title} className="relative flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-mono text-sm font-semibold text-muted-foreground">
                  0{index + 1}
                </span>
              </div>
              <div>
                <h3 className="mb-1.5 font-display text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
