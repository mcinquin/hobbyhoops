import { FrNbaTable } from "@/components/guides/fr-nba-table";
import { getFrNbaPlayers } from "@/lib/data";
import { getTranslations } from "@/i18n/server";

export default async function FrNbaPage() {
  const players = getFrNbaPlayers();
  const { t } = await getTranslations();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("guides.frNba.title")}</h2>
        <p className="mt-1 text-muted-foreground">{t("guides.frNba.subtitle")}</p>
      </div>
      <FrNbaTable players={players} />
    </div>
  );
}
