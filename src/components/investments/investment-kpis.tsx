import { formatMoney } from "@/lib/money";
import type { InvestmentPortfolio } from "@/lib/investment-portfolio";
import { getTranslations } from "@/i18n/server";
import { GainLabel } from "./gain-label";

interface InvestmentKpisProps {
  portfolio: InvestmentPortfolio;
}

function ratioOf(gain: number, cost: number): number | null {
  return cost > 0 ? gain / cost : null;
}

/** Investments page headline figures (main currency), other currencies listed below. */
export async function InvestmentKpis({ portfolio }: InvestmentKpisProps) {
  const { t, locale } = await getTranslations();
  const [main, ...others] = portfolio.totals;
  if (!main) return null;

  const heldCount = portfolio.held.filter((holding) => holding.currency === main.currency).length;
  const soldCount = portfolio.sold.filter((holding) => holding.currency === main.currency).length;
  const tiles = [
    {
      id: "invested",
      label: t("investments.kpi.invested"),
      value: formatMoney(main.investedCents, main.currency, locale),
      hint: t("investments.kpi.investedHint", { count: heldCount }),
    },
    {
      id: "value",
      label: t("investments.kpi.currentValue"),
      value: formatMoney(main.currentValueCents, main.currency, locale),
      hint:
        portfolio.unvaluedCount > 0
          ? t("investments.kpi.currentValueHint", { count: portfolio.unvaluedCount })
          : null,
    },
    {
      id: "unrealized",
      label: t("investments.kpi.unrealized"),
      gain: main.unrealizedGainCents,
      ratio: ratioOf(main.unrealizedGainCents, main.investedCents),
    },
    {
      id: "realized",
      label: t("investments.kpi.realized"),
      gain: main.realizedGainCents,
      ratio: ratioOf(main.realizedGainCents, main.soldCostCents),
      hint: t("investments.kpi.realizedHint", { count: soldCount }),
    },
  ];

  return (
    <section className="min-w-0 space-y-3" aria-label={t("investments.title")}>
      <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {tiles.map((tile) => (
          <div
            key={tile.id}
            data-testid={`investment-kpi-${tile.id}`}
            className="min-w-0 rounded-lg border border-border bg-card p-3 sm:p-4"
          >
            <p className="truncate text-xs text-muted-foreground">{tile.label}</p>
            {"gain" in tile ? (
              <GainLabel
                cents={tile.gain ?? null}
                ratio={tile.ratio}
                currency={main.currency}
                locale={locale}
                className="block text-lg font-bold sm:text-2xl"
              />
            ) : (
              <p className="text-lg font-bold tabular-nums sm:text-2xl">{tile.value}</p>
            )}
            {tile.hint ? (
              <p className="mt-1 text-xs text-muted-foreground">{tile.hint}</p>
            ) : null}
          </div>
        ))}
      </div>

      {others.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("investments.kpi.otherCurrencies")} :{" "}
          {others
            .map(
              (totals) =>
                `${formatMoney(totals.currentValueCents, totals.currency, locale)} / ${formatMoney(
                  totals.investedCents,
                  totals.currency,
                  locale
                )}`
            )
            .join(" · ")}
        </p>
      ) : null}
      {portfolio.unpricedCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("investments.kpi.unpriced", { count: portfolio.unpricedCount })}
        </p>
      ) : null}
    </section>
  );
}
