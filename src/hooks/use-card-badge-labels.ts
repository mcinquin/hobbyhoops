"use client";

import { useMemo } from "react";
import type { CardBadgeLabels } from "@/components/card-badges";
import { buildCardBadgeLabels } from "@/lib/card-badge-labels";
import { useTranslations } from "@/i18n/client";

/** Memoised translated card badge labels. */
export function useCardBadgeLabels(): CardBadgeLabels {
  const t = useTranslations();
  return useMemo(() => buildCardBadgeLabels(t), [t]);
}
