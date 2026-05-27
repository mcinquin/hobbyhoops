import "server-only";

import { cache } from "react";
import { readReferencesState } from "@/lib/db";
import type { References } from "@/lib/types";

const readReferencesCached = cache(readReferencesState);

/** Une lecture références par requête RSC (évite les JSON.parse répétés). */
export function getCachedReferences(): References {
  return readReferencesCached();
}
