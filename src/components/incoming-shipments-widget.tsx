"use client";

import Link from "next/link";
import type { Shipment } from "@/lib/types";
import {
  buildShipmentAlertSummary,
  formatShipmentDateLabel,
  isUrgentProtection,
} from "@/lib/shipment-utils";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowRight, Package } from "lucide-react";

interface IncomingShipmentsWidgetProps {
  shipments: Shipment[];
  labels: {
    title: string;
    activeCount: string;
    viewAll: string;
    alertOne: string;
    alertMany: string;
    empty: string;
    protectionDays: string;
    protectionDay: string;
    protectionExpired: string;
  };
}

export function IncomingShipmentsWidget({
  shipments,
  labels,
}: IncomingShipmentsWidgetProps) {
  const { locale } = useI18n();
  const summary = buildShipmentAlertSummary(shipments, 4);

  if (summary.activeCount === 0) {
    return null;
  }

  const topAlert = summary.alerts[0];

  return (
    <section className="min-w-0 rounded-lg border border-border bg-card p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="mr-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
            <Package className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-medium">{labels.title}</h2>
            <p className="text-xs text-muted-foreground">{labels.activeCount}</p>
          </div>
        </div>
        <Link
          href="/shipments"
          className="inline-flex items-center gap-1 text-sm font-medium text-amber-500 hover:underline"
        >
          {labels.viewAll}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {summary.urgentCount > 0 && topAlert?.protection ? (
        <div
          className={cn(
            "mb-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm",
            topAlert.protection.urgency === "critical" ||
              topAlert.protection.urgency === "expired"
              ? "border-red-500/40 bg-red-500/5 text-red-600 dark:text-red-400"
              : "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400"
          )}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {summary.urgentCount === 1
              ? labels.alertOne
              : labels.alertMany.replace("{count}", String(summary.urgentCount))}
            {" · "}
            {topAlert.shipment.description}
            {" · "}
            {protectionLabel(topAlert.protection.daysRemaining, labels)}
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        {summary.preview.map(({ shipment, protection }) => {
          const isUrgent =
            protection?.isActive && isUrgentProtection(protection.urgency);

          return (
            <Link
              key={shipment.id}
              href="/shipments"
              className={cn(
                "flex min-w-0 items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-accent/40",
                isUrgent ? "border-amber-500/30 bg-amber-500/5" : "border-border/70"
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{shipment.description}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {shipment.seller ?? "—"}
                  {shipment.expectedDelivery
                    ? ` · ${formatShipmentDateLabel(shipment.expectedDelivery, locale)}`
                    : ""}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {protection?.isActive ? (
                  <p
                    className={cn(
                      "text-xs font-medium tabular-nums",
                      isUrgent ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                    )}
                  >
                    {protectionLabel(protection.daysRemaining, labels)}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">—</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function protectionLabel(
  daysRemaining: number,
  labels: IncomingShipmentsWidgetProps["labels"]
): string {
  if (daysRemaining <= 0) return labels.protectionExpired;
  if (daysRemaining === 1) return labels.protectionDay;
  return labels.protectionDays.replace("{count}", String(daysRemaining));
}
