"use client";

import { useState } from "react";
import type { CardListItem } from "@/lib/types";
import { CardDetail } from "@/components/card-detail";
import { useTranslations } from "@/i18n/client";

interface RarestCardsListProps {
  cards: CardListItem[];
}

/** Rarest numbered cards, lowest print run first; each row opens the card details. */
export function RarestCardsList({ cards }: RarestCardsListProps) {
  const t = useTranslations();
  const [selected, setSelected] = useState<CardListItem | null>(null);

  return (
    <>
      <ol className="divide-y divide-border/70 rounded-lg border border-border/70">
        {cards.map((card, index) => (
          <li key={card.id}>
            <button
              type="button"
              onClick={() => setSelected(card)}
              aria-label={t("dashboard.rarity.openCard", {
                player: card.player,
                serial: card.serialNumber ?? "",
              })}
              className="flex w-full min-w-0 items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{card.player}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {[card.year, card.brand, card.set, card.variation].filter(Boolean).join(" ")}
                </span>
              </span>
              <span className="shrink-0 rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-red-500">
                {card.serialNumber}
              </span>
            </button>
          </li>
        ))}
      </ol>
      {selected ? (
        <CardDetail card={selected} open onClose={() => setSelected(null)} />
      ) : null}
    </>
  );
}
