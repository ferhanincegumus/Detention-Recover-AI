import { differenceInMinutes, parseISO } from "date-fns";
import type { Load, LoadStop } from "@/types/load";
import { ChargeType, type USD } from "@/types/common";
import { requiredDocsFor } from "@/services/domain/charges";

/** Detained hours at a single stop, beyond the load's free time. */
export function stopDetentionHours(stop: LoadStop, freeHours: number): number {
  if (!stop.arrivedAt || !stop.departedAt) return 0;
  const minutes = differenceInMinutes(parseISO(stop.departedAt), parseISO(stop.arrivedAt));
  if (minutes <= 0) return 0;
  const hours = minutes / 60;
  return Math.max(0, hours - freeHours);
}

export interface DetentionResult {
  billableHours: number;
  amount: USD;
  perStop: { stopId: string; hours: number; amount: USD }[];
}

/**
 * Calculate total billable detention for a load. Free time is applied per stop,
 * matching how brokers assess detention at each facility.
 */
export function calculateDetention(
  stops: LoadStop[],
  freeHours: number,
  ratePerHour: USD,
): DetentionResult {
  const perStop = stops.map((stop) => {
    const hours = stopDetentionHours(stop, freeHours);
    return { stopId: stop.id, hours, amount: Math.round(hours * ratePerHour) };
  });
  const billableHours = perStop.reduce((sum, s) => sum + s.hours, 0);
  const amount = Math.round(billableHours * ratePerHour);
  return { billableHours: Number(billableHours.toFixed(2)), amount, perStop };
}

/**
 * Which supporting documents are still missing for a defensible claim. The
 * required evidence depends on the charge type (e.g. TONU needs the rate
 * confirmation's cancellation terms, not gate timestamps).
 */
export function detectMissingDocuments(
  load: Pick<Load, "documents" | "stops">,
  chargeType: ChargeType = ChargeType.Detention,
): string[] {
  const { needsTimestamps, needsPod } = requiredDocsFor(chargeType);
  const missing: string[] = [];
  if (!load.documents.hasRateConfirmation) missing.push("Rate confirmation");
  // BOL proves a shipment moved — irrelevant for TONU (cancelled) & accessorials.
  const needsBol = chargeType === ChargeType.Detention || chargeType === ChargeType.Layover;
  if (needsBol && !load.documents.hasBol) missing.push("Bill of lading (BOL)");
  if (needsPod && !load.documents.hasPod) missing.push("Proof of delivery (POD)");
  if (needsTimestamps) {
    const missingTimestamps = load.stops.some((s) => !s.arrivedAt || !s.departedAt);
    if (!load.documents.hasTimestamps || missingTimestamps) {
      missing.push("Gate in/out timestamps");
    }
  }
  return missing;
}
