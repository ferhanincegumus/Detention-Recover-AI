import {
  LayoutDashboard,
  Truck,
  FileText,
  Inbox,
  Users,
  Building2,
  BellRing,
  FolderOpen,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { routes } from "@/config/routes";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Match nested detail routes (e.g. /app/claims/:id) as active. */
  matchPrefix?: string;
  /** Optional badge key resolved from dashboard stats. */
  badgeKey?: "pendingReplies" | "upcomingFollowups" | "needsAttention";
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [{ label: "Dashboard", to: routes.dashboard, icon: LayoutDashboard }],
  },
  {
    title: "Recovery",
    items: [
      { label: "Loads", to: routes.loads, icon: Truck, matchPrefix: routes.loads },
      { label: "Claims", to: routes.claims, icon: FileText, matchPrefix: routes.claims },
      { label: "Case Leads", to: routes.leads, icon: Users, matchPrefix: routes.leads },
      { label: "Recovery Inbox", to: routes.inbox, icon: Inbox, badgeKey: "pendingReplies" },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { label: "Broker Intel", to: routes.brokers, icon: Building2, matchPrefix: routes.brokers },
      { label: "Follow-ups", to: routes.followups, icon: BellRing, badgeKey: "upcomingFollowups" },
      { label: "Documents", to: routes.documents, icon: FolderOpen },
      { label: "Analytics", to: routes.analytics, icon: BarChart3 },
    ],
  },
  {
    title: "Workspace",
    items: [{ label: "Settings", to: routes.settings, icon: Settings, matchPrefix: routes.settings }],
  },
];
