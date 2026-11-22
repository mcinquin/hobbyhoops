"use client";

import type { Card } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTranslations } from "@/i18n/client";
import { PrefillMarker } from "./field-label";
import type { UpdateCardField } from "./use-card-form-state";

export type FlagField = "rookie" | "autograph" | "memorabilia" | "tradable" | "wnba";

const FLAG_LABEL_KEYS: Record<FlagField, string> = {
  rookie: "badges.rookie",
  autograph: "cards.autograph",
  memorabilia: "cards.memorabiliaLabel",
  tradable: "cards.tradable",
  wnba: "badges.wnba",
};

interface FlagsSectionProps {
  fields: readonly FlagField[];
  form: Partial<Card>;
  update: UpdateCardField;
  isPrefilled: (field: keyof Card) => boolean;
}

/** Card form switches for the given flags (Rookie, Auto, Memo, Tradable, WNBA), on a full row. */
export function FlagsSection({ fields, form, update, isPrefilled }: FlagsSectionProps) {
  const t = useTranslations();
  return (
    <div className="col-span-2 flex flex-wrap gap-6">
      {fields.map((field) => (
        <div key={field} className="flex items-center gap-2">
          <Switch
            checked={form[field] || false}
            onCheckedChange={(v) => update(field, v)}
          />
          <Label>{t(FLAG_LABEL_KEYS[field])}</Label>
          {isPrefilled(field) ? <PrefillMarker /> : null}
        </div>
      ))}
    </div>
  );
}
