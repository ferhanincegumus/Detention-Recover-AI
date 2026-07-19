import { z } from "zod";
import { normalizePhone } from "@/lib/format";

/** Shared storage key so the admin app can read landing-page submissions. */
export const PUBLIC_LEADS_STORAGE_KEY = "dra-public-leads";

export const caseLeadSchema = z.object({
  companyName: z.string().trim().min(2, "Enter your company or your name"),
  contactName: z.string().trim().min(2, "Enter a contact name"),
  phone: z
    .string()
    .trim()
    .refine((val) => normalizePhone(val).replace(/\D/g, "").length >= 11, "Enter a valid US phone"),
  email: z.string().trim().email("Enter a valid email"),
  brokerName: z.string().trim().min(2, "Which broker owes you?"),
  loadCount: z.enum(["1", "2-5", "6-20", "20+"]),
  estimatedAmount: z.string().trim().optional(),
  details: z.string().trim().max(1000, "Keep it under 1000 characters").optional(),
});

export type CaseLeadInput = z.infer<typeof caseLeadSchema>;

export interface PublicLeadRecord extends CaseLeadInput {
  id: string;
  submittedAt: string;
  source: "landing";
}

export const LOAD_COUNT_OPTIONS: { value: CaseLeadInput["loadCount"]; label: string }[] = [
  { value: "1", label: "Just one load" },
  { value: "2-5", label: "2–5 loads" },
  { value: "6-20", label: "6–20 loads" },
  { value: "20+", label: "20+ loads" },
];
