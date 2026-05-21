import dynamic from "next/dynamic";
import { Suspense } from "react";
import { getCollection } from "@/lib/data";
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
  const cards = getCollection();
  const { t, locale } = await getTranslations();
  const badgeLabels = {
    rookie: t("badges.rookie"),
    autograph: t("badges.autograph"),
    memorabilia: t("badges.memorabilia"),
    numbered: t("badges.numbered"),
    tradable: t("badges.tradable"),
  };

  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      <PageHeader
        title={t("dashboard.title")}
        subtitle={t("dashboard.subtitle")}
      />

      <StatsCards
        cards={cards}
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
        <DashboardCharts cards={cards} />
      </Suspense>
      <RecentCards
        cards={cards}
        title={t("dashboard.recentAdditions")}
        badgeLabels={badgeLabels}
        locale={locale}
        emptyLabel={t("dashboard.noRecent")}
      />
    </div>
  );
}
