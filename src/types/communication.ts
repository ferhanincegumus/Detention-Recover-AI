import type { BaseEntity, Channel, ID, ISODate } from "@/types/common";

export const MessageDirection = {
  Inbound: "inbound",
  Outbound: "outbound",
} as const;
export type MessageDirection = (typeof MessageDirection)[keyof typeof MessageDirection];

/** AI classification of an inbound broker reply. */
export const ReplyClassification = {
  Payment: "payment",
  SettlementOffer: "settlement_offer",
  Denial: "denial",
  RequestDocuments: "request_documents",
  Question: "question",
  Acknowledgement: "acknowledgement",
  OutOfOffice: "out_of_office",
  Other: "other",
} as const;
export type ReplyClassification = (typeof ReplyClassification)[keyof typeof ReplyClassification];

export const REPLY_CLASSIFICATION_LABELS: Record<ReplyClassification, string> = {
  [ReplyClassification.Payment]: "Payment confirmed",
  [ReplyClassification.SettlementOffer]: "Settlement offer",
  [ReplyClassification.Denial]: "Denial",
  [ReplyClassification.RequestDocuments]: "Requesting documents",
  [ReplyClassification.Question]: "Question",
  [ReplyClassification.Acknowledgement]: "Acknowledgement",
  [ReplyClassification.OutOfOffice]: "Out of office",
  [ReplyClassification.Other]: "Other",
};

export interface EmailMessage extends BaseEntity {
  claimId?: ID | null;
  /** Provider message id for idempotency & threading. */
  providerMessageId: string;
  threadId: string;
  direction: MessageDirection;
  from: string;
  to: string;
  subject: string;
  body: string;
  sentAt: ISODate;
  /** For inbound broker replies. */
  classification?: ReplyClassification;
  /** AI-drafted reply awaiting founder review. */
  aiDraftReply?: string;
  read: boolean;
}

export interface SmsMessage extends BaseEntity {
  channel: Channel;
  direction: MessageDirection;
  to: string;
  from: string;
  body: string;
  /** The SMS event type that triggered an outbound message. */
  event?: SmsEvent;
  claimId?: ID | null;
  leadId?: ID | null;
  status: "queued" | "sent" | "delivered" | "failed";
}

/** Milestone events that trigger customer SMS/WhatsApp notifications. */
export const SmsEvent = {
  CaseOpened: "case_opened",
  ClaimSent: "claim_sent",
  BrokerReplied: "broker_replied",
  MissingDocuments: "missing_documents",
  SettlementOffered: "settlement_offered",
  Paid: "paid",
  CaseClosed: "case_closed",
} as const;
export type SmsEvent = (typeof SmsEvent)[keyof typeof SmsEvent];

/** Immutable audit-log entry. */
export const ActivityType = {
  LeadCreated: "lead_created",
  LoadCreated: "load_created",
  ClaimCreated: "claim_created",
  ClaimSent: "claim_sent",
  ClaimStatusChanged: "claim_status_changed",
  BrokerReplied: "broker_replied",
  PaymentReceived: "payment_received",
  FollowUpSent: "follow_up_sent",
  SmsSent: "sms_sent",
  DocumentUploaded: "document_uploaded",
  AiAction: "ai_action",
} as const;
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

export interface Activity extends BaseEntity {
  type: ActivityType;
  title: string;
  description?: string;
  /** Related entity references for deep-linking. */
  claimId?: ID | null;
  loadId?: ID | null;
  leadId?: ID | null;
  brokerId?: ID | null;
  automated: boolean;
}
