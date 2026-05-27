import dynamic from "next/dynamic";
import { Suspense } from "react";
import {
  getCollectionPage,
  getReferencesFilterIndex,
  parseCollectionSearchParams,
} from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { TablePageSkeleton } from "@/components/skeletons/page-skeletons";
import { getTranslations } from "@/i18n/server";

const CardTable = dynamic(
  () => import("@/components/card-table").then((mod) => mod.CardTable),
  { loading: () => <TablePageSkeleton /> }
);

type CollectionSearchParams = Record<string, string | string[] | undefined>;

function toSearchParams(
  params: CollectionSearchParams
): URLSearchParams {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry) searchParams.append(key, entry);
      }
    } else if (value) {
      searchParams.set(key, value);
    }
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
  const referenceFilters = getReferencesFilterIndex();

  return (
    <CardTable
      cards={cards}
      totalCount={totalCount}
      pageCount={pageCount}
      referenceFilters={referenceFilters}
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
