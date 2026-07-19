import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CLAIM_STATUS_META, type ClaimStatus } from "@/types/claim";
import { LEAD_STATUS_META, type LeadStatus } from "@/types/lead";
import { FOLLOWUP_STATUS_META, type FollowUpStatus } from "@/types/followup";
import { riskFromScore, type RiskLevel } from "@/types/common";

type Tone = "muted" | "primary" | "success" | "destructive" | "warning";

const TONE_TO_VARIANT: Record<Tone, BadgeProps["variant"]> = {
  muted: "muted",
  primary: "primary",
  success: "success",
  destructive: "destructive",
  warning: "warning",
};

const TONE_DOT: Record<Tone, string> = {
  muted: "bg-muted-foreground",
  primary: "bg-primary",
  success: "bg-success",
  destructive: "bg-destructive",
  warning: "bg-amber-400",
};

function ToneBadge({ tone, label, dot = true }: { tone: Tone; label: string; dot?: boolean }) {
  return (
    <Badge variant={TONE_TO_VARIANT[tone]}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", TONE_DOT[tone])} aria-hidden />}
      {label}
    </Badge>
  );
}

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  const meta = CLAIM_STATUS_META[status];
  return <ToneBadge tone={meta.tone} label={meta.label} />;
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const meta = LEAD_STATUS_META[status];
  return <ToneBadge tone={meta.tone} label={meta.label} />;
}

export function FollowUpStatusBadge({ status }: { status: FollowUpStatus }) {
  const meta = FOLLOWUP_STATUS_META[status];
  return <ToneBadge tone={meta.tone} label={meta.label} />;
}

const RISK_META: Record<RiskLevel, { tone: Tone; label: string }> = {
  low: { tone: "success", label: "Low risk" },
  medium: { tone: "warning", label: "Medium risk" },
  high: { tone: "destructive", label: "High risk" },
};

export function RiskBadge({ level, score }: { level?: RiskLevel; score?: number }) {
  const resolved = level ?? (score != null ? riskFromScore(score) : "medium");
  const meta = RISK_META[resolved];
  return <ToneBadge tone={meta.tone} label={score != null ? `${meta.label} · ${score}` : meta.label} />;
}
