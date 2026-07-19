import { getDb } from "@/services/backend/store";
import { sleep } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Claim } from "@/types/claim";
import type { Load } from "@/types/load";
import { CHARGE_TYPE_LABELS } from "@/types/common";
import { ReplyClassification, REPLY_CLASSIFICATION_LABELS } from "@/types/communication";

/**
 * AI content service. In mock mode these produce realistic, well-structured
 * drafts deterministically. In Base44 mode each maps to an InvokeLLM call with
 * the same input/output contract — see docs/base44/functions.md.
 */

const AI_LATENCY_MS = 900;

function companyIdentity() {
  const s = getDb().settings;
  return { name: s.companyName, email: s.companyEmail, phone: s.companyPhone };
}

export interface ClaimLetterResult {
  subject: string;
  body: string;
}

export const aiApi = {
  /** Draft a formal detention demand letter from a claim + its load. */
  async writeClaimLetter(claim: Claim, load?: Load): Promise<ClaimLetterResult> {
    await sleep(AI_LATENCY_MS);
    const me = companyIdentity();
    const charge = CHARGE_TYPE_LABELS[claim.chargeType];
    const pickup = load?.stops.find((s) => s.type === "pickup");
    const delivery = load?.stops.find((s) => s.type === "delivery");

    const subject = `${charge} Claim ${claim.claimNumber} — Load ${claim.loadReference} (${formatCurrency(claim.claimedAmount)})`;
    const body = [
      `To the Accounts Payable / Claims Team at ${claim.brokerName},`,
      "",
      `We are submitting a formal ${charge.toLowerCase()} claim on behalf of ${claim.customerName ?? "our carrier"} for load ${claim.loadReference}.`,
      "",
      "Summary of charges:",
      `• Charge type: ${charge}`,
      `• Billable detention: ${load?.billableDetentionHours ?? "—"} hours beyond ${load?.freeHours ?? 2} hours free time`,
      `• Rate: ${formatCurrency(load?.ratePerHour ?? 0)}/hour`,
      `• Amount due: ${formatCurrency(claim.claimedAmount)}`,
      "",
      "Facility timeline:",
      pickup
        ? `• Pickup (${pickup.facilityName ?? pickup.address}): arrived ${formatDate(pickup.arrivedAt, "MMM d, h:mm a")}, released ${formatDate(pickup.departedAt, "MMM d, h:mm a")}`
        : "• Pickup timestamps attached",
      delivery
        ? `• Delivery (${delivery.facilityName ?? delivery.address}): arrived ${formatDate(delivery.arrivedAt, "MMM d, h:mm a")}, released ${formatDate(delivery.departedAt, "MMM d, h:mm a")}`
        : "• Delivery timestamps attached",
      "",
      "Supporting documentation (rate confirmation, BOL, POD, and gate timestamps) is attached. Per the terms of the rate confirmation, this detention is due and payable.",
      "",
      `Please remit ${formatCurrency(claim.claimedAmount)} within 15 days, or advise if you require anything further to process payment. We're happy to resolve this quickly and professionally.`,
      "",
      "Regards,",
      me.name,
      `${me.email} · ${me.phone}`,
    ].join("\n");

    return { subject, body };
  },

  /** Draft a reply to an inbound broker message, tuned to its classification. */
  async generateReply(claim: Claim, incomingBody: string, classification?: ReplyClassification): Promise<string> {
    await sleep(AI_LATENCY_MS);
    const me = companyIdentity();
    const cls = classification ?? ReplyClassification.Other;

    const opener: Record<ReplyClassification, string> = {
      [ReplyClassification.SettlementOffer]: `Thank you for the offer. We appreciate ${claim.brokerName} working with us to resolve claim ${claim.claimNumber}.`,
      [ReplyClassification.Denial]: `Thank you for your response. We'd like to revisit the denial on claim ${claim.claimNumber}, as the documentation supports the detention charge.`,
      [ReplyClassification.RequestDocuments]: `Happy to help. Attached are the requested documents for claim ${claim.claimNumber}.`,
      [ReplyClassification.Question]: `Thanks for reaching out regarding claim ${claim.claimNumber} — here's the detail you asked for.`,
      [ReplyClassification.Acknowledgement]: `Thank you for the acknowledgement on claim ${claim.claimNumber}. We're standing by for the next step.`,
      [ReplyClassification.Payment]: `Thank you — we've noted the payment on claim ${claim.claimNumber} and will reconcile on our end.`,
      [ReplyClassification.OutOfOffice]: `Thank you — we'll follow up with the appropriate contact regarding claim ${claim.claimNumber}.`,
      [ReplyClassification.Other]: `Thank you for your reply regarding claim ${claim.claimNumber}.`,
    };

    const middle: Record<ReplyClassification, string> = {
      [ReplyClassification.SettlementOffer]: `The claimed amount of ${formatCurrency(claim.claimedAmount)} reflects verified detention with gate timestamps. We can accept a prompt settlement at ${formatCurrency(Math.round(claim.claimedAmount * 0.9))} to close this out this week.`,
      [ReplyClassification.Denial]: `The gate in/out timestamps and POD confirm the driver was detained beyond free time. We'd ask you to reconsider based on the attached evidence.`,
      [ReplyClassification.RequestDocuments]: `Please let us know if anything else is needed to process payment of ${formatCurrency(claim.claimedAmount)}.`,
      [ReplyClassification.Question]: `The detention totals ${formatCurrency(claim.claimedAmount)} based on the documented facility times. Let me know if you'd like a breakdown by stop.`,
      [ReplyClassification.Acknowledgement]: `Please confirm an expected payment date for the ${formatCurrency(claim.claimedAmount)} due.`,
      [ReplyClassification.Payment]: `Please share remittance details when available so we can match it to ${claim.claimNumber}.`,
      [ReplyClassification.OutOfOffice]: `We'll circle back shortly. The ${formatCurrency(claim.claimedAmount)} remains outstanding on ${claim.claimNumber}.`,
      [ReplyClassification.Other]: `We're happy to provide any additional detail needed to process the ${formatCurrency(claim.claimedAmount)} due.`,
    };

    void incomingBody;
    return [opener[cls], "", middle[cls], "", "Best regards,", me.name, `${me.email} · ${me.phone}`].join("\n");
  },

  /** Classify an inbound broker email. */
  async classifyReply(body: string): Promise<{ classification: ReplyClassification; label: string }> {
    await sleep(400);
    const text = body.toLowerCase();
    let classification: ReplyClassification = ReplyClassification.Other;
    if (/(paid|payment|remit|check|ach)/.test(text)) classification = ReplyClassification.Payment;
    else if (/(offer|settle|percent|%|reduce)/.test(text)) classification = ReplyClassification.SettlementOffer;
    else if (/(deny|denied|not (owed|liable)|reject)/.test(text)) classification = ReplyClassification.Denial;
    else if (/(send|attach|provide|need).*(bol|pod|document|timestamp)/.test(text))
      classification = ReplyClassification.RequestDocuments;
    else if (/\?/.test(text)) classification = ReplyClassification.Question;
    else if (/(received|acknowledge|reviewing)/.test(text)) classification = ReplyClassification.Acknowledgement;
    else if (/(out of office|ooo|on vacation)/.test(text)) classification = ReplyClassification.OutOfOffice;
    return { classification, label: REPLY_CLASSIFICATION_LABELS[classification] };
  },

  /** Produce a defensibility report highlighting strengths and gaps. */
  async defenseReport(claim: Claim, load?: Load): Promise<string> {
    await sleep(AI_LATENCY_MS);
    const gaps = load?.missingDocuments ?? [];
    const strengths = [
      load?.documents.hasTimestamps ? "Gate in/out timestamps establish detention beyond free time." : null,
      load?.documents.hasBol ? "BOL confirms the shipment and consignee." : null,
      load?.documents.hasPod ? "POD confirms delivery completion." : null,
      claim.claimedAmount > 0 ? `Claim amount (${formatCurrency(claim.claimedAmount)}) is supported by documented hours × rate.` : null,
    ].filter(Boolean) as string[];

    return [
      `Defensibility report — ${claim.claimNumber}`,
      "",
      `Recovery probability: ${claim.recoveryProbability}%`,
      "",
      "Strengths:",
      ...strengths.map((s) => `• ${s}`),
      "",
      gaps.length ? "Gaps to close:" : "No evidence gaps detected.",
      ...gaps.map((g) => `• Missing: ${g}`),
      "",
      gaps.length
        ? "Recommendation: collect the missing items above before escalating; they materially raise recovery odds."
        : "Recommendation: this claim is well-documented and ready to pursue firmly.",
    ].join("\n");
  },
};
