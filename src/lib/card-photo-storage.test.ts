import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  deleteAllCardPhotos,
  getCardPhotosRoot,
  readCardPhotoFile,
  saveCardPhoto,
} from "@/lib/card-photo-storage";

function tinyPng(): Buffer {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
}

describe("card-photo-storage", () => {
  let dbPath: string;
  let previousDbPath: string | undefined;

  beforeEach(() => {
    previousDbPath = process.env.HOBBYHOOPS_DB_PATH;
    dbPath = path.join("data", `test-photos-${randomUUID()}.db`);
    process.env.HOBBYHOOPS_DB_PATH = dbPath;
  });

  afterEach(() => {
    if (previousDbPath === undefined) {
      delete process.env.HOBBYHOOPS_DB_PATH;
    } else {
      process.env.HOBBYHOOPS_DB_PATH = previousDbPath;
    }
    const photosRoot = path.join("data", "card-photos");
    for (const id of ["card-0001", "card-0002", "card-0003"]) {
      fs.rmSync(path.join(photosRoot, id), { recursive: true, force: true });
    }
    for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  });

  it("saves a png under data/card-photos and reads it back", async () => {
    const saved = await saveCardPhoto({
      cardId: "card-0001",
      side: "front",
      buffer: tinyPng(),
      declaredMime: "image/png",
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;

    expect(saved.url).toBe("/api/card-photos/card-0001/front.png");
    expect(
      fs.existsSync(path.join(getCardPhotosRoot(), "card-0001", "front.png"))
    ).toBe(true);

    const read = readCardPhotoFile("card-0001", "front.png");
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.contentType).toBe("image/png");
    expect(read.buffer.length).toBeGreaterThan(0);
  });

  it("rejects empty and svg payloads", async () => {
    const empty = await saveCardPhoto({
      cardId: "card-0002",
      side: "back",
      buffer: Buffer.alloc(0),
    });
    expect(empty).toEqual({ ok: false, code: "empty" });

    const svg = await saveCardPhoto({
      cardId: "card-0002",
      side: "back",
      buffer: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"),
      declaredMime: "image/svg+xml",
    });
    expect(svg).toEqual({ ok: false, code: "svg_rejected" });
  });

  it("deletes the card photo directory", async () => {
    const saved = await saveCardPhoto({
      cardId: "card-0003",
      side: "front",
      buffer: tinyPng(),
      declaredMime: "image/png",
    });
    expect(saved.ok).toBe(true);
    deleteAllCardPhotos("card-0003");
    expect(fs.existsSync(path.join(getCardPhotosRoot(), "card-0003"))).toBe(
      false
    );
  });
});
