import { getCollection } from "@/lib/data";
import { CardTable } from "@/components/card-table";
import { getTranslations } from "@/i18n/server";

export default async function CollectionPage() {
  const cards = getCollection();
  const { t } = await getTranslations();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {t("collection.title")}
        </h2>
        <p className="text-muted-foreground mt-1">
          {t("collection.subtitle")}
        </p>
      </div>
      <CardTable cards={cards} />
    </div>
  );
}
