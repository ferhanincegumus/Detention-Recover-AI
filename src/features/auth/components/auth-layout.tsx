import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { routes } from "@/config/routes";
import { useSectionTheme } from "@/hooks/use-section-theme";

const HIGHLIGHTS = [
  "AI drafts every claim, reply, and follow-up",
  "Broker intelligence on who pays and who stalls",
  "SMS the carrier at every milestone automatically",
] as const;

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Split-screen auth shell: brand panel + form card. */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  useSectionTheme("dark"); // auth surfaces share the dark brand identity
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-asphalt-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div
          className="pointer-events-none absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-primary/20 blur-[120px]"
          aria-hidden
        />
        <Link to={routes.home} className="relative z-10 w-fit">
          <Logo />
        </Link>
        <div className="relative z-10 space-y-6">
          <h2 className="max-w-md font-display text-3xl font-bold leading-tight">
            The operating system that recovers detention while you drive the business.
          </h2>
          <ul className="space-y-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 font-mono text-xs uppercase tracking-[0.25em] text-primary">
          No Recovery · No Fee
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden">
            <Link to={routes.home}>
              <Logo />
            </Link>
          </div>
          <div className="space-y-1.5">
            <h1 className="font-display text-2xl font-bold">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {children}
          {footer && <div className="text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
