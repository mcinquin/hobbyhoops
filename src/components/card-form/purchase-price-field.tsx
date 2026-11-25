"use client";

import { AmountInput } from "@/components/amount-input";
import { Label } from "@/components/ui/label";
import { DEFAULT_CURRENCY, PRICE_CURRENCIES } from "@/lib/money";
import { useTranslations } from "@/i18n/client";
import type { CardFormState } from "./use-card-form-state";

interface PurchasePriceFieldProps {
  formId: string;
  state: Pick<CardFormState, "form" | "update">;
}

/**
 * Purchase price (amount + currency) and purchase fees. Amounts are typed as text and
 * stored in cents; the currency applies to every amount of the card.
 */
export function PurchasePriceField({ formId, state }: PurchasePriceFieldProps) {
  const t = useTranslations();
  const { form, update } = state;
  const currency = form.purchaseCurrency || DEFAULT_CURRENCY;
  const currencies: readonly string[] = PRICE_CURRENCIES.includes(
    currency as (typeof PRICE_CURRENCIES)[number]
  )
    ? PRICE_CURRENCIES
    : [...PRICE_CURRENCIES, currency];

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${formId}-purchasePriceCents`}>
          {t("cards.purchasePriceOptional")}
        </Label>
        <div className="flex gap-2">
          <AmountInput
            id={`${formId}-purchasePriceCents`}
            value={form.purchasePriceCents ?? null}
            onChange={(cents) => update("purchasePriceCents", cents)}
            placeholder={t("cards.purchasePricePlaceholder")}
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
      <div className="space-y-2">
        <Label htmlFor={`${formId}-purchaseFeesCents`}>
          {t("cards.purchaseFeesOptional")}
        </Label>
        <AmountInput
          id={`${formId}-purchaseFeesCents`}
          value={form.purchaseFeesCents ?? null}
          onChange={(cents) => update("purchaseFeesCents", cents)}
          placeholder={t("cards.purchaseFeesPlaceholder")}
        />
      </div>
    </>
  );
}
