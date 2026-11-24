import dynamic from "next/dynamic";
import { Wallet } from "lucide-react";
import type { CollectionSpending, SpendingAverageRow } from "@/lib/collection-spending";
import { formatMoney } from "@/lib/money";
import { getTranslations } from "@/i18n/server";

const SpendingChart = dynamic(
  () => import("@/components/spending-chart").then((mod) => mod.SpendingChart),
  { loading: () => <div className="h-[220px] animate-pulse rounded-md bg-muted/40" /> }
);

interface CollectionSpendingSectionProps {
  spending: CollectionSpending;
}

/** Dashboard section: total purchase cost, monthly spending and average cost per brand / set. */
export async function CollectionSpendingSection({
  spending,
}: CollectionSpendingSectionProps) {
  const { t, locale } = await getTranslations();
  const { currency, totals, pricedCount, unpricedCount, averageCents } = spending;
  const [mainTotal, ...otherTotals] = totals;

  return (
    <section className="min-w-0 space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
          <Wallet className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-medium">{t("dashboard.spending.title")}</h2>
          <p className="text-xs text-muted-foreground">
            {t("dashboard.spending.pricedCount", {
              priced: pricedCount,
              unpriced: unpricedCount,
            })}
          </p>
        </div>
      </div>

      {mainTotal ? (
        <>
          <div className="grid min-w-0 grid-cols-2 gap-3">
            <div className="min-w-0 rounded-lg border border-border/70 p-3 sm:p-4">
              <p className="truncate text-xs text-muted-foreground">
                {t("dashboard.spending.total")}
              </p>
              <p className="text-xl font-bold text-emerald-500 sm:text-2xl">
                {formatMoney(mainTotal.totalCents, mainTotal.currency, locale)}
              </p>
              {otherTotals.length > 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  +{" "}
                  {otherTotals
                    .map((entry) => formatMoney(entry.totalCents, entry.currency, locale))
                    .join(" · ")}
                </p>
              ) : null}
            </div>
            <div className="min-w-0 rounded-lg border border-border/70 p-3 sm:p-4">
              <p className="truncate text-xs text-muted-foreground">
                {t("dashboard.spending.average")}
              </p>
              <p className="text-xl font-bold sm:text-2xl">
                {formatMoney(averageCents, currency, locale) ?? "—"}
              </p>
            </div>
          </div>

          {currency && spending.monthly.length > 0 ? (
            <div className="min-w-0">
              <h3 className="mb-4 text-sm font-medium text-muted-foreground">
                {t("dashboard.spending.byMonth", { currency })}
              </h3>
              <SpendingChart data={spending.monthly} currency={currency} />
            </div>
          ) : null}

          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <AverageList
              title={t("dashboard.spending.averageByBrand", { currency: currency ?? "" })}
              rows={spending.byBrand}
              currency={currency}
              locale={locale}
              countLabel={(count) => t("dashboard.spending.cardCount", { count })}
            />
            <AverageList
              title={t("dashboard.spending.averageBySet", { currency: currency ?? "" })}
              rows={spending.bySet}
              currency={currency}
              locale={locale}
              countLabel={(count) => t("dashboard.spending.cardCount", { count })}
            />
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t("dashboard.spending.empty")}</p>
      )}
    </section>
  );
}

function AverageList({
  title,
  rows,
  currency,
  locale,
  countLabel,
}: {
  title: string;
  rows: SpendingAverageRow[];
  currency: string | null;
  locale: "fr" | "en";
  countLabel: (count: number) => string;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="min-w-0">
      <h3 className="mb-2 text-sm font-medium text-muted-foreground">{title}</h3>
      <ul className="divide-y divide-border/70 rounded-lg border border-border/70">
        {rows.map((row) => (
          <li
            key={row.name}
            className="flex min-w-0 items-center justify-between gap-3 px-3 py-2 text-sm"
          >
            <span className="min-w-0 truncate">{row.name}</span>
            <span className="shrink-0 text-right tabular-nums">
              <span className="font-medium">
                {formatMoney(row.averageCents, currency, locale)}
              </span>
              <span className="ml-2 text-xs text-muted-foreground">
                {countLabel(row.count)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
