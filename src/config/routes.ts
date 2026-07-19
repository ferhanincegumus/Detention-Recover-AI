/** Canonical route paths — the single source of truth for navigation. */
export const routes = {
  // Public
  home: "/",
  caseForm: "/get-started",

  // Auth
  login: "/login",
  register: "/register",
  magicLink: "/magic-link",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",

  // Admin (protected)
  dashboard: "/app",
  loads: "/app/loads",
  loadDetail: (id = ":loadId") => `/app/loads/${id}`,
  claims: "/app/claims",
  claimDetail: (id = ":claimId") => `/app/claims/${id}`,
  leads: "/app/leads",
  leadDetail: (id = ":leadId") => `/app/leads/${id}`,
  inbox: "/app/inbox",
  brokers: "/app/brokers",
  brokerDetail: (id = ":brokerId") => `/app/brokers/${id}`,
  followups: "/app/followups",
  documents: "/app/documents",
  analytics: "/app/analytics",
  settings: "/app/settings",
  profile: "/app/profile",
} as const;

export type RoutePath = string;
