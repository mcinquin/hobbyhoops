/** Read / write access to the references catalogue. */
import "server-only";

import type { References } from "../types";
import { readReferencesPayload, importReferences } from "./reference-rows";
import { getDb } from "./connection";

/** Current references catalogue, read directly from the database (uncached). */
export function readReferencesState(): References {
  return readReferencesPayload(getDb());
}

/** Persists the whole references catalogue. */
export function writeReferencesState(refs: References): void {
  importReferences(getDb(), refs);
}
