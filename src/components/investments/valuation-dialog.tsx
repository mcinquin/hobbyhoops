"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { AmountInput } from "@/components/amount-input";
import { CardMarketLinks } from "@/components/card-market-links";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CardValuation } from "@/lib/investment-portfolio";
import {
  createCardValuation,
  deleteCardValuation,
  fetchCardValuations,
} from "@/lib/investments-client";
import { formatIsoDateLabel, formatTodayIsoDate } from "@/lib/locale-date";
import { formatMoney } from "@/lib/money";
import type { CardListItem } from "@/lib/types";
import { useI18n, useTranslations } from "@/i18n/client";

interface ValuationDialogProps {
  card: CardListItem;
  currency: string;
  onClose: () => void;
  /** Called after a reading was added or removed. */
  onChanged: () => void;
}

/** Adds a manual reading to a card (with comparable-sales links) and lists its history. */
export function ValuationDialog({ card, currency, onClose, onChanged }: ValuationDialogProps) {
  const t = useTranslations();
  const { locale } = useI18n();
  const [valueCents, setValueCents] = useState<number | null>(null);
  const [valuedAt, setValuedAt] = useState<string | null>(formatTodayIsoDate());
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<CardValuation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetchCardValuations(card.id)
      .then((valuations) => {
        if (active) setHistory(valuations);
      })
      .catch(() => {
        if (active) setHistory([]);
      });
    return () => {
      active = false;
    };
  }, [card.id]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (valueCents == null || Number.isNaN(valueCents)) {
      setError(t("errors.valuationInvalid"));
      return;
    }
    if (!valuedAt) {
      setError(t("errors.valuationDateInvalid"));
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await createCardValuation(card.id, { valueCents, valuedAt, note: note.trim() });
      onChanged();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("common.error"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(valuationId: number) {
    setError(null);
    try {
      await deleteCardValuation(card.id, valuationId);
      setHistory((current) => current?.filter((reading) => reading.id !== valuationId) ?? null);
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("common.error"));
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("investments.valuationDialog.title")}</DialogTitle>
            <DialogDescription>
              {card.player} · {[card.year, card.brand, card.set, card.variation].filter(Boolean).join(" ")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {t("investments.valuationDialog.description")}
            </p>
            <CardMarketLinks card={card} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="valuation-value">
                {t("investments.valuationDialog.value", { currency })}
              </Label>
              <AmountInput id="valuation-value" value={valueCents} onChange={setValueCents} />
            </div>
            <IsoDateInput
              id="valuation-date"
              label={t("investments.valuationDialog.date")}
              value={valuedAt}
              onChange={setValuedAt}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="valuation-note">{t("investments.valuationDialog.note")}</Label>
            <Input
              id="valuation-note"
              value={note}
              maxLength={200}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("investments.valuationDialog.notePlaceholder")}
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="space-y-2">
            <h3 className="text-sm font-medium">{t("investments.valuationDialog.history")}</h3>
            {history === null ? (
              <p className="text-xs text-muted-foreground">{t("common.loading")}</p>
            ) : history.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("investments.valuationDialog.historyEmpty")}
              </p>
            ) : (
              <ul className="divide-y divide-border/70 rounded-lg border border-border/70">
                {history.map((reading) => (
                  <li
                    key={reading.id}
                    className="flex min-w-0 items-center justify-between gap-2 px-3 py-1.5 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="font-medium tabular-nums">
                        {formatMoney(reading.valueCents, reading.currency, locale)}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {formatIsoDateLabel(reading.valuedAt, locale)}
                      </span>
                      {reading.note ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {reading.note}
                        </span>
                      ) : null}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("investments.valuationDialog.deleteReading")}
                      onClick={() => handleDelete(reading.id)}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

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
