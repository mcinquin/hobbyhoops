import { WantedBoard } from "@/components/guides/wanted-board";
import { getWantedBlocks } from "@/lib/data";
import { getTranslations } from "@/i18n/server";

export default async function WantedPage() {
  const blocks = getWantedBlocks();
  const { t } = await getTranslations();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("guides.wanted.title")}</h2>
        <p className="mt-1 text-muted-foreground">{t("guides.wanted.subtitle")}</p>
      </div>
      <WantedBoard blocks={blocks} />
    </div>
  );
}
