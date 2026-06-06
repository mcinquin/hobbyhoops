"use client";

import { useMemo, useState } from "react";
import type { Card, References, Shipment } from "@/lib/types";
import { buildCardDraftFromShipment } from "@/lib/shipment-to-card";
import { formatPriceLabel } from "@/lib/shipment-utils";
import { createCard } from "@/lib/cards-client";
import { updateShipment } from "@/lib/shipments-client";
import { CardForm } from "@/components/card-form";
import { useI18n, useTranslations } from "@/i18n/client";

interface ShipmentReceiveDialogProps {
  shipment: Shipment | null;
  references: References;
  open: boolean;
  onClose: () => void;
  onComplete: (messageKey: "addedToCollection" | "markedReceived") => void;
}

function buildProvenanceNote(
  shipment: Shipment,
  t: ReturnType<typeof useTranslations>,
  locale: "fr" | "en"
): string {
  const parts = [
    t("shipments.provenance.platform", {
      platform: t(`shipments.platform.${shipment.platform}`),
    }),
  ];

  if (shipment.seller) {
    parts.push(t("shipments.provenance.seller", { name: shipment.seller }));
  }
  if (shipment.orderId) {
    parts.push(t("shipments.provenance.order", { id: shipment.orderId }));
  }

  const price = formatPriceLabel(shipment.priceCents, shipment.currency, locale);
  if (price) {
    parts.push(t("shipments.provenance.price", { price }));
  }

  return parts.join(" · ");
}

export function ShipmentReceiveDialog({
  shipment,
  references,
  open,
  onClose,
  onComplete,
}: ShipmentReceiveDialogProps) {
  const t = useTranslations();
  const { locale } = useI18n();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [skipping, setSkipping] = useState(false);

  const cardDraft = useMemo(() => {
    if (!shipment) return null;
    return buildCardDraftFromShipment(
      shipment,
      buildProvenanceNote(shipment, t, locale)
    );
  }, [locale, shipment, t]);

  async function handleSave(cardData: Partial<Card>): Promise<boolean> {
    if (!shipment) return false;
    setSaveError(null);
    try {
      const created = await createCard(cardData);
      await updateShipment({
        id: shipment.id,
        status: "received",
        cardId: created.id,
      });
      onComplete("addedToCollection");
      return true;
    } catch (err) {
      setSaveError(
        err instanceof Error && err.message
          ? err.message
          : t("shipments.receive.saveFailed")
      );
      return false;
    }
  }

  async function handleSkip() {
    if (!shipment || skipping) return;
    setSaveError(null);
    setSkipping(true);
    try {
      await updateShipment({ id: shipment.id, status: "received" });
      onComplete("markedReceived");
    } catch {
      setSaveError(t("shipments.receive.saveFailed"));
    } finally {
      setSkipping(false);
    }
  }

  if (!shipment || !cardDraft) {
    return null;
  }

  return (
    <CardForm
      card={cardDraft}
      references={references}
      open={open}
      onClose={onClose}
      onSave={handleSave}
      manageReferences={false}
      saveError={saveError}
      dialogTitle={t("shipments.receive.title")}
      submitLabel={t("shipments.receive.submit")}
      secondaryAction={{
        label: t("shipments.receive.skip"),
        onClick: handleSkip,
        disabled: skipping,
      }}
    />
  );
}
