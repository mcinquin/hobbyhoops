import dynamic from "next/dynamic";
import {
  getCollectionStats,
  getDashboardChartData,
  getRecentCards,
  getReferences,
  getShipments,
} from "@/lib/data";
import { buildCardBadgeLabels } from "@/lib/card-badge-labels";
import { getTranslations } from "@/i18n/server";
import { PageHeader } from "@/components/page-header";
import { StatsCards } from "@/components/stats-cards";
import { RecentCards } from "@/components/recent-cards";
import { IncomingShipmentsWidget } from "@/components/incoming-shipments-widget";
import { ChartSkeleton } from "@/components/skeletons/page-skeletons";

const DashboardCharts = dynamic(
  () =>
    import("@/components/dashboard-charts").then((mod) => mod.DashboardCharts),
  { loading: () => <ChartSkeleton /> }
);

export default async function DashboardPage() {
  const references = getReferences();
  const [stats, recentCards, activeShipments] = await Promise.all([
    Promise.resolve(getCollectionStats()),
    Promise.resolve(getRecentCards(8)),
    Promise.resolve(getShipments(false)),
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
      <IncomingShipmentsWidget
        shipments={activeShipments}
        locale={locale}
        labels={{
          title: t("dashboard.incoming.title"),
          activeCount: t("dashboard.incoming.activeCount", {
            count: activeShipments.length,
          }),
          viewAll: t("dashboard.incoming.viewAll"),
          alertOne: t("dashboard.incoming.alertOne"),
          alertMany: t("dashboard.incoming.alertMany"),
          empty: t("dashboard.incoming.empty"),
          protectionDays: t("dashboard.incoming.protectionDays"),
          protectionDay: t("dashboard.incoming.protectionDay"),
          protectionExpired: t("dashboard.incoming.protectionExpired"),
        }}
      />
      <DashboardCharts
        chartData={getDashboardChartData(references, locale)}
      />
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
