"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_CURRENCY,
  formatCentsAsAmount,
  parseAmountToCents,
  PRICE_CURRENCIES,
} from "@/lib/money";
import { useTranslations } from "@/i18n/client";
import type { CardFormState } from "./use-card-form-state";

interface PurchasePriceFieldProps {
  formId: string;
  state: Pick<CardFormState, "form" | "update">;
}

/** Whether the typed amount already matches the form value (NaN = invalid input kept as typed). */
function isInSync(text: string, cents: number | null): boolean {
  const parsed = parseAmountToCents(text);
  if (cents != null && Number.isNaN(cents)) return true;
  return parsed === cents;
}

/**
 * Purchase price (amount + currency). The amount is typed as text and stored in cents;
 * an unparseable amount is stored as `NaN` so step validation reports it on this field.
 */
export function PurchasePriceField({ formId, state }: PurchasePriceFieldProps) {
  const t = useTranslations();
  const { form, update } = state;
  const cents = form.purchasePriceCents ?? null;
  const [text, setText] = useState(() => formatCentsAsAmount(cents));

  // Resync when the value changes from outside (prefill, reset).
  if (!isInSync(text, cents)) {
    setText(formatCentsAsAmount(cents));
  }

  const currency = form.purchaseCurrency || DEFAULT_CURRENCY;
  const currencies: readonly string[] = PRICE_CURRENCIES.includes(
    currency as (typeof PRICE_CURRENCIES)[number]
  )
    ? PRICE_CURRENCIES
    : [...PRICE_CURRENCIES, currency];
  const isInvalid = cents != null && Number.isNaN(cents);

  return (
    <div className="space-y-2 col-span-2">
      <Label htmlFor={`${formId}-purchasePriceCents`}>
        {t("cards.purchasePriceOptional")}
      </Label>
      <div className="flex gap-2">
        <Input
          id={`${formId}-purchasePriceCents`}
          inputMode="decimal"
          autoComplete="off"
          value={text}
          aria-invalid={isInvalid || undefined}
          placeholder={t("cards.purchasePricePlaceholder")}
          onChange={(e) => {
            setText(e.target.value);
            update("purchasePriceCents", parseAmountToCents(e.target.value));
          }}
          className="flex-1"
        />
        <select
          id={`${formId}-purchaseCurrency`}
          aria-label={t("cards.purchaseCurrency")}
          value={currency}
          onChange={(e) => update("purchaseCurrency", e.target.value)}
          className="h-9 w-24 rounded-md border border-input bg-background px-2 text-sm"
        >
          {currencies.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
