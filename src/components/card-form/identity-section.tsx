"use client";

import type { Card, References } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { useTranslations } from "@/i18n/client";
import { FormCombobox } from "./form-combobox";
import type { UpdateCardField } from "./use-card-form-state";

interface IdentitySectionProps {
  formId: string;
  form: Partial<Card>;
  references: References;
  update: UpdateCardField;
}

/** Card form block: player, team and year (cells of the parent grid). */
export function IdentitySection({
  formId,
  form,
  references,
  update,
}: IdentitySectionProps) {
  const t = useTranslations();
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${formId}-player`}>{t("cards.player")}</Label>
        <FormCombobox
          id={`${formId}-player`}
          value={form.player || ""}
          onChange={(value) => update("player", value)}
          suggestions={references.players}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${formId}-team`}>{t("cards.club")}</Label>
        <FormCombobox
          id={`${formId}-team`}
          value={form.team || ""}
          onChange={(value) => update("team", value)}
          suggestions={references.teams}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${formId}-year`}>{t("cards.year")}</Label>
        <FormCombobox
          id={`${formId}-year`}
          value={form.year || ""}
          onChange={(value) => update("year", value)}
          suggestions={references.years}
        />
      </div>
    </>
  );
}
