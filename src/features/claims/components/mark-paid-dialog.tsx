import { useState } from "react";
import { CircleDollarSign } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatCurrencyPrecise } from "@/lib/format";
import { calculateCommission } from "@/services/domain/commission";
import { useMarkClaimPaid } from "@/services/hooks/use-claims";
import type { Claim } from "@/types/claim";

export function MarkPaidDialog({
  open,
  onOpenChange,
  claim,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claim: Claim;
}) {
  const [amount, setAmount] = useState(claim.settlementOffer ?? claim.claimedAmount);
  const markPaid = useMarkClaimPaid();
  const breakdown = calculateCommission(Number(amount) || 0, claim.commissionRate);

  const submit = async () => {
    try {
      await markPaid.mutateAsync({ id: claim.id, amount: Number(amount) });
      toast.success("Marked as paid", `${formatCurrency(Number(amount))} recovered.`);
      onOpenChange(false);
    } catch {
      toast.error("Could not mark paid");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5 text-success" /> Record payment
          </DialogTitle>
          <DialogDescription>
            Enter the recovered amount for {claim.claimNumber}. Commission and carrier payout are calculated automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recovered-amount">Recovered amount</Label>
            <Input
              id="recovered-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={0}
            />
          </div>
          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <Row label={`Commission (${Math.round(claim.commissionRate * 100)}%)`} value={formatCurrencyPrecise(breakdown.commissionAmount)} />
            <Row label="Carrier payout" value={formatCurrencyPrecise(breakdown.carrierPayout)} strong />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="success" onClick={submit} loading={markPaid.isPending}>Mark paid</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "tabular font-semibold text-success" : "tabular font-medium"}>{value}</span>
    </div>
  );
}
