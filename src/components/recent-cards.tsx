import { Card } from "@/lib/types";
import { CardBadges, type CardBadgeLabels } from "@/components/card-badges";
import { compareOpeningDates, formatOpeningDateLabel } from "@/lib/opening-date";

interface RecentCardsProps {
  cards: Card[];
  title: string;
  badgeLabels: CardBadgeLabels;
}

export function RecentCards({ cards, title, badgeLabels }: RecentCardsProps) {
  const recent = cards
    .filter((c) => c.openingDate)
    .sort((a, b) => compareOpeningDates(b.openingDate, a.openingDate))
    .slice(0, 8);

  return (
    <div className="min-w-0 rounded-lg border border-border bg-card p-4 sm:p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        {title}
      </h3>
      <div className="space-y-3">
        {recent.map((card) => (
          <div
            key={card.id}
            className="flex min-w-0 flex-col gap-2 border-b border-border/50 py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{card.player}</p>
              <p className="text-xs text-muted-foreground truncate">
                {card.year} {card.brand} {card.set} - {card.variation}
              </p>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:ml-4 sm:justify-end">
              <CardBadges card={card} labels={badgeLabels} />
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
