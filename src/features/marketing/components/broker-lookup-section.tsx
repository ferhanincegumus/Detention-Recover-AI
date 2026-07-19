import { useState } from "react";
import { Building2, Search, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/features/marketing/components/section";

/**
 * Teaser only — the real broker intelligence lives in the admin app. This
 * gives visitors a taste and routes them to start a case.
 */
export function BrokerLookupSection() {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length > 1) setSearched(true);
  };

  return (
    <Section
      id="broker-lookup"
      eyebrow="Broker intelligence"
      title="Know who pays — before you chase it."
      description="We track how brokers handle detention: pay rates, reply times, and how hard they push back."
    >
      <Card className="mx-auto max-w-xl">
        <CardContent className="space-y-5 p-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a broker by name…"
                className="pl-9"
                aria-label="Broker name"
              />
            </div>
            <Button type="submit">Look up</Button>
          </form>

          {searched && (
            <div className="animate-fade-in rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </span>
                <div className="flex-1">
                  <p className="font-medium">{query.trim()}</p>
                  <p className="text-xs text-muted-foreground">Detention payment profile</p>
                </div>
                <Badge variant="warning" className="gap-1">
                  <TrendingDown className="h-3 w-3" />
                  Slow payer
                </Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Full broker profiles — pay rate, avg. reply time, and recovery odds — are unlocked
                when you start a case.{" "}
                <a href="#case-form" className="font-medium text-primary hover:underline">
                  Start now →
                </a>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Section>
  );
}
