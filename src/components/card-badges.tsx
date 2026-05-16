import { Card } from "@/lib/types";

export interface CardBadgeLabels {
  rookie: string;
  autograph: string;
  memorabilia: string;
  tradable: string;
}

interface CardBadgesProps {
  card: Card;
  labels: CardBadgeLabels;
}

export function CardBadges({ card, labels }: CardBadgesProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {card.rookie && (
        <span className="inline-flex h-5 items-center rounded-4xl border border-emerald-500/50 bg-emerald-500/10 px-1.5 py-0 text-[10px] font-medium text-emerald-500">
          {labels.rookie}
        </span>
      )}
      {card.autograph && (
        <span className="inline-flex h-5 items-center rounded-4xl border border-amber-500/50 bg-amber-500/10 px-1.5 py-0 text-[10px] font-medium text-amber-500">
          {labels.autograph}
        </span>
      )}
      {card.memorabilia && (
        <span className="inline-flex h-5 items-center rounded-4xl border border-blue-500/50 bg-blue-500/10 px-1.5 py-0 text-[10px] font-medium text-blue-500">
          {labels.memorabilia}
        </span>
      )}
      {card.tradable && (
        <span className="inline-flex h-5 items-center rounded-4xl border border-violet-500/50 bg-violet-500/10 px-1.5 py-0 text-[10px] font-medium text-violet-400">
          {labels.tradable}
        </span>
      )}
    </div>
  );
}
