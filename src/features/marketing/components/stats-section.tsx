import { TRUST_STATS } from "@/features/marketing/constants";

export function StatsSection() {
  return (
    <section id="results" className="scroll-mt-20 border-y border-border bg-card/40 py-14">
      <div className="container">
        <dl className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {TRUST_STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <dt className="sr-only">{stat.label}</dt>
              <dd className="tabular font-display text-3xl font-bold text-primary sm:text-4xl">
                {stat.value}
              </dd>
              <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
