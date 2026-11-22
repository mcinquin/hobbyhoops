"use client";

import type { Card, References } from "@/lib/types";
import { useTranslations } from "@/i18n/client";
import { FieldLabel } from "./field-label";
import { FlagsSection } from "./flags-section";
import { FormCombobox } from "./form-combobox";
import type { CardFormState } from "./use-card-form-state";

interface IdentitySectionProps {
  formId: string;
  references: References;
  state: Pick<CardFormState, "form" | "update" | "isPrefilled">;
}

/** Identity step: player (required), team, year, Rookie and WNBA. */
export function IdentitySection({ formId, references, state }: IdentitySectionProps) {
  const t = useTranslations();
  const { form, update, isPrefilled } = state;
  const id = (field: keyof Card) => `${formId}-${field}`;
  return (
    <>
      <div className="space-y-2">
        <FieldLabel htmlFor={id("player")} isPrefilled={isPrefilled("player")}>
          {t("cards.player")}
        </FieldLabel>
        <FormCombobox
          id={id("player")}
          value={form.player || ""}
          onChange={(value) => update("player", value)}
          suggestions={references.players}
          required
        />
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor={id("team")}>{t("cards.club")}</FieldLabel>
        <FormCombobox
          id={id("team")}
          value={form.team || ""}
          onChange={(value) => update("team", value)}
          suggestions={references.teams}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor={id("year")} isPrefilled={isPrefilled("year")}>
          {t("cards.year")}
        </FieldLabel>
        <FormCombobox
          id={id("year")}
          value={form.year || ""}
          onChange={(value) => update("year", value)}
          suggestions={references.years}
        />
      </div>

      <FlagsSection
        fields={["rookie", "wnba"]}
        form={form}
        update={update}
        isPrefilled={isPrefilled}
      />
    </>
  );
}
