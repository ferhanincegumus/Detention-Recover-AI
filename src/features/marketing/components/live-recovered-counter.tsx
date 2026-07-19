import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/format";
import { RECOVERED_DAILY_DRIFT, RECOVERED_TO_DATE } from "@/features/marketing/constants";

/**
 * A "live" recovered-to-date figure. Seeds from a constant and drifts upward
 * deterministically over the session so it feels active without a backend call.
 */
export function LiveRecoveredCounter({ className }: { className?: string }) {
  const [total, setTotal] = useState(RECOVERED_TO_DATE);

  useEffect(() => {
    const interval = setInterval(() => {
      // Small, bounded, upward-only increments.
      setTotal((prev) => prev + Math.round((RECOVERED_DAILY_DRIFT / 288) * (1 + (prev % 3))));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className={className}>
      <span className="tabular font-mono font-semibold text-success">{formatCurrency(total)}</span>
    </span>
  );
}
