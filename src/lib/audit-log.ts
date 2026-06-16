import "server-only";

import type { Card } from "./types";
import type { ReferencePatchBody } from "./reference-schema";
import {
  uniqueBrandSetEntries,
  uniqueSetVariationEntries,
  uniqueStrings,
  uniqueYears,
} from "./reference-mutations";
import { getLogger } from "./logger";

const auditLogger = getLogger("audit");
const MAX_VALUE_LENGTH = 80;

function normalizeAuditFields(
  fields: Record<string, string | number | boolean | null | undefined>
): Record<string, string | number | boolean> {
  const normalized: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "string") {
      normalized[key] =
        value.length > MAX_VALUE_LENGTH
          ? value.slice(0, MAX_VALUE_LENGTH)
          : value;
      continue;
    }
    normalized[key] = value;
  }

  return normalized;
}

export function auditLog(
  action: string,
  fields: Record<string, string | number | boolean | null | undefined>
): void {
  auditLogger.info({ msg: action, ...normalizeAuditFields(fields) });
}

export function auditCardFields(
  card: Pick<Card, "id" | "player" | "year" | "brand" | "set" | "variation">
): Record<string, string> {
  return {
    id: card.id,
    player: card.player,
    year: card.year ?? "",
    brand: card.brand,
    set: card.set,
    variation: card.variation,
  };
}

export function auditReferencePatch(
  user: string,
  body: ReferencePatchBody
): void {
  const base = { user };

  switch (body.action) {
    case "addBrand":
      auditLog("ref.brand.add", { ...base, brand: body.brand });
      return;
    case "addBrands":
      auditLog("ref.brand.add", {
        ...base,
        count: uniqueStrings(body.brands).length,
      });
      return;
    case "removeBrand":
      auditLog("ref.brand.remove", { ...base, brand: body.brand });
      return;
    case "addSet":
      auditLog("ref.set.add", { ...base, brand: body.brand, set: body.set });
      return;
    case "addSets":
      auditLog("ref.set.add", {
        ...base,
        count: uniqueBrandSetEntries(body.entries).length,
      });
      return;
    case "removeSet":
      auditLog("ref.set.remove", {
        ...base,
        brand: body.brand,
        set: body.set,
      });
      return;
    case "addVariation":
      auditLog("ref.variation.add", {
        ...base,
        set: body.set,
        variation: body.variation,
      });
      return;
    case "addVariations":
      auditLog("ref.variation.add", {
        ...base,
        count: uniqueSetVariationEntries(body.entries).length,
      });
      return;
    case "removeVariation":
      auditLog("ref.variation.remove", {
        ...base,
        set: body.set,
        variation: body.variation,
      });
      return;
    case "addPlayer":
      auditLog("ref.player.add", { ...base, player: body.player });
      return;
    case "addPlayers":
      auditLog("ref.player.add", {
        ...base,
        count: uniqueStrings(body.players).length,
      });
      return;
    case "removePlayer":
      auditLog("ref.player.remove", { ...base, player: body.player });
      return;
    case "addTeam":
      auditLog("ref.team.add", { ...base, team: body.team });
      return;
    case "addTeams":
      auditLog("ref.team.add", {
        ...base,
        count: uniqueStrings(body.teams).length,
      });
      return;
    case "removeTeam":
      auditLog("ref.team.remove", { ...base, team: body.team });
      return;
    case "addYear":
      auditLog("ref.year.add", { ...base, year: body.year });
      return;
    case "addYears":
      auditLog("ref.year.add", {
        ...base,
        count: uniqueYears(body.years).length,
      });
      return;
    default:
      return;
  }
}

export function auditShipmentUpdateFields(
  patch: Record<string, unknown>
): Record<string, string | number | boolean | null | undefined> {
  const fields: Record<string, string | number | boolean | null | undefined> =
    {};
  const keys = [
    "status",
    "cardId",
    "trackingNumber",
    "carrier",
    "platform",
    "shippedAt",
    "expectedDelivery",
  ] as const;

  for (const key of keys) {
    if (key in patch) {
      const value = patch[key];
      if (value === null) {
        fields[key] = "";
      } else if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        fields[key] = value;
      }
    }
  }

  return fields;
}
