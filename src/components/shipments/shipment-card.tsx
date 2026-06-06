"use client";

import type { Shipment, ShipmentStatus } from "@/lib/types";
import {
  buildEbayDisputeUrl,
  buildEbayOrderUrl,
  buildTrackingUrl,
  computeEbayProtection,
  detectCarrier,
  formatPriceLabel,
  formatShipmentDateLabel,
} from "@/lib/shipment-utils";
import { ProtectionBar } from "@/components/shipments/protection-bar";
import { ShipmentTimeline } from "@/components/shipments/shipment-timeline";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ExternalLink,
  Package,
  Trash2,
  Truck,
} from "lucide-react";
import { useI18n, useTranslations } from "@/i18n/client";

interface ShipmentCardProps {
  shipment: Shipment;
  loading: boolean;
  onStatusChange: (id: string, status: ShipmentStatus) => void;
  onMarkReceived: (shipment: Shipment) => void;
  onDelete: (id: string) => void;
}

const STATUS_COLORS: Record<ShipmentStatus, string> = {
  pending: "border-zinc-500/40 bg-zinc-500/10 text-zinc-400",
  shipped: "border-blue-500/40 bg-blue-500/10 text-blue-500",
  in_transit: "border-amber-500/40 bg-amber-500/10 text-amber-500",
  delivered: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
  received: "border-emerald-500/50 bg-emerald-500/15 text-emerald-500",
  dispute: "border-red-500/40 bg-red-500/10 text-red-500",
};

export function ShipmentCard({
  shipment,
  loading,
  onStatusChange,
  onMarkReceived,
  onDelete,
}: ShipmentCardProps) {
  const t = useTranslations();
  const { locale } = useI18n();
  const protection =
    shipment.platform === "ebay"
      ? computeEbayProtection(shipment.orderedAt, shipment.status)
      : null;
  const trackingUrl = shipment.trackingNumber
    ? buildTrackingUrl(shipment.trackingNumber, shipment.carrier)
    : null;
  const ebayOrderUrl = buildEbayOrderUrl(shipment.platform, shipment.orderId);
  const ebayDisputeUrl = buildEbayDisputeUrl(shipment.platform);
  const priceLabel = formatPriceLabel(
    shipment.priceCents,
    shipment.currency,
    locale
  );
  const carrier =
    shipment.carrier && shipment.carrier !== "unknown"
      ? shipment.carrier
      : shipment.trackingNumber
        ? detectCarrier(shipment.trackingNumber)
        : null;

  const nextActions: { status: ShipmentStatus; label: string }[] = [];
  if (shipment.status === "pending") {
    nextActions.push({
      status: "shipped",
      label: t("shipments.actions.markShipped"),
    });
  }
  if (shipment.status === "shipped") {
    nextActions.push({
      status: "in_transit",
      label: t("shipments.actions.markInTransit"),
    });
  }
  if (shipment.status === "in_transit") {
    nextActions.push({
      status: "delivered",
      label: t("shipments.actions.markDelivered"),
    });
  }
  if (shipment.status === "delivered") {
    nextActions.push({
      status: "received",
      label: t("shipments.actions.markReceived"),
    });
  }
  if (shipment.status !== "received" && shipment.status !== "dispute") {
    nextActions.push({
      status: "dispute",
      label: t("shipments.actions.openDispute"),
    });
  }

  return (
    <article
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5",
        shipment.status === "dispute" && "border-red-500/30",
        protection?.urgency === "critical" && shipment.status !== "received"
          ? "ring-1 ring-red-500/30"
          : protection?.urgency === "warning" && shipment.status !== "received"
            ? "ring-1 ring-amber-500/30"
            : undefined
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex h-5 items-center rounded-4xl border px-2 text-[10px] font-medium uppercase tracking-wide",
                STATUS_COLORS[shipment.status]
              )}
            >
              {t(`shipments.status.${shipment.status}`)}
            </span>
            <span className="text-xs text-muted-foreground">
              {t(`shipments.platform.${shipment.platform}`)}
              {shipment.orderId ? ` · #${shipment.orderId}` : ""}
            </span>
          </div>
          <h3 className="text-base font-semibold leading-snug">
            {shipment.description}
          </h3>
          <p className="text-sm text-muted-foreground">
            {shipment.seller
              ? t("shipments.seller", { name: shipment.seller })
              : null}
            {shipment.seller && priceLabel ? " · " : ""}
            {priceLabel}
            {(shipment.seller || priceLabel) && shipment.orderedAt ? " · " : ""}
            {shipment.orderedAt
              ? t("shipments.orderedOn", {
                  date: formatShipmentDateLabel(shipment.orderedAt, locale),
                })
              : null}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          disabled={loading}
          aria-label={t("shipments.deleteEntry", {
            description: shipment.description,
          })}
          onClick={() => onDelete(shipment.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="mt-4">
        <ShipmentTimeline
          status={shipment.status}
          labels={{
            pending: t("shipments.timeline.pending"),
            shipped: t("shipments.timeline.shipped"),
            inTransit: t("shipments.timeline.inTransit"),
            delivered: t("shipments.timeline.delivered"),
            dispute: t("shipments.timeline.dispute"),
          }}
        />
      </div>

      {shipment.trackingNumber ? (
        <div className="mt-4 rounded-lg border border-border/80 bg-muted/20 p-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Truck className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("shipments.tracking")}
              </p>
              <p className="mt-0.5 font-mono text-sm">{shipment.trackingNumber}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {carrier && carrier !== "unknown"
                  ? t(`shipments.carrier.${carrier}`)
                  : t("shipments.carrier.unknown")}
                {shipment.expectedDelivery
                  ? ` · ${t("shipments.expectedDelivery", {
                      date: formatShipmentDateLabel(
                        shipment.expectedDelivery,
                        locale
                      ),
                    })}`
                  : ""}
              </p>
            </div>
          </div>
        </div>
      ) : shipment.status === "pending" ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
          <Package className="h-4 w-4 shrink-0" />
          {t("shipments.noTrackingYet")}
        </div>
      ) : null}

      {protection?.isActive ? (
        <div className="mt-4">
          <ProtectionBar
            protection={protection}
            labels={{
              title: t("shipments.protection.title"),
              daysRemaining: t("shipments.protection.daysRemaining", {
                count: protection.daysRemaining,
              }),
              daysRemainingOne: t("shipments.protection.daysRemainingOne"),
              expired: t("shipments.protection.expired"),
              critical: t("shipments.protection.critical"),
              warning: t("shipments.protection.warning"),
            }}
          />
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {trackingUrl ? (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            {t("shipments.trackPackage")}
          </a>
        ) : null}
        {ebayOrderUrl ? (
          <a
            href={ebayOrderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            {t("shipments.openEbay")}
          </a>
        ) : null}
        {ebayDisputeUrl &&
        protection &&
        (protection.urgency === "warning" ||
          protection.urgency === "critical" ||
          protection.urgency === "expired") ? (
          <a
            href={ebayDisputeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-red-500 hover:text-red-500")}
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            {t("shipments.openDispute")}
          </a>
        ) : null}
        {nextActions.map((action) => (
          <Button
            key={action.status}
            type="button"
            size="sm"
            variant={action.status === "dispute" ? "outline" : "default"}
            className={
              action.status === "dispute"
                ? "text-red-500 hover:text-red-500"
                : undefined
            }
            disabled={loading}
            onClick={() =>
              action.status === "received"
                ? onMarkReceived(shipment)
                : onStatusChange(shipment.id, action.status)
            }
          >
            {action.label}
          </Button>
        ))}
      </div>
    </article>
  );
}
