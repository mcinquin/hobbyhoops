import { formatSignedMoney, formatSignedPercent } from "@/lib/money";
import { cn } from "@/lib/utils";

interface GainLabelProps {
  cents: number | null;
  ratio?: number | null;
  currency: string | null;
  locale: "fr" | "en";
  className?: string;
}

/** Text color of a gain: green above zero, red below. */
export function gainColorClass(cents: number | null | undefined): string {
  if (cents == null || cents === 0) return "text-muted-foreground";
  return cents > 0 ? "text-emerald-500" : "text-red-500";
}

/** Signed gain amount, with its percentage when known (`—` when unknown). */
export function GainLabel({ cents, ratio, currency, locale, className }: GainLabelProps) {
  const amount = formatSignedMoney(cents, currency, locale);
  if (amount === null) {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }
  const percent = formatSignedPercent(ratio, locale);
  return (
    <span className={cn("tabular-nums", gainColorClass(cents), className)}>
      <span className="whitespace-nowrap">{amount}</span>
      {percent ? (
        <span className="ml-1 whitespace-nowrap text-xs opacity-80">({percent})</span>
      ) : null}
    </span>
  );
}
