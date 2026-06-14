"use client";

import { useMemo } from "react";
import type { FrNbaHolding } from "@/lib/types";
import {
  formatFrNbaHoldingLabel,
  type FrNbaHoldingLabels,
} from "@/lib/fr-nba";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "@/i18n/client";

interface FrNbaHoldingChipsProps {
  holdings: FrNbaHolding[];
  className?: string;
}

export function useFrNbaHoldingLabels(): FrNbaHoldingLabels {
  const t = useTranslations();

  return useMemo(
    () => ({
      types: {
        auto: t("guides.frNba.holdingType.auto"),
        patch: t("guides.frNba.holdingType.patch"),
        rpa: t("guides.frNba.holdingType.rpa"),
        immaculate: t("guides.frNba.holdingType.immaculate"),
      },
      autoStyles: {
        on_card: t("guides.frNba.autoStyle.onCard"),
        sticker: t("guides.frNba.autoStyle.sticker"),
      },
      rookie: t("guides.frNba.rookieShort"),
    }),
    [t]
  );
}

export function FrNbaHoldingChips({
  holdings,
  className,
}: FrNbaHoldingChipsProps) {
  const t = useTranslations();
  const labels = useFrNbaHoldingLabels();

  if (holdings.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className={className ?? "flex flex-wrap gap-1"}>
      {holdings.map((holding) => (
        <Badge
          key={holding.id}
          variant="secondary"
          className="max-w-full whitespace-normal text-left font-normal"
        >
          {formatFrNbaHoldingLabel(holding, labels)}
        </Badge>
      ))}
      <span className="sr-only">
        {t("guides.frNba.holdingsCount", { count: holdings.length })}
      </span>
    </div>
  );
}
