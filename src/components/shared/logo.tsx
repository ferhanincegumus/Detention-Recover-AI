import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Hide the wordmark, show mark only. */
  iconOnly?: boolean;
}

/** Brand mark — a stylized recovery arrow inside an asphalt tile. */
export function Logo({ className, iconOnly = false }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-display", className)}>
      <span
        className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-glow"
        aria-hidden
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" strokeWidth={2.5} stroke="currentColor">
          <path d="M4 17l6-6 4 4 6-8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 7h5v5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {!iconOnly && (
        <span className="text-lg font-bold leading-tight tracking-tight">
          Detention<span className="text-primary">Recover</span>
        </span>
      )}
    </span>
  );
}
