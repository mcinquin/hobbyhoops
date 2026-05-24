import { WantedBoard } from "@/components/guides/wanted-board";
import { PageHeader } from "@/components/page-header";
import { getWantedBlocks } from "@/lib/data";
import { getTranslations } from "@/i18n/server";

export default async function WantedPage() {
  const blocks = getWantedBlocks();
  const { t } = await getTranslations();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("guides.wanted.title")}
        subtitle={t("guides.wanted.subtitle")}
      />
      <WantedBoard initialBlocks={blocks} />
    </div>
  );
}
