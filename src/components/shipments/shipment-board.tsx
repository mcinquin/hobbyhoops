"use client";

import { useCallback, useMemo, useState } from "react";
import type { Shipment, ShipmentPlatform, ShipmentStatus, References } from "@/lib/types";
import {
  compareShipmentsByUrgency,
  detectCarrier,
  formatTodayIsoDate,
  isActiveShipment,
  SHIPMENT_PLATFORMS,
} from "@/lib/shipment-utils";
import {
  createShipment,
  deleteShipment,
  fetchShipments,
  updateShipment,
} from "@/lib/shipments-client";
import { ShipmentCard } from "@/components/shipments/shipment-card";
import { ShipmentDateInput } from "@/components/shipments/shipment-date-input";
import { ShipmentReceiveDialog } from "@/components/shipments/shipment-receive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import { useTranslations } from "@/i18n/client";

interface ShipmentBoardProps {
  initialShipments: Shipment[];
  references: References;
}

function parsePriceToCents(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const amount = Number.parseFloat(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

export function ShipmentBoard({ initialShipments, references }: ShipmentBoardProps) {
  const t = useTranslations();
  const [shipments, setShipments] = useState(initialShipments);
  const [showReceived, setShowReceived] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [receiveTarget, setReceiveTarget] = useState<Shipment | null>(null);

  const [platform, setPlatform] = useState<ShipmentPlatform>("ebay");
  const [description, setDescription] = useState("");
  const [orderId, setOrderId] = useState("");
  const [seller, setSeller] = useState("");
  const [price, setPrice] = useState("");
  const [orderedAt, setOrderedAt] = useState<string | null>(formatTodayIsoDate());
  const [trackingNumber, setTrackingNumber] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState<string | null>(null);

  const activeCount = useMemo(
    () => shipments.filter((s) => isActiveShipment(s.status)).length,
    [shipments]
  );

  const visibleShipments = useMemo(() => {
    const filtered = showReceived
      ? shipments
      : shipments.filter((s) => s.status !== "received");
    return [...filtered].sort(compareShipmentsByUrgency);
  }, [shipments, showReceived]);

  const refreshShipments = useCallback(async () => {
    const data = await fetchShipments(true);
    setShipments(data);
  }, []);

  async function handleAdd() {
    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      setFormError(t("shipments.fieldsRequired"));
      return;
    }
    if (!orderedAt) {
      setFormError(t("shipments.orderedAtRequired"));
      return;
    }

    const priceCents = parsePriceToCents(price);
    if (price.trim() && priceCents == null) {
      setFormError(t("shipments.priceInvalid"));
      return;
    }

    setFormError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const tracking = trackingNumber.trim() || null;
      const carrier = tracking ? detectCarrier(tracking) : null;
      await createShipment({
        platform,
        description: trimmedDescription,
        orderId: orderId.trim() || null,
        seller: seller.trim() || null,
        priceCents,
        orderedAt,
        trackingNumber: tracking,
        carrier: carrier === "unknown" ? null : carrier,
        expectedDelivery,
      });
      await refreshShipments();
      setDescription("");
      setOrderId("");
      setSeller("");
      setPrice("");
      setTrackingNumber("");
      setExpectedDelivery(null);
      setSuccess(t("shipments.added"));
    } catch {
      setFormError(t("errors.updateFailed"));
    } finally {
      setLoading(false);
    }
  }

  const handleStatusChange = useCallback(
    async (id: string, status: ShipmentStatus) => {
      setSuccess(null);
      setLoading(true);
      try {
        await updateShipment({ id, status });
        await refreshShipments();
        setSuccess(t("shipments.updated"));
      } catch {
        setFormError(t("errors.updateFailed"));
      } finally {
        setLoading(false);
      }
    },
    [refreshShipments, t]
  );

  const handleMarkReceived = useCallback((shipment: Shipment) => {
    setFormError(null);
    setReceiveTarget(shipment);
  }, []);

  const handleReceiveComplete = useCallback(
    async (messageKey: "addedToCollection" | "markedReceived") => {
      setReceiveTarget(null);
      setLoading(true);
      try {
        await refreshShipments();
        setSuccess(t(`shipments.receive.${messageKey}`));
      } catch {
        setFormError(t("errors.updateFailed"));
      } finally {
        setLoading(false);
      }
    },
    [refreshShipments, t]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setSuccess(null);
      setLoading(true);
      try {
        await deleteShipment(id);
        await refreshShipments();
        setSuccess(t("shipments.deleted"));
      } catch {
        setFormError(t("errors.updateFailed"));
      } finally {
        setLoading(false);
      }
    },
    [refreshShipments, t]
  );

  return (
    <div className="space-y-6">
      <ShipmentReceiveDialog
        shipment={receiveTarget}
        references={references}
        open={receiveTarget != null}
        onClose={() => setReceiveTarget(null)}
        onComplete={(messageKey) => void handleReceiveComplete(messageKey)}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">{t("shipments.stats.active")}</p>
          <p className="mt-1 text-2xl font-bold text-amber-500">{activeCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 sm:col-span-2">
          <p className="text-sm text-muted-foreground">{t("shipments.intro")}</p>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-medium">{t("shipments.addEntry")}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1 sm:col-span-2 lg:col-span-3">
            <Label htmlFor="shipment-description">{t("shipments.description")}</Label>
            <Input
              id="shipment-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("shipments.descriptionPlaceholder")}
              disabled={loading}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="shipment-platform">{t("shipments.platformLabel")}</Label>
            <select
              id="shipment-platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as ShipmentPlatform)}
              disabled={loading}
              className="flex h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {SHIPMENT_PLATFORMS.map((value) => (
                <option key={value} value={value}>
                  {t(`shipments.platform.${value}`)}
                </option>
              ))}
            </select>
          </div>
          <ShipmentDateInput
            id="shipment-ordered-at"
            label={t("shipments.orderedAt")}
            value={orderedAt}
            onChange={setOrderedAt}
            disabled={loading}
          />
          <div className="space-y-1">
            <Label htmlFor="shipment-price">{t("shipments.price")}</Label>
            <Input
              id="shipment-price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={t("shipments.pricePlaceholder")}
              disabled={loading}
              inputMode="decimal"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="shipment-order-id">{t("shipments.orderId")}</Label>
            <Input
              id="shipment-order-id"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder={t("shipments.orderIdPlaceholder")}
              disabled={loading}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="shipment-seller">{t("shipments.sellerLabel")}</Label>
            <Input
              id="shipment-seller"
              value={seller}
              onChange={(e) => setSeller(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="shipment-tracking">{t("shipments.trackingNumber")}</Label>
            <Input
              id="shipment-tracking"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder={t("shipments.trackingPlaceholder")}
              disabled={loading}
            />
          </div>
          <ShipmentDateInput
            id="shipment-expected"
            label={t("shipments.expectedDeliveryLabel")}
            value={expectedDelivery}
            onChange={setExpectedDelivery}
            disabled={loading}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={loading}
            onClick={() => void handleAdd()}
          >
            <Plus className="mr-1 h-4 w-4" />
            {t("common.add")}
          </Button>
          {success ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>
          ) : null}
          {formError ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {t("shipments.count", { count: visibleShipments.length })}
        </p>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch
            checked={showReceived}
            onCheckedChange={setShowReceived}
            disabled={loading}
          />
          {t("shipments.showReceived")}
        </label>
      </div>

      {visibleShipments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
          <p className="text-sm font-medium">{t("shipments.emptyTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("shipments.emptyHint")}</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {visibleShipments.map((shipment) => (
            <ShipmentCard
              key={shipment.id}
              shipment={shipment}
              loading={loading}
              onStatusChange={handleStatusChange}
              onMarkReceived={handleMarkReceived}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
