"use client";

import type { CardListItem } from "@/lib/types";
import { CardBadges } from "@/components/card-badges";
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

interface CardDetailProps {
  card: CardListItem;
  open: boolean;
  onClose: () => void;
}

export function CardDetail({ card, open, onClose }: CardDetailProps) {
  const { locale } = useI18n();
  const t = useTranslations();
  const badgeLabels = useCardBadgeLabels();
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
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
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
        <CardMarketLinks card={card} />
        <div className="grid grid-cols-2 gap-3 py-2">
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
      </DialogContent>
    </Dialog>
  );
}
