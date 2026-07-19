import type { BaseEntity, ID, USD } from "@/types/common";

export const DocumentKind = {
  RateConfirmation: "rate_confirmation",
  Bol: "bol",
  Pod: "pod",
  Invoice: "invoice",
  Email: "email",
  Screenshot: "screenshot",
  Pdf: "pdf",
  Other: "other",
} as const;
export type DocumentKind = (typeof DocumentKind)[keyof typeof DocumentKind];

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  [DocumentKind.RateConfirmation]: "Rate confirmation",
  [DocumentKind.Bol]: "BOL",
  [DocumentKind.Pod]: "POD",
  [DocumentKind.Invoice]: "Invoice",
  [DocumentKind.Email]: "Email",
  [DocumentKind.Screenshot]: "Screenshot",
  [DocumentKind.Pdf]: "PDF",
  [DocumentKind.Other]: "Other",
};

export interface StoredDocument extends BaseEntity {
  kind: DocumentKind;
  name: string;
  /** MIME type. */
  contentType: string;
  sizeBytes: number;
  /** Storage URL (Base44 storage / signed URL). */
  url: string;
  loadId?: ID | null;
  claimId?: ID | null;
  brokerName?: string;
  /** AI-generated one-line summary of the document contents. */
  aiSummary?: string;
  /** For invoices/rate-cons: extracted amount, if any. */
  extractedAmount?: USD | null;
  tags: string[];
}
