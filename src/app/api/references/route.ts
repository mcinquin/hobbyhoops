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
  removeBrand,
  removePlayer,
  removeSet,
  removeTeam,
  removeVariation,
  uniqueBrandSetEntries,
  uniqueBrandSetVariationEntries,
  uniqueStrings,
  uniqueYears,
} from "@/lib/reference-mutations";
import {
  referencePatchSchema,
  type ReferencePatchBody,
} from "@/lib/reference-schema";
import type { Translator } from "@/i18n/translator";
import { auditReferencePatch } from "@/lib/audit-log";
import { guardMutation, parseBody } from "@/lib/api-mutation";

const REFERENCES_WRITE_LIMIT = { scope: "references:write", limit: 30 };

export async function GET(request: NextRequest) {
  const gate = requireAuth(request);
  if (gate instanceof NextResponse) return gate;
  const refs = getReferences();
  return NextResponse.json(refs, {
    headers: {
      "Cache-Control": "private, max-age=60",
    },
  });
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
        addVariation(state, body.brand, body.set, body.variation);
      });
    case "addVariations": {
      const entries = uniqueBrandSetVariationEntries(body.entries);
      if (entries.length === 0) {
        return null;
      }
      return mutateReferences((state) => {
        for (const entry of entries) {
          addVariation(state, entry.brand, entry.set, entry.variation);
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
    case "removePlayer":
      return mutateReferences((state) => {
        removePlayer(state, body.player);
      });
    case "removeTeam":
      return mutateReferences((state) => {
        removeTeam(state, body.team);
      });
    case "removeBrand":
      return mutateReferences((state) => {
        removeBrand(state, body.brand);
      });
    case "removeSet":
      return mutateReferences((state) => {
        removeSet(state, body.brand, body.set);
      });
    case "removeVariation":
      return mutateReferences((state) => {
        removeVariation(state, body.brand, body.set, body.variation);
      });
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
  const guard = guardMutation(request, REFERENCES_WRITE_LIMIT);
  if (guard instanceof NextResponse) return guard;
  const { session, t } = guard;

  const parsed = await parseBody(request, referencePatchSchema, t);
  if (!parsed.ok) return parsed.response;

  const refs = await applyReferencePatch(parsed.data);
  if (!refs) {
    return NextResponse.json(
      { error: emptyBatchError(parsed.data.action, t) },
      { status: 400 }
    );
  }

  auditReferencePatch(session.username, parsed.data);

  return NextResponse.json(refs);
}
