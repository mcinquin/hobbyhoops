import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Card } from "@/lib/types";
import {
  deleteCard,
  getNextCardId,
  insertCard,
  readCardById,
  readCollectionStats,
  updateCard,
} from "@/lib/db";
import { resetDatabaseCacheForTests } from "@/lib/test/db-test-helper";

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
});
