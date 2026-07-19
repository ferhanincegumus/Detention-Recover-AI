import { Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/features/marketing/components/section";
import { TESTIMONIALS } from "@/features/marketing/constants";

export function TestimonialsSection() {
  return (
    <Section
      eyebrow="Carriers, not case studies"
      title="Real money, recovered for real trucks."
    >
      <div className="grid gap-6 md:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <Card key={t.name} className="flex flex-col">
            <CardContent className="flex flex-1 flex-col gap-4 p-6">
              <Quote className="h-6 w-6 text-primary/50" aria-hidden />
              <p className="flex-1 text-sm leading-relaxed text-foreground">"{t.quote}"</p>
              <div className="space-y-3 border-t border-border pt-4">
                <Badge variant="success">{t.amount}</Badge>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
}
