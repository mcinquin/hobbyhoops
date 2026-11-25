import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import type { InvestmentPortfolio } from "@/lib/investment-portfolio";
import { formatMoney } from "@/lib/money";
import { getTranslations } from "@/i18n/server";
import { GainLabel } from "./gain-label";

interface InvestmentSummaryTileProps {
  portfolio: InvestmentPortfolio;
}

/** Dashboard summary of the investment portfolio (main currency), linking to its page. */
export async function InvestmentSummaryTile({ portfolio }: InvestmentSummaryTileProps) {
  const { t, locale } = await getTranslations();
  const main = portfolio.totals[0];
  const ratio = main && main.investedCents > 0 ? main.unrealizedGainCents / main.investedCents : null;

  return (
    <section
      data-testid="investment-summary"
      className="min-w-0 space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6"
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-500">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-medium">{t("dashboard.investments.title")}</h2>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.investments.subtitle", {
                held: portfolio.held.length,
                sold: portfolio.sold.length,
              })}
            </p>
          </div>
        </div>
        <Link
          href="/investments"
          className="inline-flex items-center gap-1 text-sm text-teal-500 hover:underline"
        >
          {t("dashboard.investments.viewAll")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {main ? (
        <dl className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={t("dashboard.investments.invested")}>
            {formatMoney(main.investedCents, main.currency, locale)}
          </Stat>
          <Stat label={t("dashboard.investments.value")}>
            {formatMoney(main.currentValueCents, main.currency, locale)}
          </Stat>
          <Stat label={t("dashboard.investments.unrealized")}>
            <GainLabel
              cents={main.unrealizedGainCents}
              ratio={ratio}
              currency={main.currency}
              locale={locale}
            />
          </Stat>
          <Stat label={t("dashboard.investments.realized")}>
            <GainLabel cents={main.realizedGainCents} currency={main.currency} locale={locale} />
          </Stat>
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">{t("dashboard.investments.empty")}</p>
      )}
    </section>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/70 p-3">
      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
      <dd className="text-base font-bold tabular-nums sm:text-lg">{children}</dd>
    </div>
  );
}
