"use client";

import { AmountInput } from "@/components/amount-input";
import { IsoDateInput } from "@/components/iso-date-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_CURRENCY } from "@/lib/money";
import { useTranslations } from "@/i18n/client";
import type { CardFormState } from "./use-card-form-state";

interface InvestmentSectionProps {
  formId: string;
  state: Pick<CardFormState, "form" | "update">;
}

/** "Investment" switch and, for an investment card, its sale (date, price, fees). */
export function InvestmentSection({ formId, state }: InvestmentSectionProps) {
  const t = useTranslations();
  const { form, update } = state;
  const id = (field: string) => `${formId}-${field}`;
  const currency = form.purchaseCurrency || DEFAULT_CURRENCY;

  return (
    <div className="col-span-2 space-y-3 rounded-lg border border-border/70 p-3">
      <div className="flex items-start gap-2">
        <Switch
          id={id("investment")}
          checked={form.investment || false}
          onCheckedChange={(value) => update("investment", value)}
        />
        <div className="min-w-0">
          <Label htmlFor={id("investment")}>{t("cards.investment")}</Label>
          <p className="text-xs text-muted-foreground">{t("cards.investmentHint")}</p>
        </div>
      </div>

      {form.investment ? (
        <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <legend className="mb-2 text-sm font-medium">{t("cards.saleSection")}</legend>
          <IsoDateInput
            id={id("soldAt")}
            label={t("cards.soldAt")}
            value={form.soldAt ?? null}
            onChange={(value) => update("soldAt", value)}
          />
          <div className="space-y-1">
            <Label htmlFor={id("salePriceCents")}>
              {t("cards.salePrice")} ({currency})
            </Label>
            <AmountInput
              id={id("salePriceCents")}
              value={form.salePriceCents ?? null}
              onChange={(cents) => update("salePriceCents", cents)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={id("saleFeesCents")}>
              {t("cards.saleFees")} ({currency})
            </Label>
            <AmountInput
              id={id("saleFeesCents")}
              value={form.saleFeesCents ?? null}
              onChange={(cents) => update("saleFeesCents", cents)}
            />
          </div>
        </fieldset>
      ) : null}
    </div>
  );
}
