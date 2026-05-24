import { FrNbaTable } from "@/components/guides/fr-nba-table";
import { PageHeader } from "@/components/page-header";
import { getFrNbaPlayers } from "@/lib/data";
import { getTranslations } from "@/i18n/server";

export default async function FrNbaPage() {
  const players = getFrNbaPlayers();
  const { t } = await getTranslations();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("guides.frNba.title")}
        subtitle={t("guides.frNba.subtitle")}
      />
      <FrNbaTable initialPlayers={players} />
    </div>
  );
}
