"use client";

import { Card } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "@/i18n/client";

interface CardBadgesProps {
  card: Card;
}

export function CardBadges({ card }: CardBadgesProps) {
  const t = useTranslations();

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {card.rookie && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/50 text-emerald-500 bg-emerald-500/10">
          {t("badges.rookie")}
        </Badge>
      )}
      {card.autograph && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/50 text-amber-500 bg-amber-500/10">
          {t("badges.autograph")}
        </Badge>
      )}
      {card.memorabilia && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/50 text-blue-500 bg-blue-500/10">
          {t("badges.memorabilia")}
        </Badge>
      )}
      {card.tradable && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-violet-500/50 text-violet-400 bg-violet-500/10">
          {t("badges.tradable")}
        </Badge>
      )}
    </div>
  );
}
