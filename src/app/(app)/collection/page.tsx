import { getCollection } from "@/lib/data";
import { CardTable } from "@/components/card-table";
import { getTranslations } from "@/i18n/server";
import { z } from "zod";

type CollectionSearchParams = Record<string, string | string[] | undefined>;

const filterValueSchema = z.string().trim().max(128).catch("");
const tagSchema = z
  .union([
    z.literal(""),
    z.enum(["rookie", "autograph", "memorabilia", "numbered", "tradable"]),
  ])
  .catch("");

function firstParam(params: CollectionSearchParams, key: string): string {
  const value = params[key];
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function CollectionPage({
  searchParams,
}: {
  searchParams?: Promise<CollectionSearchParams>;
}) {
  const cards = getCollection();
  const { t } = await getTranslations();
  const params = (await searchParams) ?? {};

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
      <CardTable
        cards={cards}
        initialFilters={{
          search: filterValueSchema.parse(firstParam(params, "q")),
          player: filterValueSchema.parse(firstParam(params, "player")),
          team: filterValueSchema.parse(firstParam(params, "team")),
          year: filterValueSchema.parse(firstParam(params, "year")),
          brand: filterValueSchema.parse(firstParam(params, "brand")),
          set: filterValueSchema.parse(firstParam(params, "set")),
          variation: filterValueSchema.parse(firstParam(params, "variation")),
          tag: tagSchema.parse(firstParam(params, "tag")),
        }}
      />
    </div>
  );
}
