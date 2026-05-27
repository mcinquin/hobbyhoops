import dynamic from "next/dynamic";
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

const DashboardCharts = dynamic(
  () =>
    import("@/components/dashboard-charts").then((mod) => mod.DashboardCharts),
  { loading: () => <ChartSkeleton /> }
);

export default async function DashboardPage() {
  const references = getReferences();
  const stats = getCollectionStats();
  const recentCards = getRecentCards(8);
  const chartData = getDashboardChartData(references);
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
      <DashboardCharts chartData={chartData} />
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
