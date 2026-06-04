import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Card } from "@/lib/types";
import {
  deleteCard,
  getDb,
  getNextCardId,
  insertCard,
  queryCardsPage,
  readCardById,
  readCollectionStats,
  readDuplicateGroupRows,
  readRecentCards,
  updateCard,
} from "@/lib/db";
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
  photo: null,
  tradable: false,
  rookie: true,
  notes: "",
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
    expect(page[0]).not.toHaveProperty("photo");

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
});
