import type { CardBadgeLabels } from "@/components/card-badges";

type TranslateFn = (key: string) => string;

export function buildCardBadgeLabels(t: TranslateFn): CardBadgeLabels {
  return {
    rookie: t("badges.rookie"),
    autograph: t("badges.autograph"),
    memorabilia: t("badges.memorabilia"),
    numbered: t("badges.numbered"),
    tradable: t("badges.tradable"),
  };
}
