import { ChargeType } from "@/types/common";
import type { USD } from "@/types/common";

/**
 * Charge-amount calculation per charge type. Each type is billed differently:
 *  - Detention   → billable hours × hourly rate (computed upstream from stops)
 *  - Layover     → nights × nightly rate
 *  - TONU        → a single flat fee (truck ordered, not used)
 *  - Accessorial → a single stated amount
 */
export interface ChargeInputs {
  chargeType: ChargeType;
  /** Detention amount precomputed from stop timestamps. */
  detentionAmount?: USD;
  layoverNights?: number;
  layoverNightlyRate?: USD;
  tonuAmount?: USD;
  accessorialAmount?: USD;
}

export interface ChargeResult {
  amount: USD;
  /** Human-readable basis, e.g. "2 nights × $150/night". */
  basis: string;
}

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export function calculateChargeAmount(inputs: ChargeInputs): ChargeResult {
  switch (inputs.chargeType) {
    case ChargeType.Layover: {
      const nights = Math.max(0, Math.round(inputs.layoverNights ?? 0));
      const rate = Math.max(0, inputs.layoverNightlyRate ?? 0);
      return {
        amount: Math.round(nights * rate),
        basis: `${nights} night${nights === 1 ? "" : "s"} × ${money(rate)}/night`,
      };
    }
    case ChargeType.Tonu: {
      const amount = Math.max(0, Math.round(inputs.tonuAmount ?? 0));
      return { amount, basis: "Flat TONU fee per rate confirmation" };
    }
    case ChargeType.Accessorial: {
      const amount = Math.max(0, Math.round(inputs.accessorialAmount ?? 0));
      return { amount, basis: "Accessorial charge" };
    }
    case ChargeType.Detention:
    default: {
      const amount = Math.max(0, Math.round(inputs.detentionAmount ?? 0));
      return { amount, basis: "Billable detention hours × hourly rate" };
    }
  }
}

/** Which supporting documents matter for a given charge type. */
export function requiredDocsFor(chargeType: ChargeType): {
  needsTimestamps: boolean;
  needsPod: boolean;
} {
  switch (chargeType) {
    case ChargeType.Tonu:
      // TONU is proven by the rate confirmation's cancellation terms, not dwell.
      return { needsTimestamps: false, needsPod: false };
    case ChargeType.Layover:
      return { needsTimestamps: false, needsPod: true };
    case ChargeType.Accessorial:
      return { needsTimestamps: false, needsPod: false };
    case ChargeType.Detention:
    default:
      return { needsTimestamps: true, needsPod: true };
  }
}
