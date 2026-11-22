"use client";

import type { Card } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/i18n/client";
import { FieldLabel } from "./field-label";
import { FlagsSection } from "./flags-section";
import type { CardFormState } from "./use-card-form-state";

interface NumberingSectionProps {
  formId: string;
  state: Pick<CardFormState, "form" | "update" | "updateSerialNumber" | "isPrefilled">;
}

/** Catalog step block: card number, serial number (`12/99`), Autograph and Memorabilia. */
export function NumberingSection({ formId, state }: NumberingSectionProps) {
  const t = useTranslations();
  const { form, update, updateSerialNumber, isPrefilled } = state;
  const id = (field: keyof Card) => `${formId}-${field}`;
  return (
    <>
      <div className="space-y-2">
        <FieldLabel htmlFor={id("cardNumber")} isPrefilled={isPrefilled("cardNumber")}>
          {t("cards.cardNum")}
        </FieldLabel>
        <Input
          id={id("cardNumber")}
          value={form.cardNumber || ""}
          onChange={(e) => update("cardNumber", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor={id("serialNumber")} isPrefilled={isPrefilled("serialNumber")}>
          {t("cards.serialNum")}
        </FieldLabel>
        <Input
          id={id("serialNumber")}
          value={form.serialNumber || ""}
          onChange={(e) => updateSerialNumber(e.target.value || null)}
          placeholder={t("cards.placeholderSerial")}
        />
      </div>

      <FlagsSection
        fields={["autograph", "memorabilia"]}
        form={form}
        update={update}
        isPrefilled={isPrefilled}
      />
    </>
  );
}
