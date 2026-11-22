"use client";

import type { CardListItem } from "@/lib/types";
import { CardBadges, type CardBadgeLabels } from "@/components/card-badges";
import { useTranslations } from "@/i18n/client";

interface CardTableMobileListProps {
  cards: CardListItem[];
  badgeLabels: CardBadgeLabels;
  onSelect: (card: CardListItem) => void;
}

/** Mobile (< md) collection list: one tappable summary card per row. */
export function CardTableMobileList({
  cards,
  badgeLabels,
  onSelect,
}: CardTableMobileListProps) {
  const t = useTranslations();

  if (cards.length === 0) {
    return (
      <div className="space-y-2 md:hidden">
        <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
          {t("cards.noneFound")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 md:hidden">
      {cards.map((card) => {
        const meta = [card.team, card.year].filter(Boolean).join(" · ");
        const serialAndGrade = [
          card.cardNumber ? `#${card.cardNumber}` : "",
          card.serialNumber,
          card.grading,
        ]
          .filter(Boolean)
          .join(" · ");

        return (
          <button
            key={card.id}
            type="button"
            className="block w-full rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onSelect(card)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium leading-tight">{card.player}</p>
                <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
              </div>
              <CardBadges card={card} labels={badgeLabels} />
            </div>

            <div className="mt-2 space-y-0.5 text-sm">
              <p className="truncate text-muted-foreground">
                {card.brand} · {card.set}
              </p>
              <p className="truncate">{card.variation}</p>
              {serialAndGrade && (
                <p className="text-xs font-medium text-muted-foreground">
                  {serialAndGrade}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
