import type { ID, ISODate } from "@/types/common";

export const UserRole = {
  Admin: "admin",
  Viewer: "viewer",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface User {
  id: ID;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: ISODate;
}

export interface AppSettings {
  /** Default commission rate applied to new claims (0–1). */
  defaultCommissionRate: number;
  /** Default free hours before detention accrues. */
  defaultFreeHours: number;
  /** Default detention rate per hour ($). */
  defaultRatePerHour: number;
  /** Auto-generate follow-ups when a claim is sent. */
  autoFollowUps: boolean;
  /** Auto-draft replies to inbound broker emails. */
  autoDraftReplies: boolean;
  /** Notify the founder on important events. */
  notifyOnBrokerReply: boolean;
  notifyOnPayment: boolean;
  /** Connected mailbox address for the recovery inbox. */
  connectedMailbox?: string;
  /** Business/company identity used on outbound claims. */
  companyName: string;
  companyEmail: string;
  companyPhone: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultCommissionRate: 0.25,
  defaultFreeHours: 2,
  defaultRatePerHour: 75,
  autoFollowUps: true,
  autoDraftReplies: true,
  notifyOnBrokerReply: true,
  notifyOnPayment: true,
  companyName: "Detention Recover AI",
  companyEmail: "recover@detentionrecover.ai",
  companyPhone: "+18885551234",
};
