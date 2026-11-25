"use client";

import { useState } from "react";
import { AmountInput } from "@/components/amount-input";
import { IsoDateInput } from "@/components/iso-date-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { recordCardSale } from "@/lib/investments-client";
import { formatTodayIsoDate } from "@/lib/locale-date";
import type { CardListItem } from "@/lib/types";
import { useTranslations } from "@/i18n/client";

interface SaleDialogProps {
  card: CardListItem;
  currency: string;
  onClose: () => void;
  onSaved: () => void;
}

/** Records the sale of an investment card (date, price, fees). */
export function SaleDialog({ card, currency, onClose, onSaved }: SaleDialogProps) {
  const t = useTranslations();
  const [soldAt, setSoldAt] = useState<string | null>(formatTodayIsoDate());
  const [salePriceCents, setSalePriceCents] = useState<number | null>(null);
  const [saleFeesCents, setSaleFeesCents] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!soldAt) {
      setError(t("errors.saleDateInvalid"));
      return;
    }
    if (salePriceCents == null || Number.isNaN(salePriceCents)) {
      setError(t("errors.salePriceInvalid"));
      return;
    }
    if (saleFeesCents != null && Number.isNaN(saleFeesCents)) {
      setError(t("errors.saleFeesInvalid"));
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await recordCardSale(card.id, { soldAt, salePriceCents, saleFeesCents });
      onSaved();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("common.error"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("investments.saleDialog.title")}</DialogTitle>
            <DialogDescription>
              {card.player} · {t("investments.saleDialog.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <IsoDateInput
              id="sale-date"
              label={t("investments.saleDialog.date")}
              value={soldAt}
              onChange={setSoldAt}
            />
            <div className="space-y-1">
              <Label htmlFor="sale-price">
                {t("investments.saleDialog.price", { currency })}
              </Label>
              <AmountInput id="sale-price" value={salePriceCents} onChange={setSalePriceCents} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="sale-fees">{t("investments.saleDialog.fees")}</Label>
              <AmountInput
                id="sale-fees"
                value={saleFeesCents}
                onChange={setSaleFeesCents}
                placeholder={t("investments.saleDialog.feesPlaceholder")}
              />
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
