import { NextRequest, NextResponse } from "next/server";
import { getReferences, mutateReferences } from "@/lib/data";
import { requireAuth } from "@/lib/auth-api";
import {
  addBrand,
  addPlayer,
  addSet,
  addTeam,
  addVariation,
  addYear,
  uniqueBrandSetEntries,
  uniqueSetVariationEntries,
  uniqueStrings,
  uniqueYears,
} from "@/lib/reference-mutations";
import {
  formatZodError,
  referencePatchSchema,
  type ReferencePatchBody,
} from "@/lib/reference-schema";
import { getRequestTranslator } from "@/i18n/request";
import type { Translator } from "@/i18n/translator";

export async function GET(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;
  const refs = getReferences();
  return NextResponse.json(refs);
}

async function applyReferencePatch(body: ReferencePatchBody) {
  switch (body.action) {
    case "addBrand":
      return mutateReferences((state) => {
        addBrand(state, body.brand);
      });
    case "addBrands": {
      const brands = uniqueStrings(body.brands);
      if (brands.length === 0) {
        return null;
      }
      return mutateReferences((state) => {
        for (const brand of brands) addBrand(state, brand);
      });
    }
    case "addSet":
      return mutateReferences((state) => {
        addSet(state, body.brand, body.set);
      });
    case "addSets": {
      const entries = uniqueBrandSetEntries(body.entries);
      if (entries.length === 0) {
        return null;
      }
      return mutateReferences((state) => {
        for (const entry of entries) addSet(state, entry.brand, entry.set);
      });
    }
    case "addVariation":
      return mutateReferences((state) => {
        addVariation(state, body.set, body.variation);
      });
    case "addVariations": {
      const entries = uniqueSetVariationEntries(body.entries);
      if (entries.length === 0) {
        return null;
      }
      return mutateReferences((state) => {
        for (const entry of entries) {
          addVariation(state, entry.set, entry.variation);
        }
      });
    }
    case "addPlayer":
      return mutateReferences((state) => {
        addPlayer(state, body.player);
      });
    case "addPlayers": {
      const players = uniqueStrings(body.players);
      if (players.length === 0) {
        return null;
      }
      return mutateReferences((state) => {
        for (const player of players) addPlayer(state, player);
      });
    }
    case "addTeam":
      return mutateReferences((state) => {
        addTeam(state, body.team);
      });
    case "addTeams": {
      const teams = uniqueStrings(body.teams);
      if (teams.length === 0) {
        return null;
      }
      return mutateReferences((state) => {
        for (const team of teams) addTeam(state, team);
      });
    }
    case "addYear":
      return mutateReferences((state) => {
        addYear(state, body.year);
      });
    case "addYears": {
      const years = uniqueYears(body.years);
      if (years.length === 0) {
        return null;
      }
      return mutateReferences((state) => {
        for (const year of years) addYear(state, year);
      });
    }
    default:
      return null;
  }
}

function emptyBatchError(
  action: ReferencePatchBody["action"],
  t: Translator
): string {
  switch (action) {
    case "addBrands":
      return t("errors.noValidBrands");
    case "addSets":
      return t("errors.noValidSets");
    case "addVariations":
      return t("errors.noValidVariations");
    case "addPlayers":
      return t("errors.noValidPlayers");
    case "addTeams":
      return t("errors.noValidClubs");
    case "addYears":
      return t("errors.noValidYears");
    default:
      return t("errors.invalidData");
  }
}

export async function PATCH(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;
  const t = getRequestTranslator(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: t("errors.invalidJson") }, { status: 400 });
  }

  const parsed = referencePatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error, t) },
      { status: 400 }
    );
  }

  const refs = await applyReferencePatch(parsed.data);
  if (!refs) {
    return NextResponse.json(
      { error: emptyBatchError(parsed.data.action, t) },
      { status: 400 }
    );
  }

  return NextResponse.json(refs);
}
