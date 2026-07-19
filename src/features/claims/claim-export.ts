import { formatCurrency, formatDate } from "@/lib/format";
import { CLAIM_STATUS_META } from "@/types/claim";
import type { Claim } from "@/types/claim";

/**
 * Export a claim as a printable PDF via the browser print dialog. Opens a
 * self-contained, styled document the founder can "Save as PDF".
 */
export function exportClaimPdf(claim: Claim): void {
  const win = window.open("", "_blank", "width=800,height=1000");
  if (!win) return;

  const rows = [
    ["Claim number", claim.claimNumber],
    ["Load reference", claim.loadReference],
    ["Broker", claim.brokerName],
    ["Carrier", claim.customerName ?? "—"],
    ["Status", CLAIM_STATUS_META[claim.status].label],
    ["Claimed amount", formatCurrency(claim.claimedAmount)],
    ["Recovered", formatCurrency(claim.recoveredAmount)],
    ["Commission", formatCurrency(claim.commissionAmount)],
    ["Carrier payout", formatCurrency(claim.carrierPayout)],
    ["Sent", formatDate(claim.sentAt)],
    ["Paid", formatDate(claim.paidAt)],
  ];

  win.document.write(`<!doctype html><html><head><meta charset="utf-8" />
    <title>${claim.claimNumber} — Detention Claim</title>
    <style>
      body { font-family: Inter, system-ui, sans-serif; color: #1c1f26; padding: 48px; max-width: 720px; margin: 0 auto; }
      h1 { font-size: 22px; margin: 0 0 4px; }
      .sub { color: #647082; margin: 0 0 28px; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
      td { padding: 8px 0; border-bottom: 1px solid #eceef1; font-size: 14px; }
      td:first-child { color: #647082; }
      td:last-child { text-align: right; font-weight: 600; }
      pre { white-space: pre-wrap; font-family: inherit; font-size: 13px; line-height: 1.6; background: #f6f7f8; padding: 20px; border-radius: 10px; }
      .brand { color: #b45309; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; font-size: 11px; }
    </style></head><body>
    <p class="brand">Detention Recover AI</p>
    <h1>Detention Claim ${claim.claimNumber}</h1>
    <p class="sub">Generated ${formatDate(new Date())} · No Recovery, No Fee</p>
    <table>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("")}</table>
    ${claim.claimLetter ? `<h1 style="font-size:16px">Demand letter</h1><pre>${claim.claimLetter.replace(/</g, "&lt;")}</pre>` : ""}
    </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}
