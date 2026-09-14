"use client";

import { useEffect, useState } from "react";
import type { Card, CardListItem } from "@/lib/types";
import { fetchCardById } from "@/lib/cards-client";
import { CardBadges } from "@/components/card-badges";
import { CardPhotos } from "@/components/card-photos";
import { formatOpeningDateLabel } from "@/lib/opening-date";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { CardMarketLinks } from "@/components/card-market-links";
import { useCardBadgeLabels } from "@/hooks/use-card-badge-labels";
import { useI18n, useTranslations } from "@/i18n/client";
import { cn } from "@/lib/utils";

interface CardDetailProps {
  card: CardListItem;
  open: boolean;
  onClose: () => void;
}

export function CardDetail({ card, open, onClose }: CardDetailProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      {open ? <CardDetailBody key={card.id} card={card} /> : null}
    </Dialog>
  );
}

function CardDetailBody({ card }: { card: CardListItem }) {
  const { locale } = useI18n();
  const t = useTranslations();
  const badgeLabels = useCardBadgeLabels();
  const [fullCard, setFullCard] = useState<Card | null>(null);
  const [photosLoading, setPhotosLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchCardById(card.id)
      .then((loaded) => {
        if (!active) return;
        setFullCard(loaded);
      })
      .catch(() => {
        if (!active) return;
        setFullCard(null);
      })
      .finally(() => {
        if (!active) return;
        setPhotosLoading(false);
      });

    return () => {
      active = false;
    };
  }, [card.id]);

  const photoFront = fullCard?.photoFront ?? null;
  const photoBack = fullCard?.photoBack ?? null;
  const hasPhotos = photosLoading || Boolean(photoFront || photoBack);

  const details = [
    { label: t("cards.teamLabel"), value: card.team },
    { label: t("cards.yearLabel"), value: card.year },
    { label: t("cards.brandLabel"), value: card.brand },
    { label: t("cards.setLabel"), value: card.set },
    { label: t("cards.variationLabel"), value: card.variation },
    { label: t("cards.cardNumber"), value: card.cardNumber || "—" },
    { label: t("cards.serial"), value: card.serialNumber || "—" },
    { label: t("cards.gradingLabel"), value: card.grading },
    { label: t("cards.protection"), value: card.protection || "—" },
    { label: t("cards.storage"), value: card.storage || "—" },
  ];

  return (
    <DialogContent
      className={cn(
        "max-h-[90vh] overflow-y-auto",
        hasPhotos ? "sm:max-w-3xl" : "sm:max-w-md"
      )}
    >
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 flex-wrap">
          <span>{card.player}</span>
          <CardBadges card={card} labels={badgeLabels} />
        </DialogTitle>
        <p className="text-sm text-muted-foreground font-normal pt-1">
          {card.openingDate ? (
            <>
              {t("cards.addedOn", {
                date: formatOpeningDateLabel(card.openingDate, locale),
              })}
            </>
          ) : (
            <span>{t("cards.addedOnMissing")}</span>
          )}
        </p>
      </DialogHeader>
      <Separator />

      <div
        className={cn(
          "gap-6",
          hasPhotos ? "grid md:grid-cols-[minmax(0,22rem)_1fr]" : "block"
        )}
      >
        {hasPhotos ? (
          <CardPhotos
            key={`${photoFront ?? ""}|${photoBack ?? ""}`}
            player={card.player}
            photoFront={photoFront}
            photoBack={photoBack}
            loading={photosLoading}
          />
        ) : null}

        <div className="min-w-0 space-y-3">
          <CardMarketLinks card={card} />
          <div className="grid grid-cols-2 gap-3 py-1">
            {details.map((d) => (
              <div key={d.label}>
                <p className="text-xs text-muted-foreground">{d.label}</p>
                <p className="text-sm font-medium">{d.value}</p>
              </div>
            ))}
          </div>
          {card.notes ? (
            <div className="pt-1">
              <p className="text-xs text-muted-foreground">{t("cards.notes")}</p>
              <p className="text-sm whitespace-pre-wrap">{card.notes}</p>
            </div>
          ) : null}
        </div>
      </div>
    </DialogContent>
  );
}
