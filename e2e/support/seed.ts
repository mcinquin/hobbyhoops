/**
 * Seed helpers: create references and cards through the public API with the
 * admin session, so data goes through the same validation and caches as the UI.
 */
import { randomBytes } from "node:crypto";
import {
  expect,
  type APIRequestContext,
  type PlaywrightWorkerArgs,
} from "@playwright/test";
import { adminStorageStatePath, BASE_URL } from "./env";

/** Card fields as returned by the API. */
export type ApiCard = {
  id: string;
  player: string;
  team: string;
  year: string | null;
  brand: string;
  set: string;
  variation: string;
  autograph: boolean;
  memorabilia: boolean;
  serialNumber: string | null;
  serialCurrent: number | null;
  serialTotal: number | null;
  cardNumber: string;
  grading: string;
  openingDate: string | null;
  protection: string;
  storage: string;
  photoFront: string | null;
  photoBack: string | null;
  tradable: boolean;
  rookie: boolean;
  wnba: boolean;
  notes: string;
  purchasePriceCents: number | null;
  purchaseCurrency: string | null;
  investment: boolean;
  purchaseFeesCents: number | null;
  soldAt: string | null;
  salePriceCents: number | null;
  saleFeesCents: number | null;
};

export type CardSeed = Partial<Omit<ApiCard, "id">> & { player: string };

export type BrandSeed = {
  brand: string;
  sets: { set: string; variations?: string[] }[];
};

const CARD_DEFAULTS: Omit<ApiCard, "id" | "player"> = {
  team: "",
  year: null,
  brand: "",
  set: "",
  variation: "",
  autograph: false,
  memorabilia: false,
  serialNumber: null,
  serialCurrent: null,
  serialTotal: null,
  cardNumber: "",
  grading: "Ungraded",
  openingDate: null,
  protection: "",
  storage: "",
  photoFront: null,
  photoBack: null,
  tradable: false,
  rookie: false,
  wnba: false,
  notes: "",
  purchasePriceCents: null,
  purchaseCurrency: null,
  investment: false,
  purchaseFeesCents: null,
  soldAt: null,
  salePriceCents: null,
  saleFeesCents: null,
};

/**
 * Short random token. Tests share one database per run, so every brand / set /
 * player a test creates carries one to stay independent from the others.
 */
export function uniqueToken(): string {
  return randomBytes(4).toString("hex");
}

/**
 * Authenticated API client. Mutating routes require an `Origin` header (CSRF
 * guard), which a browser sends but `APIRequestContext` does not.
 */
export async function newAdminApi(
  playwright: PlaywrightWorkerArgs["playwright"]
): Promise<APIRequestContext> {
  return playwright.request.newContext({
    baseURL: BASE_URL,
    storageState: adminStorageStatePath(),
    extraHTTPHeaders: { Origin: BASE_URL },
  });
}

async function patchReferences(
  api: APIRequestContext,
  body: Record<string, unknown>
): Promise<void> {
  const res = await api.patch("/api/references", { data: body });
  expect(res.ok(), `PATCH /api/references ${body.action}: ${await res.text()}`).toBe(true);
}

/** Adds brands, their sets and set variations to the reference lists (3 requests at most). */
export async function seedBrands(
  api: APIRequestContext,
  brands: BrandSeed[]
): Promise<void> {
  await patchReferences(api, {
    action: "addBrands",
    brands: brands.map((entry) => entry.brand),
  });

  const setEntries = brands.flatMap((entry) =>
    entry.sets.map(({ set }) => ({ brand: entry.brand, set }))
  );
  if (setEntries.length > 0) {
    await patchReferences(api, { action: "addSets", entries: setEntries });
  }

  const variationEntries = brands.flatMap((entry) =>
    entry.sets.flatMap(({ set, variations = [] }) =>
      variations.map((variation) => ({ brand: entry.brand, set, variation }))
    )
  );
  if (variationEntries.length > 0) {
    await patchReferences(api, { action: "addVariations", entries: variationEntries });
  }
}

/** Creates cards one by one through `POST /api/cards` and returns them in order. */
export async function seedCards(
  api: APIRequestContext,
  cards: CardSeed[]
): Promise<ApiCard[]> {
  const created: ApiCard[] = [];
  for (const card of cards) {
    const res = await api.post("/api/cards", { data: { ...CARD_DEFAULTS, ...card } });
    expect(res.status(), `POST /api/cards: ${await res.text()}`).toBe(201);
    created.push((await res.json()) as ApiCard);
  }
  return created;
}

/** Deletes cards by id. */
export async function deleteCards(
  api: APIRequestContext,
  ids: readonly string[]
): Promise<void> {
  for (const id of ids) {
    const res = await api.delete(`/api/cards?id=${encodeURIComponent(id)}`);
    expect(res.ok(), `DELETE /api/cards ${id}: ${await res.text()}`).toBe(true);
  }
}

/** Full card by id, or null when it does not exist. */
export async function fetchCard(
  api: APIRequestContext,
  id: string
): Promise<ApiCard | null> {
  const res = await api.get(`/api/cards/${encodeURIComponent(id)}`);
  if (res.status() === 404) return null;
  expect(res.ok(), `GET /api/cards/${id}: ${await res.text()}`).toBe(true);
  return (await res.json()) as ApiCard;
}

/** Cards matching collection filters (`brand`, `set`, …), first page of up to 100. */
export async function listCards(
  api: APIRequestContext,
  filters: Record<string, string>
): Promise<ApiCard[]> {
  const params = new URLSearchParams({ ...filters, pageSize: "100" });
  const res = await api.get(`/api/cards?${params.toString()}`);
  expect(res.ok(), `GET /api/cards: ${await res.text()}`).toBe(true);
  const body = (await res.json()) as { cards: ApiCard[] };
  return body.cards;
}
