import { useMemo, useState } from "react";
import { Clock, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import { clamp } from "@/lib/utils";
import { DETENTION } from "@/features/marketing/constants";

/**
 * Interactive recovery estimate. Pure client-side math — mirrors the same
 * detention economics the admin app uses so the marketing number is honest.
 */
export function RecoveryCalculator({ className }: { className?: string }) {
  const [loadsPerMonth, setLoadsPerMonth] = useState(20);
  const [detainedHours, setDetainedHours] = useState(3);
  const [ratePerHour, setRatePerHour] = useState<number>(DETENTION.DEFAULT_RATE_PER_HOUR);

  const estimate = useMemo(() => {
    const billableHours = Math.max(0, detainedHours - DETENTION.FREE_HOURS);
    const perLoad = billableHours * ratePerHour;
    const monthlyBilled = perLoad * loadsPerMonth;
    // Share historically lost without pursuit, times our recovery success rate.
    const monthlyRecoverable =
      monthlyBilled * DETENTION.UNPAID_RATE * DETENTION.RECOVERY_SUCCESS_RATE;
    return {
      perLoad,
      monthly: monthlyRecoverable,
      annual: monthlyRecoverable * 12,
    };
  }, [loadsPerMonth, detainedHours, ratePerHour]);

  return (
    <Card className={className}>
      <CardContent className="space-y-6 p-6">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="h-4 w-4 text-primary" />
          Estimate your recovery
        </div>

        <div className="space-y-5">
          <CalculatorSlider
            id="loads"
            label="Loads per month"
            value={loadsPerMonth}
            min={1}
            max={120}
            onChange={setLoadsPerMonth}
            format={(v) => `${v} loads`}
          />
          <CalculatorSlider
            id="hours"
            label="Avg. hours detained per load"
            value={detainedHours}
            min={0}
            max={12}
            step={0.5}
            onChange={setDetainedHours}
            format={(v) => `${v}h`}
            hint={`First ${DETENTION.FREE_HOURS}h are free time`}
          />
          <CalculatorSlider
            id="rate"
            label="Detention rate per hour"
            value={ratePerHour}
            min={25}
            max={150}
            step={5}
            onChange={setRatePerHour}
            format={(v) => formatCurrency(v)}
          />
        </div>

        <div className="rounded-xl border border-success/30 bg-success/10 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Estimated annual recovery
              </p>
              <p className="tabular font-display text-3xl font-bold text-success">
                {formatCurrency(estimate.annual)}
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p className="flex items-center justify-end gap-1">
                <Clock className="h-3 w-3" />
                {formatCurrency(estimate.monthly)}/mo
              </p>
              <p>{formatCurrency(estimate.perLoad)}/load</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  hint?: string;
}

function CalculatorSlider({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  hint,
}: SliderProps) {
  const pct = clamp(((value - min) / (max - min)) * 100, 0, 100);
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={id}>{label}</Label>
        <span className="tabular font-mono text-sm font-semibold text-primary">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={format(value)}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-glow [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary"
        style={{
          background: `linear-gradient(to right, hsl(var(--primary)) ${pct}%, hsl(var(--muted)) ${pct}%)`,
        }}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
