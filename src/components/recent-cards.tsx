import { Card } from "@/lib/types";
import { CardBadges, type CardBadgeLabels } from "@/components/card-badges";
import { compareOpeningDates, formatOpeningDateLabel } from "@/lib/opening-date";
import type { Locale } from "@/i18n/config";

interface RecentCardsProps {
  cards: Card[];
  title: string;
  badgeLabels: CardBadgeLabels;
  locale: Locale;
  emptyLabel?: string;
}

export function RecentCards({
  cards,
  title,
  badgeLabels,
  locale,
  emptyLabel,
}: RecentCardsProps) {
  const recent = cards
    .filter((c) => c.openingDate)
    .sort((a, b) => compareOpeningDates(b.openingDate, a.openingDate))
    .slice(0, 8);

  return (
    <div className="min-w-0 rounded-lg border border-border bg-card p-4 sm:p-6">
      <h2 className="mb-4 text-sm font-medium text-muted-foreground">{title}</h2>
      {recent.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel ?? "—"}</p>
      ) : (
        <div className="space-y-3">
          {recent.map((card) => (
            <div
              key={card.id}
              className="flex min-w-0 flex-col gap-2 border-b border-border/50 py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{card.player}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {card.year} {card.brand} {card.set} - {card.variation}
                </p>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2 sm:ml-4 sm:justify-end">
                <CardBadges card={card} labels={badgeLabels} />
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatOpeningDateLabel(card.openingDate, locale)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
