import { getDb } from "@/services/backend/store";
import { sleep } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Claim } from "@/types/claim";
import type { Load, ParsedRateConfirmation } from "@/types/load";
import { StopType } from "@/types/load";
import { ChargeType, CHARGE_TYPE_LABELS } from "@/types/common";
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

/** The charge noun used in prose (e.g. "detention", "TONU"). */
function chargeNoun(type: ChargeType): string {
  return type === ChargeType.Tonu ? "TONU" : CHARGE_TYPE_LABELS[type].toLowerCase();
}

/** The evidence a given charge type rests on — used in replies & defense. */
function evidencePhrase(type: ChargeType): string {
  switch (type) {
    case ChargeType.Layover:
      return "the approved overnight layover and the rate confirmation";
    case ChargeType.Tonu:
      return "the rate confirmation's cancellation terms";
    case ChargeType.Accessorial:
      return "the documented accessorial and the rate confirmation";
    case ChargeType.Detention:
    default:
      return "the gate in/out timestamps";
  }
}

export interface ClaimLetterResult {
  subject: string;
  body: string;
}

export const aiApi = {
  /**
   * Parse an uploaded rate confirmation into structured load fields. In mock
   * mode this returns a realistic extraction; in Base44 mode it's an InvokeLLM
   * call with a document-extraction prompt.
   */
  async parseRateConfirmation(fileName: string): Promise<ParsedRateConfirmation> {
    await sleep(1400);
    const settings = getDb().settings;
    const brokers = getDb().brokers;
    const broker = brokers[Math.max(0, fileName.length % brokers.length)];
    return {
      brokerName: broker?.name ?? "Unknown Broker",
      referenceNumber: `LD-${10000 + (fileName.length * 137) % 89999}`,
      freeHours: settings.defaultFreeHours,
      ratePerHour: settings.defaultRatePerHour,
      customerPhone: "+12145550142",
      driverName: "Assigned driver",
      stops: [
        {
          type: StopType.Pickup,
          sequence: 1,
          facilityName: "Origin DC",
          address: "Dallas, TX",
          appointmentAt: undefined,
          arrivedAt: undefined,
          departedAt: undefined,
        },
        {
          type: StopType.Delivery,
          sequence: 2,
          facilityName: "Destination Whse",
          address: "Atlanta, GA",
          appointmentAt: undefined,
          arrivedAt: undefined,
          departedAt: undefined,
        },
      ],
      confidence: 0.92,
      warnings: ["Gate in/out timestamps not found — add them to calculate detention."],
    };
  },

  /** Draft a formal demand letter tuned to the claim's charge type. */
  async writeClaimLetter(claim: Claim, load?: Load): Promise<ClaimLetterResult> {
    await sleep(AI_LATENCY_MS);
    const me = companyIdentity();
    const charge = CHARGE_TYPE_LABELS[claim.chargeType];
    const subject = `${charge} Claim ${claim.claimNumber} — Load ${claim.loadReference} (${formatCurrency(claim.claimedAmount)})`;

    const summary: string[] = [`• Charge type: ${charge}`];
    const detail: string[] = [];
    let grounds: string;

    switch (claim.chargeType) {
      case ChargeType.Layover: {
        const nights = load?.layoverNights ?? "—";
        const rate = load?.layoverNightlyRate ?? 0;
        summary.push(
          `• Layover: ${nights} night(s) × ${formatCurrency(rate)}/night`,
          `• Amount due: ${formatCurrency(claim.claimedAmount)}`,
        );
        detail.push(
          "The driver was held overnight beyond the scheduled service window, requiring a layover. The overnight was communicated and is supported by the rate confirmation.",
        );
        grounds = "Per the rate confirmation and the documented overnight layover, this amount is due and payable.";
        break;
      }
      case ChargeType.Tonu: {
        summary.push(
          "• TONU (Truck Ordered, Not Used): flat fee per rate confirmation",
          `• Amount due: ${formatCurrency(claim.claimedAmount)}`,
        );
        detail.push(
          "Our truck was ordered and dispatched to the pickup as scheduled. The load was subsequently cancelled after dispatch, which under the cancellation terms of the rate confirmation entitles the carrier to the TONU fee.",
        );
        grounds = "Per the cancellation clause of the rate confirmation, this TONU fee is due and payable.";
        break;
      }
      case ChargeType.Accessorial: {
        const desc = load?.accessorialDescription || "documented accessorial";
        summary.push(`• Accessorial: ${desc}`, `• Amount due: ${formatCurrency(claim.claimedAmount)}`);
        detail.push(
          `This accessorial (${desc}) was incurred in the performance of load ${claim.loadReference} and is reimbursable under the rate confirmation.`,
        );
        grounds = "Per the terms of the rate confirmation, this accessorial is due and payable.";
        break;
      }
      case ChargeType.Detention:
      default: {
        const pickup = load?.stops.find((s) => s.type === "pickup");
        const delivery = load?.stops.find((s) => s.type === "delivery");
        summary.push(
          `• Billable detention: ${load?.billableDetentionHours ?? "—"} hours beyond ${load?.freeHours ?? 2} hours free time`,
          `• Rate: ${formatCurrency(load?.ratePerHour ?? 0)}/hour`,
          `• Amount due: ${formatCurrency(claim.claimedAmount)}`,
        );
        detail.push(
          "Facility timeline:",
          pickup
            ? `• Pickup (${pickup.facilityName ?? pickup.address}): arrived ${formatDate(pickup.arrivedAt, "MMM d, h:mm a")}, released ${formatDate(pickup.departedAt, "MMM d, h:mm a")}`
            : "• Pickup timestamps attached",
          delivery
            ? `• Delivery (${delivery.facilityName ?? delivery.address}): arrived ${formatDate(delivery.arrivedAt, "MMM d, h:mm a")}, released ${formatDate(delivery.departedAt, "MMM d, h:mm a")}`
            : "• Delivery timestamps attached",
        );
        grounds = "Per the terms of the rate confirmation, this detention is due and payable.";
      }
    }

    const body = [
      `To the Accounts Payable / Claims Team at ${claim.brokerName},`,
      "",
      `We are submitting a formal ${chargeNoun(claim.chargeType)} claim on behalf of ${claim.customerName ?? "our carrier"} for load ${claim.loadReference}.`,
      "",
      "Summary of charges:",
      ...summary,
      "",
      ...detail,
      "",
      `Supporting documentation is attached. ${grounds}`,
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
    const noun = chargeNoun(claim.chargeType);
    const evidence = evidencePhrase(claim.chargeType);

    const opener: Record<ReplyClassification, string> = {
      [ReplyClassification.SettlementOffer]: `Thank you for the offer. We appreciate ${claim.brokerName} working with us to resolve claim ${claim.claimNumber}.`,
      [ReplyClassification.Denial]: `Thank you for your response. We'd like to revisit the denial on claim ${claim.claimNumber}, as the documentation supports the ${noun} charge.`,
      [ReplyClassification.RequestDocuments]: `Happy to help. Attached are the requested documents for claim ${claim.claimNumber}.`,
      [ReplyClassification.Question]: `Thanks for reaching out regarding claim ${claim.claimNumber} — here's the detail you asked for.`,
      [ReplyClassification.Acknowledgement]: `Thank you for the acknowledgement on claim ${claim.claimNumber}. We're standing by for the next step.`,
      [ReplyClassification.Payment]: `Thank you — we've noted the payment on claim ${claim.claimNumber} and will reconcile on our end.`,
      [ReplyClassification.OutOfOffice]: `Thank you — we'll follow up with the appropriate contact regarding claim ${claim.claimNumber}.`,
      [ReplyClassification.Other]: `Thank you for your reply regarding claim ${claim.claimNumber}.`,
    };

    const middle: Record<ReplyClassification, string> = {
      [ReplyClassification.SettlementOffer]: `The claimed amount of ${formatCurrency(claim.claimedAmount)} reflects the ${noun} supported by ${evidence}. We can accept a prompt settlement at ${formatCurrency(Math.round(claim.claimedAmount * 0.9))} to close this out this week.`,
      [ReplyClassification.Denial]: `${evidence.charAt(0).toUpperCase()}${evidence.slice(1)} support the ${noun} charge. We'd ask you to reconsider based on the attached evidence.`,
      [ReplyClassification.RequestDocuments]: `Please let us know if anything else is needed to process payment of ${formatCurrency(claim.claimedAmount)}.`,
      [ReplyClassification.Question]: `The ${noun} totals ${formatCurrency(claim.claimedAmount)}, supported by ${evidence}. Let me know if you'd like the full breakdown.`,
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

    // Type-specific strengths.
    const typeStrengths: Record<ChargeType, (string | null)[]> = {
      [ChargeType.Detention]: [
        load?.documents.hasTimestamps ? "Gate in/out timestamps establish detention beyond free time." : null,
        load?.documents.hasPod ? "POD confirms delivery completion." : null,
      ],
      [ChargeType.Layover]: [
        "The overnight layover is documented and supported by the rate confirmation.",
        load?.documents.hasPod ? "POD confirms the delayed delivery." : null,
      ],
      [ChargeType.Tonu]: [
        "The rate confirmation's cancellation terms support the TONU fee (truck ordered, dispatched, load cancelled).",
      ],
      [ChargeType.Accessorial]: [
        `The accessorial (${load?.accessorialDescription || "as documented"}) is supported by the rate confirmation.`,
      ],
    };

    const strengths = [
      load?.documents.hasRateConfirmation ? "Rate confirmation on file establishes the agreed terms." : null,
      ...typeStrengths[claim.chargeType],
      load?.documents.hasBol && claim.chargeType !== ChargeType.Tonu ? "BOL confirms the shipment." : null,
      claim.claimedAmount > 0
        ? `Claim amount (${formatCurrency(claim.claimedAmount)}) is supported by ${load?.chargeBasis ?? "the documented charge"}.`
        : null,
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
