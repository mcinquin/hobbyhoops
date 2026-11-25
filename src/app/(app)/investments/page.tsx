import dynamic from "next/dynamic";
import { ChevronDown } from "lucide-react";
import { getCollectionSpending, getCollectionStats, getInvestmentPortfolio } from "@/lib/data";
import { getTranslations } from "@/i18n/server";
import { PageHeader } from "@/components/page-header";
import { CollectionSpendingSection } from "@/components/collection-spending-section";
import { InvestmentKpis } from "@/components/investments/investment-kpis";
import { InvestmentHoldings } from "@/components/investments/investment-holdings";

const InvestmentValueChart = dynamic(
  () =>
    import("@/components/investments/investment-value-chart").then(
      (mod) => mod.InvestmentValueChart
    ),
  { loading: () => <div className="h-[240px] animate-pulse rounded-md bg-muted/40" /> }
);

/** Investments page: portfolio figures, value chart, held and sold cards. */
export default async function InvestmentsPage() {
  const { t, locale } = await getTranslations();
  const portfolio = getInvestmentPortfolio(locale);
  const stats = getCollectionStats();
  const hasCards = portfolio.held.length + portfolio.sold.length > 0;

  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      <PageHeader title={t("investments.title")} subtitle={t("investments.subtitle")} />

      {hasCards ? (
        <>
          <InvestmentKpis portfolio={portfolio} />

          {portfolio.currency && portfolio.history.length > 1 ? (
            <section className="min-w-0 rounded-lg border border-border bg-card p-4 sm:p-6">
              <h2 className="mb-4 text-sm font-medium text-muted-foreground">
                {t("investments.chart.title", { currency: portfolio.currency })}
              </h2>
              <InvestmentValueChart data={portfolio.history} currency={portfolio.currency} />
            </section>
          ) : null}

          <InvestmentHoldings held={portfolio.held} sold={portfolio.sold} />
        </>
      ) : (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {t("investments.empty")}
        </p>
      )}

      <details className="group min-w-0">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          {t("investments.spending.title")}
        </summary>
        <div className="mt-4">
          <CollectionSpendingSection spending={getCollectionSpending(stats.total, locale)} />
        </div>
      </details>
    </div>
  );
}
