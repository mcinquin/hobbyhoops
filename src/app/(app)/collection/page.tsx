import { Suspense } from "react";
import {
  getCollectionPage,
  getReferences,
  parseCollectionSearchParams,
} from "@/lib/data";
import { CardTable } from "@/components/card-table";
import { PageHeader } from "@/components/page-header";
import { TablePageSkeleton } from "@/components/skeletons/page-skeletons";
import { getTranslations } from "@/i18n/server";

type CollectionSearchParams = Record<string, string | string[] | undefined>;

function toSearchParams(
  params: CollectionSearchParams
): URLSearchParams {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const raw = Array.isArray(value) ? value[0] : value;
    if (raw) searchParams.set(key, raw);
  }
  return searchParams;
}

async function CollectionTable({
  searchParams,
}: {
  searchParams: CollectionSearchParams;
}) {
  const query = parseCollectionSearchParams(toSearchParams(searchParams));
  const { cards, totalCount, pageCount } = getCollectionPage(query);
  const references = getReferences();

  return (
    <CardTable
      cards={cards}
      totalCount={totalCount}
      pageCount={pageCount}
      references={references}
    />
  );
}

export default async function CollectionPage({
  searchParams,
}: {
  searchParams?: Promise<CollectionSearchParams>;
}) {
  const { t } = await getTranslations();
  const params = (await searchParams) ?? {};

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("collection.title")}
        subtitle={t("collection.subtitle")}
      />
      <Suspense fallback={<TablePageSkeleton />}>
        <CollectionTable searchParams={params} />
      </Suspense>
    </div>
  );
}
