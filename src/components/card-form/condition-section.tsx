"use client";

import type { Card, References } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OpeningDateInput } from "@/components/opening-date-input";
import { useTranslations } from "@/i18n/client";
import { FormCombobox } from "./form-combobox";
import { FlagsSection } from "./flags-section";
import type { CardFormState } from "./use-card-form-state";

interface ConditionSectionProps {
  formId: string;
  references: References;
  state: Pick<
    CardFormState,
    "form" | "update" | "isPrefilled" | "gradingNote" | "setGradingNote"
  >;
}

/**
 * Condition & storage step: opening date, grading company and grade note,
 * protection, storage, Tradable and notes.
 */
export function ConditionSection({ formId, references, state }: ConditionSectionProps) {
  const t = useTranslations();
  const { form, update, isPrefilled, gradingNote, setGradingNote } = state;
  const id = (field: keyof Card | "gradingNote") => `${formId}-${field}`;
  const company = form.grading || "Ungraded";
  return (
    <>
      <OpeningDateInput
        id={id("openingDate")}
        label={t("cards.openingDate")}
        value={form.openingDate ?? null}
        onChange={(value) => update("openingDate", value)}
      />

      <div className="space-y-2">
        <Label htmlFor={id("protection")}>{t("cards.protectionOptional")}</Label>
        <FormCombobox
          id={id("protection")}
          value={form.protection || ""}
          onChange={(value) => update("protection", value)}
          suggestions={references.protections}
          clearOptionLabel={t("cards.selectNone")}
          placeholder={t("cards.selectNone")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={id("grading")}>{t("cards.grading")}</Label>
        <select
          id={id("grading")}
          value={company}
          onChange={(e) => {
            const next = e.target.value;
            update("grading", next);
            if (next === "Ungraded") {
              setGradingNote("");
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
        <Label htmlFor={id("gradingNote")}>{t("cards.gradeNote")}</Label>
        <Input
          id={id("gradingNote")}
          value={gradingNote}
          onChange={(e) => setGradingNote(e.target.value)}
          placeholder={t("cards.placeholderGrade")}
          disabled={company === "Ungraded"}
        />
      </div>

      <div className="space-y-2 col-span-2">
        <Label htmlFor={id("storage")}>{t("cards.storageOptional")}</Label>
        <FormCombobox
          id={id("storage")}
          value={form.storage || ""}
          onChange={(value) => update("storage", value)}
          suggestions={references.storages}
          clearOptionLabel={t("cards.selectNone")}
          placeholder={t("cards.selectNone")}
        />
      </div>

      <FlagsSection
        fields={["tradable"]}
        form={form}
        update={update}
        isPrefilled={isPrefilled}
      />

      <div className="space-y-2 col-span-2">
        <Label htmlFor={id("notes")}>{t("cards.notesOptional")}</Label>
        <textarea
          id={id("notes")}
          value={form.notes || ""}
          onChange={(e) => update("notes", e.target.value)}
          rows={3}
          maxLength={2000}
          className="w-full min-h-[4.5rem] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
          placeholder={t("cards.notesPlaceholder")}
        />
      </div>
    </>
  );
}
