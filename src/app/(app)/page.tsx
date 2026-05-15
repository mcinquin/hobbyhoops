import { getCollection } from "@/lib/data";
import { getTranslations } from "@/i18n/server";
import { StatsCards } from "@/components/stats-cards";
import { DashboardCharts } from "@/components/dashboard-charts";
import { RecentCards } from "@/components/recent-cards";

export default async function DashboardPage() {
  const cards = getCollection();
  const { t } = await getTranslations();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {t("dashboard.title")}
        </h2>
        <p className="text-muted-foreground mt-1">{t("dashboard.subtitle")}</p>
      </div>

      <StatsCards cards={cards} />
      <DashboardCharts cards={cards} />
      <RecentCards cards={cards} />
    </div>
  );
}
