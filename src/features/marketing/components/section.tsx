import { cn } from "@/lib/utils";

interface SectionProps {
  id?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  className?: string;
  containerClassName?: string;
  children: React.ReactNode;
}

/** Shared marketing section wrapper with a consistent header block. */
export function Section({
  id,
  eyebrow,
  title,
  description,
  className,
  containerClassName,
  children,
}: SectionProps) {
  return (
    <section id={id} className={cn("scroll-mt-20 py-20 sm:py-24", className)}>
      <div className={cn("container", containerClassName)}>
        {(eyebrow || title || description) && (
          <div className="mx-auto mb-14 max-w-2xl text-center">
            {eyebrow && (
              <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="text-balance font-display text-3xl font-bold sm:text-4xl">{title}</h2>
            )}
            {description && (
              <p className="mt-4 text-balance text-lg text-muted-foreground">{description}</p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
