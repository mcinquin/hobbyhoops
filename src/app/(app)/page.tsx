import dynamic from "next/dynamic";
import { getCollection } from "@/lib/data";
import { getTranslations } from "@/i18n/server";
import { StatsCards } from "@/components/stats-cards";
import { RecentCards } from "@/components/recent-cards";

const DashboardCharts = dynamic(() =>
  import("@/components/dashboard-charts").then((mod) => mod.DashboardCharts)
);

export default async function DashboardPage() {
  const cards = getCollection();
  const { t } = await getTranslations();
  const badgeLabels = {
    rookie: t("badges.rookie"),
    autograph: t("badges.autograph"),
    memorabilia: t("badges.memorabilia"),
    tradable: t("badges.tradable"),
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {t("dashboard.title")}
        </h2>
        <p className="text-muted-foreground mt-1">{t("dashboard.subtitle")}</p>
      </div>

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
      <DashboardCharts cards={cards} />
      <RecentCards
        cards={cards}
        title={t("dashboard.recentAdditions")}
        badgeLabels={badgeLabels}
      />
    </div>
  );
}
