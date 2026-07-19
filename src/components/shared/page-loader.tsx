import { Loader2 } from "lucide-react";

/** Full-viewport suspense fallback for lazily-loaded routes. */
export function PageLoader() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center" role="status" aria-live="polite">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
