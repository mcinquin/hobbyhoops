"use client";

import { useEffect, useState } from "react";
import {
  buildInvestmentHolding,
  todayDateKey,
  type CardValuation,
} from "@/lib/investment-portfolio";
import { fetchCardValuations } from "@/lib/investments-client";
import { formatIsoDateLabel } from "@/lib/locale-date";
import { DEFAULT_CURRENCY, formatMoney } from "@/lib/money";
import type { CardListItem } from "@/lib/types";
import { useI18n, useTranslations } from "@/i18n/client";
import { GainLabel } from "./gain-label";

/** Card detail block of an investment card: cost basis, latest value or sale, gain, readings. */
export function CardInvestmentSummary({ card }: { card: CardListItem }) {
  const t = useTranslations();
  const { locale } = useI18n();
  const [valuations, setValuations] = useState<CardValuation[]>([]);

  useEffect(() => {
    let active = true;
    fetchCardValuations(card.id)
      .then((loaded) => {
        if (active) setValuations(loaded);
      })
      .catch(() => {
        if (active) setValuations([]);
      });
    return () => {
      active = false;
    };
  }, [card.id]);

  const holding = buildInvestmentHolding(card, valuations, todayDateKey());
  const currency = holding.currency ?? DEFAULT_CURRENCY;
  const reading = holding.latestValuation;

  return (
    <div
      data-testid="card-investment-summary"
      className="space-y-2 rounded-lg border border-teal-500/30 bg-teal-500/5 p-3"
    >
      <p className="text-xs font-medium text-teal-500">{t("cards.investmentSummary")}</p>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{t("cards.costBasis")}</p>
          <p className="text-sm font-medium tabular-nums">
            {formatMoney(holding.costCents, currency, locale) ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            {holding.isSold ? t("investments.columns.netSale") : t("cards.latestValue")}
          </p>
          <p className="text-sm font-medium tabular-nums">
            {holding.isSold
              ? formatMoney(holding.netSaleCents, currency, locale)
              : reading
                ? formatMoney(reading.valueCents, reading.currency, locale)
                : "—"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {holding.isSold
              ? formatIsoDateLabel(card.soldAt, locale)
              : reading
                ? formatIsoDateLabel(reading.valuedAt, locale)
                : t("investments.noValuation")}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("cards.gain")}</p>
          <GainLabel
            cents={holding.gainCents}
            ratio={holding.gainRatio}
            currency={currency}
            locale={locale}
            className="text-sm font-medium"
          />
        </div>
      </div>
      {valuations.length > 1 ? (
        <p className="text-[11px] text-muted-foreground">
          {t("investments.valuationDialog.history")} :{" "}
          {valuations
            .slice(0, 6)
            .map(
              (valuation) =>
                `${formatMoney(valuation.valueCents, valuation.currency, locale)} (${formatIsoDateLabel(valuation.valuedAt, locale)})`
            )
            .join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
