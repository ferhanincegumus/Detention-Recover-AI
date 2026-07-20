import { format, formatDistanceToNow, differenceInDays, isValid, parseISO } from "date-fns";

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const USD_CENTS = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NUMBER = new Intl.NumberFormat("en-US");
const PERCENT = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

/** Format a whole-dollar currency value (no cents). */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "$0";
  return USD.format(value);
}

/** Format currency with cents — used for commissions and settlements. */
export function formatCurrencyPrecise(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "$0.00";
  return USD_CENTS.format(value);
}

/** Compact currency for large KPI displays: $1.2M, $850K. */
export function formatCurrencyCompact(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "$0";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return USD.format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "0";
  return NUMBER.format(value);
}

/** Accepts either a 0–1 ratio or a 0–100 value depending on `asRatio`. */
export function formatPercent(value: number | null | undefined, asRatio = false): string {
  if (value == null || Number.isNaN(value)) return "0%";
  return PERCENT.format(asRatio ? value : value / 100);
}

type DateInput = string | number | Date | null | undefined;

function toDate(input: DateInput): Date | null {
  if (input == null) return null;
  const date = typeof input === "string" ? parseISO(input) : new Date(input);
  return isValid(date) ? date : null;
}

export function formatDate(input: DateInput, pattern = "MMM d, yyyy"): string {
  const date = toDate(input);
  return date ? format(date, pattern) : "—";
}

export function formatDateTime(input: DateInput): string {
  const date = toDate(input);
  return date ? format(date, "MMM d, yyyy · h:mm a") : "—";
}

export function formatRelative(input: DateInput): string {
  const date = toDate(input);
  return date ? formatDistanceToNow(date, { addSuffix: true }) : "—";
}

export function daysBetween(a: DateInput, b: DateInput = new Date()): number {
  const dateA = toDate(a);
  const dateB = toDate(b);
  if (!dateA || !dateB) return 0;
  return Math.abs(differenceInDays(dateB, dateA));
}

/** Format hours as "2h 30m". */
export function formatDuration(hours: number | null | undefined): string {
  if (hours == null || Number.isNaN(hours) || hours <= 0) return "0h";
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  if (minutes === 0) return `${whole}h`;
  if (whole === 0) return `${minutes}m`;
  return `${whole}h ${minutes}m`;
}

/** Normalize a US phone number to +1XXXXXXXXXX for storage. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw.startsWith("+") ? raw : `+${digits}`;
}

/** Format a stored phone as (555) 123-4567. */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "").replace(/^1/, "");
  if (digits.length !== 10) return phone;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Initials for avatars: "Acme Logistics" → "AL". */
export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Truncate with an ellipsis. */
export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Human-readable file size: 512 B, 24 KB, 1.4 MB. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
