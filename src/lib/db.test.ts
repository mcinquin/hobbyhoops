import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Card } from "@/lib/types";
import {
  deleteCard,
  deleteCardValuation,
  getDb,
  getNextCardId,
  insertCard,
  insertCardValuation,
  insertFrNbaPlayer,
  queryCardsPage,
  readCardById,
  readCardValuations,
  readCollectionStats,
  readInvestmentCards,
  readInvestmentValuations,
  readDuplicateGroupRows,
  readRecentCards,
  readSpendingByMonth,
  readSpendingGroups,
  readReferencesState,
  updateCard,
  updateFrNbaPlayer,
  writeReferencesState,
} from "@/lib/db";
import { createEmptyReferences } from "@/lib/reference-mutations";
import { getDuplicateCardGroups } from "@/lib/data";
import { buildCollectionWhereClause } from "@/lib/collection-query";
import { exportCardsCsv, importCardsCsv } from "@/lib/data";
import { resetDatabaseCacheForTests } from "@/lib/test/db-test-helper";

function getDerivedColumns(id: string): Record<string, unknown> {
  return getDb()
    .prepare("SELECT search_text, opening_date_sort FROM cards WHERE id = ?")
    .get(id) as Record<string, unknown>;
}

const sampleCard = (overrides: Partial<Card> = {}): Card => ({
  id: "card-0001",
  player: "LeBron James",
  team: "Lakers",
  year: "2023",
  brand: "Panini",
  set: "Prizm",
  variation: "Base",
  autograph: false,
  memorabilia: false,
  serialNumber: null,
  serialCurrent: null,
  serialTotal: null,
  cardNumber: "1",
  grading: "",
  openingDate: "01/01/2024",
  protection: "",
  storage: "",
  photoFront: null,
  photoBack: null,
  tradable: false,
  rookie: true,
  wnba: false,
  notes: "",
  purchasePriceCents: null,
  purchaseCurrency: null,
  investment: false,
  purchaseFeesCents: null,
  soldAt: null,
  salePriceCents: null,
  saleFeesCents: null,
  ...overrides,
});

