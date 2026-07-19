import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("shimmer rounded-md bg-muted/60", className)}
      aria-hidden
      {...props}
    />
  );
}

export { Skeleton };
