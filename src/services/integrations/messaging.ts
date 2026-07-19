import { formatCurrency } from "@/lib/format";
import { SmsEvent } from "@/types/communication";
import type { Channel } from "@/types/common";

/**
 * Customer-facing SMS/WhatsApp templates for each recovery milestone. Pure
 * functions so they are unit-testable and shared between the app and the
 * Base44 Twilio function.
 */

export interface MessageContext {
  companyName: string;
  brokerName: string;
  claimNumber?: string;
  amount?: number;
}

export function buildMilestoneMessage(event: SmsEvent, ctx: MessageContext): string {
  const claim = ctx.claimNumber ? ` (${ctx.claimNumber})` : "";
  switch (event) {
    case SmsEvent.CaseOpened:
      return `${ctx.companyName}: We've opened your case against ${ctx.brokerName}. We'll build the claim and keep you posted — no action needed.`;
    case SmsEvent.ClaimSent:
      return `${ctx.companyName}: Your detention claim${claim} was sent to ${ctx.brokerName}. We'll handle the follow-ups.`;
    case SmsEvent.BrokerReplied:
      return `${ctx.companyName}: ${ctx.brokerName} responded to claim${claim}. We're on it and negotiating.`;
    case SmsEvent.MissingDocuments:
      return `${ctx.companyName}: To strengthen your claim${claim}, we need one more document. Reply here and we'll guide you.`;
    case SmsEvent.SettlementOffered:
      return `${ctx.companyName}: ${ctx.brokerName} offered a settlement on claim${claim}${
        ctx.amount ? ` of ${formatCurrency(ctx.amount)}` : ""
      }. We'll advise and confirm before accepting.`;
    case SmsEvent.Paid:
      return `${ctx.companyName}: Paid! We recovered${ctx.amount ? ` ${formatCurrency(ctx.amount)}` : ""} on claim${claim}. Your payout is on the way. 🎉`;
    case SmsEvent.CaseClosed:
      return `${ctx.companyName}: Your case${claim} is now closed. Thanks for trusting us — send us your next load anytime.`;
    default:
      return `${ctx.companyName}: Update on your recovery${claim}.`;
  }
}

/** Twilio outbound payload shape (used by the Base44 Twilio function). */
export interface TwilioSendPayload {
  to: string;
  from: string;
  body: string;
  channel: Channel;
}

/** WhatsApp requires the `whatsapp:` prefix on both to/from numbers. */
export function toTwilioPayload(params: {
  to: string;
  from: string;
  body: string;
  channel: Channel;
}): TwilioSendPayload {
  const prefix = params.channel === "whatsapp" ? "whatsapp:" : "";
  return {
    to: `${prefix}${params.to}`,
    from: `${prefix}${params.from}`,
    body: params.body,
    channel: params.channel,
  };
}
