"use client";

import { Card } from "@/lib/types";
import { CardBadges } from "@/components/card-badges";
import { formatOpeningDateLabel } from "@/lib/opening-date";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  cardComparableSalesQuery,
  ebaySoldListingsUrl,
} from "@/lib/card-sales-links";
import { useTranslations } from "@/i18n/client";

interface CardDetailProps {
  card: Card;
  open: boolean;
  onClose: () => void;
}

function formatAddedDate(value: string | null): string {
  return formatOpeningDateLabel(value);
}

export function CardDetail({ card, open, onClose }: CardDetailProps) {
  const t = useTranslations();
  const salesQuery = cardComparableSalesQuery(card);
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
            <CardBadges card={card} />
          </DialogTitle>
          <p className="text-sm text-muted-foreground font-normal pt-1">
            {card.openingDate ? (
              <>
                {t("cards.addedOn", {
                  date: formatAddedDate(card.openingDate),
                })}
              </>
            ) : (
              <span>{t("cards.addedOnMissing")}</span>
            )}
          </p>
        </DialogHeader>
        <Separator />
        <p className="text-xs text-muted-foreground">
          {t("cards.ebaySales")}{" "}
          <a
            href={ebaySoldListingsUrl(salesQuery)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-500 hover:underline"
          >
            {t("common.ebay")}
          </a>
        </p>
        <div className="grid grid-cols-2 gap-3 py-2">
          {details.map((d) => (
            <div key={d.label}>
              <p className="text-xs text-muted-foreground">{d.label}</p>
              <p className="text-sm font-medium">{d.value}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
