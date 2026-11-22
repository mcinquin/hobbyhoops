"use client";

import type { Card, References } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "@/i18n/client";
import { FormCombobox } from "./form-combobox";
import type { UpdateCardField } from "./use-card-form-state";

interface ConditionSectionProps {
  form: Partial<Card>;
  references: References;
  update: UpdateCardField;
  gradingNote: string;
  onGradingNoteChange: (note: string) => void;
}

/** Card form block: grading company, grade note, protection and storage. */
export function ConditionSection({
  form,
  references,
  update,
  gradingNote,
  onGradingNoteChange,
}: ConditionSectionProps) {
  const t = useTranslations();
  const company = form.grading || "Ungraded";
  return (
    <>
      <div className="space-y-2">
        <Label>{t("cards.grading")}</Label>
        <select
          value={company}
          onChange={(e) => {
            const next = e.target.value;
            update("grading", next);
            if (next === "Ungraded") {
              onGradingNoteChange("");
            }
          }}
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          {references.gradings.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label>{t("cards.gradeNote")}</Label>
        <Input
          value={gradingNote}
          onChange={(e) => onGradingNoteChange(e.target.value)}
          placeholder={t("cards.placeholderGrade")}
          disabled={company === "Ungraded"}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("cards.protectionOptional")}</Label>
        <FormCombobox
          value={form.protection || ""}
          onChange={(value) => update("protection", value)}
          suggestions={references.protections}
          clearOptionLabel={t("cards.selectNone")}
          placeholder={t("cards.selectNone")}
        />
      </div>

      <div className="space-y-2 col-span-2">
        <Label>{t("cards.storageOptional")}</Label>
        <FormCombobox
          value={form.storage || ""}
          onChange={(value) => update("storage", value)}
          suggestions={references.storages}
          clearOptionLabel={t("cards.selectNone")}
          placeholder={t("cards.selectNone")}
        />
      </div>
    </>
  );
}
