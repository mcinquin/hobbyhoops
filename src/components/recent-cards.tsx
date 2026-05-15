"use client";

import { Card } from "@/lib/types";
import { CardBadges } from "@/components/card-badges";
import { compareOpeningDates, formatOpeningDateLabel } from "@/lib/opening-date";
import { useTranslations } from "@/i18n/client";

interface RecentCardsProps {
  cards: Card[];
}

export function RecentCards({ cards }: RecentCardsProps) {
  const t = useTranslations();

  const recent = cards
    .filter((c) => c.openingDate)
    .sort((a, b) => compareOpeningDates(b.openingDate, a.openingDate))
    .slice(0, 8);

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        {t("dashboard.recentAdditions")}
      </h3>
      <div className="space-y-3">
        {recent.map((card) => (
          <div
            key={card.id}
            className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{card.player}</p>
              <p className="text-xs text-muted-foreground truncate">
                {card.year} {card.brand} {card.set} - {card.variation}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <CardBadges card={card} />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatOpeningDateLabel(card.openingDate)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
