import { z } from "zod";
import type { References } from "@/lib/types";

export const COLLECTION_PAGE_SIZE = 50;
export const COLLECTION_MAX_PAGE_SIZE = 100;
export const ADMIN_CARDS_PAGE_SIZE = 30;

export type CollectionTagValue =
  | "rookie"
  | "autograph"
  | "memorabilia"
  | "numbered"
  | "tradable";

export const COLLECTION_TAG_VALUES: CollectionTagValue[] = [
  "rookie",
  "autograph",
  "memorabilia",
  "numbered",
  "tradable",
];

export type CollectionSortKey =
  | "player"
  | "team"
  | "year"
  | "brand"
  | "set"
  | "variation"
  | "serialNumber"
  | "grading";

const sortKeySchema = z.enum([
  "player",
  "team",
  "year",
  "brand",
  "set",
  "variation",
  "serialNumber",
  "grading",
]);

const tagValueSchema = z.enum([
  "rookie",
  "autograph",
  "memorabilia",
  "numbered",
  "tradable",
]);

const filterValueSchema = z.string().trim().max(128).catch("");

function parseCollectionTags(params: URLSearchParams): CollectionTagValue[] {
  const seen = new Set<CollectionTagValue>();
  const tags: CollectionTagValue[] = [];
  for (const raw of params.getAll("tag")) {
    const parsed = tagValueSchema.safeParse(raw);
    if (parsed.success && !seen.has(parsed.data)) {
      seen.add(parsed.data);
      tags.push(parsed.data);
    }
  }
  return tags;
}

export interface CollectionListQuery {
  search: string;
  player: string;
  team: string;
  year: string;
  brand: string;
  set: string;
  variation: string;
  /** Filtres cumulés (ET) : ex. rookie + autograph = RC et Auto. */
  tags: CollectionTagValue[];
  page: number;
  pageSize: number;
  sort: CollectionSortKey;
  sortDesc: boolean;
}

export interface CollectionSqlClause {
  whereSql: string;
  params: (string | number)[];
}

export const COLLECTION_SORT_SQL: Record<CollectionSortKey, string> = {
  player: "player",
  team: "team",
  year: "year",
  brand: "brand",
  set: "set_name",
  variation: "variation",
  serialNumber: "serial_number",
  grading: "grading",
};

function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

export function parseCollectionSearchParams(
  params: URLSearchParams
): CollectionListQuery {
  const pageRaw = Number.parseInt(params.get("page") ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const pageSizeRaw = Number.parseInt(params.get("pageSize") ?? "", 10);
  const pageSize =
    Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
      ? Math.min(pageSizeRaw, COLLECTION_MAX_PAGE_SIZE)
      : COLLECTION_PAGE_SIZE;

  const sort = sortKeySchema.catch("player").parse(params.get("sort") ?? "player");
  const sortDesc = params.get("sortDir") === "desc";

  return {
    search: filterValueSchema.parse(params.get("q") ?? ""),
    player: filterValueSchema.parse(params.get("player") ?? ""),
    team: filterValueSchema.parse(params.get("team") ?? ""),
    year: filterValueSchema.parse(params.get("year") ?? ""),
    brand: filterValueSchema.parse(params.get("brand") ?? ""),
    set: filterValueSchema.parse(params.get("set") ?? ""),
    variation: filterValueSchema.parse(params.get("variation") ?? ""),
    tags: parseCollectionTags(params),
    page,
    pageSize,
    sort,
    sortDesc,
  };
}

export function buildCollectionWhereClause(
  query: CollectionListQuery
): CollectionSqlClause {
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (query.search.trim()) {
    const pattern = `%${escapeLike(query.search.trim().toLowerCase())}%`;
    clauses.push(
      `(LOWER(player) LIKE ? ESCAPE '\\'
        OR LOWER(team) LIKE ? ESCAPE '\\'
        OR LOWER(COALESCE(year, '')) LIKE ? ESCAPE '\\'
        OR LOWER(brand) LIKE ? ESCAPE '\\'
        OR LOWER(set_name) LIKE ? ESCAPE '\\'
        OR LOWER(variation) LIKE ? ESCAPE '\\'
        OR LOWER(COALESCE(card_number, '')) LIKE ? ESCAPE '\\'
        OR LOWER(COALESCE(serial_number, '')) LIKE ? ESCAPE '\\')`
    );
    for (let i = 0; i < 8; i += 1) params.push(pattern);
  }

  if (query.player.trim()) {
    clauses.push("LOWER(player) LIKE ? ESCAPE '\\'");
    params.push(`%${escapeLike(query.player.trim().toLowerCase())}%`);
  }
  if (query.team.trim()) {
    clauses.push("LOWER(team) LIKE ? ESCAPE '\\'");
    params.push(`%${escapeLike(query.team.trim().toLowerCase())}%`);
  }
  if (query.year) {
    clauses.push("year = ?");
    params.push(query.year);
  }
  if (query.brand.trim()) {
    clauses.push("LOWER(brand) LIKE ? ESCAPE '\\'");
    params.push(`%${escapeLike(query.brand.trim().toLowerCase())}%`);
  }
  if (query.set.trim()) {
    clauses.push("LOWER(set_name) LIKE ? ESCAPE '\\'");
    params.push(`%${escapeLike(query.set.trim().toLowerCase())}%`);
  }
  if (query.variation.trim()) {
    clauses.push("LOWER(variation) LIKE ? ESCAPE '\\'");
    params.push(`%${escapeLike(query.variation.trim().toLowerCase())}%`);
  }

  for (const tag of query.tags) {
    switch (tag) {
      case "rookie":
        clauses.push("rookie = 1");
        break;
      case "autograph":
        clauses.push("autograph = 1");
        break;
      case "memorabilia":
        clauses.push("memorabilia = 1");
        break;
      case "numbered":
        clauses.push("serial_number IS NOT NULL AND serial_number != ''");
        break;
      case "tradable":
        clauses.push("tradable = 1");
        break;
      default:
        break;
    }
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return { whereSql, params };
}

export function setsForBrandFilter(
  references: References,
  brandQuery: string
): string[] {
  const q = brandQuery.trim().toLowerCase();
  if (!q) return [];
  const sets = new Set<string>();
  for (const [brand, brandSets] of Object.entries(references.brandSets)) {
    if (brand.toLowerCase().includes(q)) {
      for (const setName of brandSets) sets.add(setName);
    }
  }
  return [...sets].sort((a, b) => a.localeCompare(b));
}

export function variationsForFilters(
  references: References,
  brandQuery: string,
  setQuery: string
): string[] {
  const brandQ = brandQuery.trim().toLowerCase();
  const setQ = setQuery.trim().toLowerCase();
  const variations = new Set<string>();

  for (const [setName, setVars] of Object.entries(references.setVariations)) {
    const setMatch = !setQ || setName.toLowerCase().includes(setQ);
    if (!setMatch) continue;

    if (!brandQ) {
      for (const variation of setVars) variations.add(variation);
      continue;
    }

    const brandMatches = Object.entries(references.brandSets).some(
      ([brand, sets]) =>
        brand.toLowerCase().includes(brandQ) && sets.includes(setName)
    );
    if (brandMatches) {
      for (const variation of setVars) variations.add(variation);
    }
  }

  return [...variations].sort((a, b) => a.localeCompare(b));
}