describe("card CRUD", () => {
  let dbPath: string;

  beforeEach(() => {
    resetDatabaseCacheForTests();
    dbPath = path.join("data", `test-${randomUUID()}.db`);
    process.env.HOBBYHOOPS_DB_PATH = dbPath;
  });

  afterEach(() => {
    resetDatabaseCacheForTests();
    for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    delete process.env.HOBBYHOOPS_DB_PATH;
  });

  it("inserts and updates a FR-NBA player with its holdings", () => {
    const created = insertFrNbaPlayer({
      player: "  Victor Wembanyama ",
      draftYear: "2023",
      draftedBy: "Spurs",
      rpa: null,
      holdings: [{ type: "auto", autoStyle: "on_card", rookie: true }],
    });
    expect(created.id).toBeGreaterThan(0);
    expect(created.player).toBe("Victor Wembanyama");
    expect(created.holdings).toHaveLength(1);
    expect(created.holdings[0]).toMatchObject({ type: "auto", rookie: true });

    const updated = updateFrNbaPlayer(created.id, {
      player: "Victor Wembanyama",
      draftYear: "2023",
      draftedBy: "Spurs",
      rpa: true,
      holdings: [
        { type: "simple", autoStyle: null, rookie: false },
        { type: "patch", autoStyle: null, rookie: true },
      ],
    });
    expect(updated?.rpa).toBe(true);
    expect(updated?.holdings.map((holding) => holding.type)).toEqual([
      "simple",
      "patch",
    ]);

    expect(
      updateFrNbaPlayer(created.id + 999, {
        player: "Nobody",
        draftYear: "",
        draftedBy: "",
        rpa: null,
        holdings: [],
      })
    ).toBeNull();
  });

  it("inserts, updates and deletes a card", () => {
    const created = insertCard(sampleCard());
    expect(created.id).toBe("card-0001");
    expect(readCardById("card-0001")?.player).toBe("LeBron James");

    const updated = updateCard(sampleCard({ player: "Stephen Curry" }));
    expect(updated?.player).toBe("Stephen Curry");

    expect(deleteCard("card-0001")).toBe(true);
    expect(readCardById("card-0001")).toBeNull();
  });

  it("allocates sequential ids", () => {
    insertCard(sampleCard({ id: "card-0001" }));
    expect(getNextCardId()).toBe("card-0002");
  });

  it("finds cards via FTS5 search", () => {
    insertCard(sampleCard({ openingDate: "15/03/2024" }));
    const row = getDerivedColumns("card-0001");
    expect(row.search_text).toContain("lebron");
    expect(row.opening_date_sort).toBe(20240315);

    const recent = readRecentCards(1);
    expect(recent[0]?.id).toBe("card-0001");

    const { whereSql, params } = buildCollectionWhereClause({
      search: "prizm",
      player: "",
      team: "",
      year: "",
      brand: "",
      set: "",
      variation: "",
      tags: [],
      page: 1,
      pageSize: 50,
      sort: "player",
      sortDesc: false,
    });
    const page = queryCardsPage(whereSql, params, {
      sortColumn: "player",
      sortDesc: false,
      limit: 10,
      offset: 0,
    });
    expect(page).toHaveLength(1);
    expect(page[0]).not.toHaveProperty("photoFront");
    expect(page[0]).not.toHaveProperty("photoBack");

    const { whereSql: multiWhere, params: multiParams } =
      buildCollectionWhereClause({
        search: "lebron prizm",
        player: "",
        team: "",
        year: "",
        brand: "",
        set: "",
        variation: "",
        tags: [],
        page: 1,
        pageSize: 50,
        sort: "player",
        sortDesc: false,
      });
    const multiPage = queryCardsPage(multiWhere, multiParams, {
      sortColumn: "player",
      sortDesc: false,
      limit: 10,
      offset: 0,
    });
    expect(multiPage).toHaveLength(1);
  });

  it("aggregates collection stats", () => {
    insertCard(sampleCard({ autograph: true, rookie: true }));
    insertCard(
      sampleCard({
        id: "card-0002",
        autograph: false,
        rookie: false,
        serialNumber: "10/99",
      })
    );
    const stats = readCollectionStats();
    expect(stats.total).toBe(2);
    expect(stats.autographs).toBe(1);
    expect(stats.rookies).toBe(1);
    expect(stats.numbered).toBe(1);
  });

  it("detects strict duplicate cards (same year and card number)", () => {
    insertCard(sampleCard({ id: "card-0001" }));
    insertCard(sampleCard({ id: "card-0002" }));
    insertCard(sampleCard({ id: "card-0003", cardNumber: "2" }));
    insertCard(
      sampleCard({
        id: "card-0004",
        player: "Stephen Curry",
        set: "Select",
      })
    );

    expect(readDuplicateGroupRows()).toHaveLength(1);
    const groups = getDuplicateCardGroups();
    expect(groups).toHaveLength(1);
    expect(groups[0]?.cards).toHaveLength(2);
    expect(groups[0]?.cardNumber).toBe("1");
  });

  it("persists notes on create and update", () => {
    insertCard(sampleCard({ notes: "First note" }));
    expect(readCardById("card-0001")?.notes).toBe("First note");

    updateCard(sampleCard({ notes: "Updated note" }));
    expect(readCardById("card-0001")?.notes).toBe("Updated note");
  });

  it("persists the purchase price and leaves cards without one untouched", () => {
    insertCard(sampleCard({ purchasePriceCents: 1250, purchaseCurrency: "usd" }));
    insertCard(sampleCard({ id: "card-0002" }));

    const priced = readCardById("card-0001");
    expect(priced?.purchasePriceCents).toBe(1250);
    expect(priced?.purchaseCurrency).toBe("USD");

    const unpriced = readCardById("card-0002");
    expect(unpriced?.purchasePriceCents).toBeNull();
    expect(unpriced?.purchaseCurrency).toBeNull();

    updateCard(sampleCard({ purchasePriceCents: null, purchaseCurrency: "USD" }));
    expect(readCardById("card-0001")?.purchaseCurrency).toBeNull();
  });

  it("aggregates purchase prices for the dashboard", () => {
    insertCard(sampleCard({ purchasePriceCents: 1000, purchaseCurrency: "EUR" }));
    insertCard(
      sampleCard({ id: "card-0002", purchasePriceCents: 3000, purchaseCurrency: "EUR" })
    );
    insertCard(sampleCard({ id: "card-0003" }));

    const groups = readSpendingGroups();
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ currency: "EUR", totalCents: 4000, count: 2 });

    const months = readSpendingByMonth();
    expect(months.reduce((sum, row) => sum + row.totalCents, 0)).toBe(4000);
  });

  it("imports and exports cards via csv", () => {
    insertCard(sampleCard());
    const identityT = (key: string) => key;

    const exported = exportCardsCsv(
      {
        search: "",
        player: "",
        team: "",
        year: "",
        brand: "",
        set: "",
        variation: "",
        tags: [],
        page: 1,
        pageSize: 50,
        sort: "player",
        sortDesc: false,
      },
      "all"
    );
    expect(exported).toContain("LeBron James");

    deleteCard("card-0001");
    const result = importCardsCsv(exported, "upsert", identityT);
    expect(result.created).toBe(1);
    expect(readCardById("card-0001")?.player).toBe("LeBron James");
  });

  it("persists grading, protection and storage references in sqlite payload", () => {
    writeReferencesState({
      ...createEmptyReferences(),
      gradings: ["PSA", "BGS"],
      protections: ["Sleeve", "  "],
      storages: ["Trade - Sleeve Binder"],
    });

    const refs = readReferencesState();
    expect(refs.gradings).toEqual(["BGS", "PSA"]);
    expect(refs.protections).toEqual(["Sleeve"]);
    expect(refs.storages).toEqual(["Trade - Sleeve Binder"]);

    const payloadRow = getDb()
      .prepare("SELECT payload FROM references_state WHERE id = 1")
      .get() as { payload: string } | undefined;
    const payload = JSON.parse(String(payloadRow?.payload ?? "{}"));
    expect(payload.gradings).toEqual(["BGS", "PSA"]);
    expect(payload.protections).toEqual(["Sleeve"]);
    expect(payload.storages).toEqual(["Trade - Sleeve Binder"]);
  });
});

