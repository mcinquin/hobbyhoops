import { Suspense } from "react";
import {
  getCollectionStats,
  getDashboardChartData,
  getRecentCards,
  getReferences,
} from "@/lib/data";
import { buildCardBadgeLabels } from "@/lib/card-badge-labels";
import { getTranslations } from "@/i18n/server";
import { PageHeader } from "@/components/page-header";
import { StatsCards } from "@/components/stats-cards";
import { RecentCards } from "@/components/recent-cards";
import { ChartSkeleton } from "@/components/skeletons/page-skeletons";
import { DashboardCharts } from "@/components/dashboard-charts";
import type { References } from "@/lib/types";

async function DashboardChartsBlock({
  references,
}: {
  references: References;
}) {
  const chartData = getDashboardChartData(references);
  return <DashboardCharts chartData={chartData} />;
}

export default async function DashboardPage() {
  const references = getReferences();
  const [stats, recentCards] = await Promise.all([
    Promise.resolve(getCollectionStats()),
    Promise.resolve(getRecentCards(8)),
  ]);
  const { t, locale } = await getTranslations();
  const badgeLabels = buildCardBadgeLabels(t);

  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      <PageHeader
        title={t("dashboard.title")}
        subtitle={t("dashboard.subtitle")}
      />

      <StatsCards
        stats={stats}
        labels={{
          total: t("dashboard.stats.total"),
          autographs: t("dashboard.stats.autographs"),
          memorabilia: t("dashboard.stats.memorabilia"),
          numbered: t("dashboard.stats.numbered"),
          rookies: t("dashboard.stats.rookies"),
          tradable: t("dashboard.stats.tradable"),
        }}
      />
      <Suspense fallback={<ChartSkeleton />}>
        <DashboardChartsBlock references={references} />
      </Suspense>
      <RecentCards
        cards={recentCards}
        title={t("dashboard.recentAdditions")}
        badgeLabels={badgeLabels}
        locale={locale}
        emptyLabel={t("dashboard.noRecent")}
      />
    </div>
  );
}
