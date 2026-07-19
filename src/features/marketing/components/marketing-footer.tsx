import { Link } from "react-router-dom";
import { Logo } from "@/components/shared/logo";
import { routes } from "@/config/routes";
import { env } from "@/config/env";

const FOOTER_SECTIONS = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Results", href: "#results" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Founder story", href: "#founder" },
      { label: "Broker lookup", href: "#broker-lookup" },
      { label: "Get started", href: "#case-form" },
    ],
  },
] as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="container py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <Logo />
            <p className="max-w-xs text-sm text-muted-foreground">
              We recover unpaid detention, layover, and TONU charges from freight brokers using
              AI-assisted negotiation. No recovery, no fee.
            </p>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="mb-4 text-sm font-semibold">{section.title}</h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="mb-4 text-sm font-semibold">Contact</h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <a href={`mailto:${env.support.email}`} className="hover:text-foreground">
                  {env.support.email}
                </a>
              </li>
              <li>
                <Link to={routes.login} className="hover:text-foreground">
                  Admin sign in
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Detention Recover AI. All rights reserved.</p>
          <p className="font-mono uppercase tracking-wider text-primary">No Recovery · No Fee</p>
        </div>
      </div>
    </footer>
  );
}
