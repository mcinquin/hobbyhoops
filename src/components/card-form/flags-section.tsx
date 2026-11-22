"use client";

import type { Card } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTranslations } from "@/i18n/client";
import type { UpdateCardField } from "./use-card-form-state";

type FlagField = "rookie" | "autograph" | "memorabilia" | "tradable" | "wnba";

const FLAG_LABEL_KEYS: ReadonlyArray<[FlagField, string]> = [
  ["rookie", "badges.rookie"],
  ["autograph", "cards.autograph"],
  ["memorabilia", "cards.memorabiliaLabel"],
  ["tradable", "cards.tradable"],
  ["wnba", "badges.wnba"],
];

interface FlagsSectionProps {
  form: Partial<Card>;
  update: UpdateCardField;
}

/** Card form block: Rookie, Auto, Memo, Tradable and WNBA switches. */
export function FlagsSection({ form, update }: FlagsSectionProps) {
  const t = useTranslations();
  return (
    <div className="flex flex-wrap gap-6 pt-2">
      {FLAG_LABEL_KEYS.map(([field, labelKey]) => (
        <div key={field} className="flex items-center gap-2">
          <Switch
            checked={form[field] || false}
            onCheckedChange={(v) => update(field, v)}
          />
          <Label>{t(labelKey)}</Label>
        </div>
      ))}
    </div>
  );
}