describe("investment cards", () => {
  let dbPath: string;

  beforeEach(() => {
    resetDatabaseCacheForTests();
    dbPath = path.join("data", `test-${randomUUID()}.db`);
    process.env.HOBBYHOOPS_DB_PATH = dbPath;
  });

  afterEach(() => {
    resetDatabaseCacheForTests();
    for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    delete process.env.HOBBYHOOPS_DB_PATH;
  });

  it("persists the investment flag, fees and sale", () => {
    insertCard(
      sampleCard({
        purchasePriceCents: 10000,
        purchaseCurrency: "USD",
        investment: true,
        purchaseFeesCents: 500,
        soldAt: "2026-10-02",
        salePriceCents: 15000,
        saleFeesCents: 900,
      })
    );
    expect(readCardById("card-0001")).toMatchObject({
      investment: true,
      purchaseCurrency: "USD",
      purchaseFeesCents: 500,
      soldAt: "2026-10-02",
      salePriceCents: 15000,
      saleFeesCents: 900,
    });
    expect(readInvestmentCards().map((card) => card.id)).toEqual(["card-0001"]);
  });

  it("keeps the currency of a card sold without a purchase price", () => {
    insertCard(
      sampleCard({
        purchaseCurrency: "GBP",
        investment: true,
        soldAt: "2026-10-02",
        salePriceCents: 15000,
      })
    );
    expect(readCardById("card-0001")?.purchaseCurrency).toBe("GBP");
  });

  it("stores readings and deletes them with their card", () => {
    insertCard(sampleCard({ investment: true }));
    insertCard(sampleCard({ id: "card-0002" }));
    const first = insertCardValuation({
      cardId: "card-0001",
      valueCents: 1000,
      currency: "EUR",
      valuedAt: "2026-01-10",
      source: "manual",
      note: "",
    });
    insertCardValuation({ ...first, valueCents: 2000, valuedAt: "2026-03-10" });
    insertCardValuation({ ...first, cardId: "card-0002", valuedAt: "2026-02-10" });

    expect(readCardValuations("card-0001").map((v) => v.valueCents)).toEqual([2000, 1000]);
    // Only readings of investment cards feed the portfolio.
    expect(readInvestmentValuations()).toHaveLength(2);

    expect(deleteCardValuation("card-0002", first.id)).toBe(false);
    expect(deleteCardValuation("card-0001", first.id)).toBe(true);
    expect(readCardValuations("card-0001")).toHaveLength(1);

    deleteCard("card-0001");
    expect(readCardValuations("card-0001")).toHaveLength(0);
  });

  it("migrates a v21 database without losing cards", () => {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const legacy = new Database(dbPath);
    legacy.exec(`
      CREATE TABLE schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO schema_meta (key, value) VALUES ('schema_version', '21');
      CREATE TABLE cards (
        id TEXT PRIMARY KEY, player TEXT NOT NULL, team TEXT NOT NULL DEFAULT '', year TEXT,
        brand TEXT NOT NULL DEFAULT '', set_name TEXT NOT NULL DEFAULT '',
        variation TEXT NOT NULL DEFAULT '', autograph INTEGER NOT NULL DEFAULT 0,
        memorabilia INTEGER NOT NULL DEFAULT 0, serial_number TEXT, serial_current INTEGER,
        serial_total INTEGER, card_number TEXT NOT NULL DEFAULT '',
        grading TEXT NOT NULL DEFAULT '', opening_date TEXT,
        protection TEXT NOT NULL DEFAULT '', storage TEXT NOT NULL DEFAULT '',
        photo_front TEXT, photo_back TEXT, tradable INTEGER NOT NULL DEFAULT 0,
        rookie INTEGER NOT NULL DEFAULT 0, wnba INTEGER NOT NULL DEFAULT 0,
        opening_date_sort INTEGER, search_text TEXT, notes TEXT NOT NULL DEFAULT '',
        purchase_price_cents INTEGER, purchase_currency TEXT
      );
      INSERT INTO cards (id, player, purchase_price_cents, purchase_currency)
        VALUES ('card-0001', 'Legacy Player', 1250, 'EUR');
    `);
    legacy.close();

    expect(readCardById("card-0001")).toMatchObject({
      player: "Legacy Player",
      purchasePriceCents: 1250,
      investment: false,
      purchaseFeesCents: null,
      soldAt: null,
    });
    expect(readCardValuations("card-0001")).toEqual([]);
  });
});
