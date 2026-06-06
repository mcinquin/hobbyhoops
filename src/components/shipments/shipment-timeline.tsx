import { cn } from "@/lib/utils";
import { timelineStepIndex } from "@/lib/shipment-utils";
import type { ShipmentStatus } from "@/lib/types";
import { Check, Circle } from "lucide-react";

interface ShipmentTimelineProps {
  status: ShipmentStatus;
  labels: {
    pending: string;
    shipped: string;
    inTransit: string;
    delivered: string;
    dispute: string;
  };
}

const STEPS: ShipmentStatus[] = [
  "pending",
  "shipped",
  "in_transit",
  "delivered",
];

export function ShipmentTimeline({ status, labels }: ShipmentTimelineProps) {
  const activeIndex = timelineStepIndex(status);
  const isDispute = status === "dispute";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-1">
        {STEPS.map((step, index) => {
          const isComplete = index < activeIndex || status === "received";
          const isCurrent =
            index === activeIndex && status !== "received" && !isDispute;
          const label =
            step === "pending"
              ? labels.pending
              : step === "shipped"
                ? labels.shipped
                : step === "in_transit"
                  ? labels.inTransit
                  : labels.delivered;

          return (
            <div key={step} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div className="flex w-full items-center">
                {index > 0 ? (
                  <div
                    className={cn(
                      "h-0.5 flex-1",
                      isComplete || isCurrent ? "bg-amber-500" : "bg-border"
                    )}
                  />
                ) : (
                  <div className="flex-1" />
                )}
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                    isComplete
                      ? "border-amber-500 bg-amber-500 text-white"
                      : isCurrent
                        ? "border-amber-500 bg-amber-500/15 text-amber-500"
                        : "border-border bg-card text-muted-foreground"
                  )}
                >
                  {isComplete ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  ) : (
                    <Circle className="h-2 w-2 fill-current" />
                  )}
                </div>
                {index < STEPS.length - 1 ? (
                  <div
                    className={cn(
                      "h-0.5 flex-1",
                      index < activeIndex ? "bg-amber-500" : "bg-border"
                    )}
                  />
                ) : (
                  <div className="flex-1" />
                )}
              </div>
              <span
                className={cn(
                  "max-w-full truncate px-0.5 text-center text-[10px] leading-tight",
                  isComplete || isCurrent
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
      {isDispute ? (
        <p className="text-center text-xs font-medium text-red-500">
          {labels.dispute}
        </p>
      ) : null}
    </div>
  );
}
