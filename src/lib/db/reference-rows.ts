/** Persistence helpers for the references catalogue (`references_state`). */
import "server-only";

import type { References } from "../types";
import {
  applySeedAttributeReferences,
  createEmptyReferences,
  normLabel,
  syncCardAttributeReferences,
} from "../reference-mutations";
import type { AppDatabase } from "../sqlite";

function parseReferences(raw: Partial<References>): References {
  const parseStringMap = (value: unknown): Record<string, string[]> => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return {};
    }
    const out: Record<string, string[]> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (!key || !Array.isArray(entry)) continue;
      out[key] = entry.filter(
        (item): item is string => typeof item === "string" && item.length > 0
      );
    }
    return out;
  };

  return {
    players: Array.isArray(raw.players) ? raw.players : [],
    teams: Array.isArray(raw.teams) ? raw.teams : [],
    years: Array.isArray(raw.years) ? raw.years : [],
    brands: Array.isArray(raw.brands) ? raw.brands : [],
    sets: Array.isArray(raw.sets) ? raw.sets : [],
    brandSets: parseStringMap(raw.brandSets),
    setVariations: parseStringMap(raw.setVariations),
    variations: Array.isArray(raw.variations) ? raw.variations : [],
    gradings: Array.isArray(raw.gradings) ? raw.gradings : [],
    protections: Array.isArray(raw.protections) ? raw.protections : [],
    storages: Array.isArray(raw.storages) ? raw.storages : [],
  };
}

/**
 * Reads the stored references catalogue; falls back to an empty catalogue when missing
 * or invalid.
 */
export function readReferencesPayload(db: AppDatabase): References {
  const row = db
    .prepare("SELECT payload FROM references_state WHERE id = 1")
    .get() as { payload: string } | undefined;
  if (!row) return createEmptyReferences();
  try {
    return parseReferences(JSON.parse(row.payload) as Partial<References>);
  } catch {
    return createEmptyReferences();
  }
}

/** Adds every grading / protection / storage value used by a card to `refs`. */
export function backfillAttributeReferencesFromCards(db: AppDatabase, refs: References): void {
  const rows = db
    .prepare("SELECT grading, protection, storage FROM cards")
    .all() as Record<string, unknown>[];

  for (const cardRow of rows) {
    syncCardAttributeReferences(refs, {
      grading: cardRow.grading == null ? null : String(cardRow.grading),
      protection:
        cardRow.protection == null ? null : String(cardRow.protection),
      storage: cardRow.storage == null ? null : String(cardRow.storage),
    });
  }
}

function normalizeReferenceStringList(values: string[]): string[] {
  return [...new Set(values.map((value) => normLabel(value)).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b)
  );
}

/** Stores the references catalogue (attribute lists are normalised first). */
export function importReferences(db: AppDatabase, refs: References): void {
  const payload: References = {
    ...refs,
    gradings: normalizeReferenceStringList(refs.gradings),
    protections: normalizeReferenceStringList(refs.protections),
    storages: normalizeReferenceStringList(refs.storages),
  };
  db.prepare(
    "INSERT INTO references_state (id, payload) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload"
  ).run(JSON.stringify(payload));
}

function seedAttributeReferencesIfEmpty(db: AppDatabase): void {
  const refs = readReferencesPayload(db);
  if (
    refs.gradings.length > 0 ||
    refs.protections.length > 0 ||
    refs.storages.length > 0
  ) {
    return;
  }
  applySeedAttributeReferences(refs);
  importReferences(db, refs);
}

/** Creates the references row when missing and seeds the default attribute values. */
export function ensureReferencesState(db: AppDatabase): void {
  const referencesCount = (
    db.prepare("SELECT COUNT(*) as count FROM references_state").get() as {
      count: number;
    }
  ).count;
  if (referencesCount === 0) {
    importReferences(db, createEmptyReferences());
  }
  seedAttributeReferencesIfEmpty(db);
}
