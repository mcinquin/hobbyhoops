import { cn } from "@/lib/utils";
import type { ShipmentProtectionInfo } from "@/lib/shipment-utils";
import { AlertTriangle } from "lucide-react";

interface ProtectionBarProps {
  protection: ShipmentProtectionInfo;
  labels: {
    title: string;
    awaitingDelivery?: string;
    daysRemaining: string;
    daysRemainingOne: string;
    expired: string;
    critical: string;
    warning: string;
  };
}

export function ProtectionBar({ protection, labels }: ProtectionBarProps) {
  if (!protection.isActive) return null;

  if (protection.phase === "awaiting_delivery" && labels.awaitingDelivery) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {labels.title}
        </p>
        <p className="mt-1 text-sm text-foreground">{labels.awaitingDelivery}</p>
      </div>
    );
  }

  const barColor =
    protection.urgency === "critical" || protection.urgency === "expired"
      ? "bg-red-500"
      : protection.urgency === "warning"
        ? "bg-amber-500"
        : "bg-emerald-500";

  const message =
    protection.urgency === "expired"
      ? labels.expired
      : protection.urgency === "critical"
        ? labels.critical
        : protection.urgency === "warning"
          ? labels.warning
          : protection.daysRemaining === 1
            ? labels.daysRemainingOne
            : labels.daysRemaining;

  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        protection.urgency === "critical" || protection.urgency === "expired"
          ? "border-red-500/40 bg-red-500/5"
          : protection.urgency === "warning"
            ? "border-amber-500/40 bg-amber-500/5"
            : "border-border bg-muted/30"
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {labels.title}
          </p>
          <p
            className={cn(
              "mt-1 text-sm font-medium",
              protection.urgency === "critical" || protection.urgency === "expired"
                ? "text-red-600 dark:text-red-400"
                : protection.urgency === "warning"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-foreground"
            )}
          >
            {message}
          </p>
        </div>
        {(protection.urgency === "critical" ||
          protection.urgency === "expired" ||
          protection.urgency === "warning") && (
          <AlertTriangle
            className={cn(
              "h-4 w-4 shrink-0",
              protection.urgency === "critical" || protection.urgency === "expired"
                ? "text-red-500"
                : "text-amber-500"
            )}
            aria-hidden
          />
        )}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${protection.progressPercent}%` }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={protection.totalDays}
          aria-valuenow={protection.daysElapsed}
          aria-label={labels.title}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        {protection.daysElapsed} / {protection.totalDays}
      </p>
    </div>
  );
}
