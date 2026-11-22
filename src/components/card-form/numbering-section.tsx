"use client";

import type { Card } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OpeningDateInput } from "@/components/opening-date-input";
import { useTranslations } from "@/i18n/client";
import type { UpdateCardField } from "./use-card-form-state";

interface NumberingSectionProps {
  formId: string;
  form: Partial<Card>;
  update: UpdateCardField;
}

/** Card form block: card number, serial number and opening date. */
export function NumberingSection({ formId, form, update }: NumberingSectionProps) {
  const t = useTranslations();
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${formId}-card-number`}>{t("cards.cardNum")}</Label>
        <Input
          id={`${formId}-card-number`}
          value={form.cardNumber || ""}
          onChange={(e) => update("cardNumber", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${formId}-serial`}>{t("cards.serialNum")}</Label>
        <Input
          id={`${formId}-serial`}
          value={form.serialNumber || ""}
          onChange={(e) => update("serialNumber", e.target.value || null)}
          placeholder={t("cards.placeholderSerial")}
        />
      </div>

      <OpeningDateInput
        id={`${formId}-opening-date`}
        label={t("cards.openingDate")}
        value={form.openingDate ?? null}
        onChange={(value) => update("openingDate", value)}
      />
    </>
  );
}
