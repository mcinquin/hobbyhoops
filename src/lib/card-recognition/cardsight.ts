import "server-only";

import { getLogger } from "@/lib/logger";
import { RecognitionError } from "@/lib/card-recognition/errors";
import type {
  RecognitionConfidence,
  RecognizedCard,
} from "@/lib/card-recognition/types";

const log = getLogger("cardsight");

/** Segment basketball en dur : l'app ne gère que des cartes de basket. */
const CARDSIGHT_IDENTIFY_URL =
  "https://api.cardsight.ai/v1/identify/card/basketball";
const CARDSIGHT_SUBSCRIPTION_URL = "https://api.cardsight.ai/v1/subscription/";
const REQUEST_TIMEOUT_MS = 30_000;
/** Tier gratuit CardSight ; l'API ne renvoie pas la limite du plan. */
const DEFAULT_MONTHLY_QUOTA = 750;

export function isCardRecognitionConfigured(): boolean {
  return Boolean(process.env.CARDSIGHT_API_KEY?.trim());
}

/** Quota mensuel d'appels (CARDSIGHT_MONTHLY_QUOTA, défaut : tier gratuit 750). */
export function cardSightMonthlyQuota(): number {
  const raw = Number.parseInt(
    process.env.CARDSIGHT_MONTHLY_QUOTA?.trim() ?? "",
    10
  );
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MONTHLY_QUOTA;
}

/* ---------- Parsing (pur, testable sans réseau) ---------- */

type CardSightParallelSuggestion = {
  name?: unknown;
  confidence?: unknown;
};

type CardSightCard = {
  year?: unknown;
  manufacturer?: unknown;
  releaseName?: unknown;
  setName?: unknown;
  name?: unknown;
  number?: unknown;
  numberedTo?: unknown;
  attributes?: unknown;
  parallelSuggestions?: unknown;
};

type CardSightDetection = {
  confidence?: unknown;
  card?: CardSightCard;
};

type CardSightResponse = {
  success?: unknown;
  detections?: unknown;
  messages?: unknown;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseConfidence(value: unknown): RecognitionConfidence {
  const lower = asString(value).toLowerCase();
  if (lower === "high" || lower === "medium" || lower === "low") return lower;
  return "low";
}

const CONFIDENCE_RANK: Record<RecognitionConfidence, number> = {
  high: 2,
  medium: 1,
  low: 0,
};

function parseAttributes(value: unknown): {
  rookie: boolean;
  autograph: boolean;
  memorabilia: boolean;
} {
  const attributes = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
  const folded = attributes.map((item) => item.toLowerCase());
  return {
    rookie: folded.some((item) => item.includes("rookie")),
    autograph: folded.some(
      (item) => item.includes("autograph") || item === "auto"
    ),
    memorabilia: folded.some(
      (item) =>
        item.includes("memorabilia") ||
        item.includes("relic") ||
        item.includes("patch") ||
        item.includes("jersey")
    ),
  };
}

function isBaseSetName(setName: string): boolean {
  const folded = setName.toLowerCase().replace(/[^a-z]+/g, " ").trim();
  return folded === "base" || folded === "base set";
}

/**
 * Variation = meilleur parallel suggéré si présent, sinon nom du set interne
 * (insert), sinon vide. `uncertain` signale une suggestion beta à vérifier.
 */
function parseVariation(card: CardSightCard): {
  variation: string;
  uncertain: boolean;
} {
  const suggestions = Array.isArray(card.parallelSuggestions)
    ? (card.parallelSuggestions as CardSightParallelSuggestion[])
    : [];
  const best = suggestions
    .map((item) => ({
      name: asString(item.name),
      confidence: parseConfidence(item.confidence),
    }))
    .find((item) => item.name);

  if (best) {
    return {
      variation: best.name,
      uncertain: suggestions.length > 1 || best.confidence !== "high",
    };
  }

  const setName = asString(card.setName);
  if (setName && !isBaseSetName(setName)) {
    return { variation: setName, uncertain: false };
  }
  return { variation: "", uncertain: false };
}

function parseWarnings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) =>
      item && typeof item === "object"
        ? asString((item as { message?: unknown }).message)
        : ""
    )
    .filter(Boolean);
}

/** Extrait la meilleure détection d'une réponse CardSight. null si aucune carte. */
export function parseCardSightResponse(payload: unknown): RecognizedCard | null {
  if (payload == null || typeof payload !== "object") {
    throw new RecognitionError("parse", "Unexpected CardSight response shape");
  }
  const response = payload as CardSightResponse;
  const detections = Array.isArray(response.detections)
    ? (response.detections as CardSightDetection[])
    : [];

  const best = detections
    .filter((detection) => detection.card != null)
    .sort(
      (a, b) =>
        CONFIDENCE_RANK[parseConfidence(b.confidence)] -
        CONFIDENCE_RANK[parseConfidence(a.confidence)]
    )[0];

  if (!best?.card) return null;

  const card = best.card;
  const { variation, uncertain } = parseVariation(card);
  const attributes = parseAttributes(card.attributes);
  const numberedTo =
    typeof card.numberedTo === "number" &&
    Number.isFinite(card.numberedTo) &&
    card.numberedTo > 0
      ? Math.trunc(card.numberedTo)
      : null;

  const recognized: RecognizedCard = {
    player: asString(card.name),
    year: asString(card.year),
    brand: asString(card.manufacturer),
    set: asString(card.releaseName),
    variation,
    cardNumber: asString(card.number),
    serialTotal: numberedTo,
    rookie: attributes.rookie,
    autograph: attributes.autograph,
    memorabilia: attributes.memorabilia,
    confidence: parseConfidence(best.confidence),
    variationUncertain: uncertain,
    warnings: parseWarnings(response.messages),
  };

  const hasContent =
    recognized.player ||
    recognized.year ||
    recognized.brand ||
    recognized.set ||
    recognized.variation ||
    recognized.cardNumber;
  return hasContent ? recognized : null;
}

/* ---------- Abonnement / usage ---------- */

export interface CardSightUsage {
  /** Appels cumulés (toutes clés) sur la période de facturation en cours. */
  totalCalls: number;
  /** Clé API courante, toujours masquée localement (jamais la valeur brute). */
  keyMasked: string | null;
  /** Appels de la clé courante sur la période. */
  keyCalls: number | null;
}

/**
 * Masque une clé API avant toute exposition (admin, logs, etc.).
 * Ne fait pas confiance au masquage éventuel du fournisseur.
 * Format : `••••` + 4 derniers caractères.
 */
export function maskApiKey(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 4) return "••••";
  return `••••${trimmed.slice(-4)}`;
}

/** Extrait l'usage d'une réponse GET /v1/subscription/. */
export function parseCardSightSubscription(payload: unknown): CardSightUsage {
  if (payload == null || typeof payload !== "object") {
    throw new RecognitionError(
      "parse",
      "Unexpected CardSight subscription response"
    );
  }
  const { calls, api_keys: apiKeys } = payload as {
    calls?: unknown;
    api_keys?: unknown;
  };
  if (typeof calls !== "number" || !Number.isFinite(calls)) {
    throw new RecognitionError(
      "parse",
      "CardSight subscription response has no call count"
    );
  }
  const firstKey = Array.isArray(apiKeys)
    ? (apiKeys[0] as { key?: unknown; calls?: unknown } | undefined)
    : undefined;
  return {
    totalCalls: Math.max(0, Math.trunc(calls)),
    // Remasquer même si CardSight a déjà « masqué » (peut renvoyer la clé en clair).
    keyMasked: maskApiKey(asString(firstKey?.key)),
    keyCalls:
      typeof firstKey?.calls === "number" && Number.isFinite(firstKey.calls)
        ? Math.max(0, Math.trunc(firstKey.calls))
        : null,
  };
}

/** Usage du compte CardSight (période de facturation = mois calendaire). */
export async function fetchCardSightUsage(): Promise<CardSightUsage> {
  const apiKey = process.env.CARDSIGHT_API_KEY?.trim();
  if (!apiKey) {
    throw new RecognitionError("unconfigured", "CARDSIGHT_API_KEY is not set");
  }

  let response: Response;
  try {
    response = await fetch(CARDSIGHT_SUBSCRIPTION_URL, {
      headers: { "X-API-Key": apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new RecognitionError("timeout", "CardSight request timed out");
    }
    throw new RecognitionError(
      "network",
      error instanceof Error ? error.message : "CardSight network error"
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new RecognitionError("auth", "CardSight rejected the API key");
  }
  if (response.status === 429) {
    throw new RecognitionError("quota", "CardSight rate limit reached");
  }
  if (!response.ok) {
    throw new RecognitionError("network", `CardSight HTTP ${response.status}`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new RecognitionError("parse", "CardSight returned invalid JSON");
  }
  const usage = parseCardSightSubscription(payload);
  // Source de vérité pour l’affichage : la clé locale, jamais celle renvoyée par CardSight.
  return { ...usage, keyMasked: maskApiKey(apiKey) };
}

/* ---------- Appel réseau ---------- */

/**
 * Identifie une carte de basket à partir d'une image (recto).
 * Renvoie null quand CardSight ne détecte aucune carte exploitable.
 */
export async function identifyCard(
  image: Buffer,
  mime: string
): Promise<RecognizedCard | null> {
  const apiKey = process.env.CARDSIGHT_API_KEY?.trim();
  if (!apiKey) {
    throw new RecognitionError("unconfigured", "CARDSIGHT_API_KEY is not set");
  }

  const body = new FormData();
  body.set(
    "image",
    new Blob([new Uint8Array(image)], { type: mime }),
    "card.jpg"
  );

  let response: Response;
  try {
    response = await fetch(CARDSIGHT_IDENTIFY_URL, {
      method: "POST",
      headers: { "X-API-Key": apiKey },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new RecognitionError("timeout", "CardSight request timed out");
    }
    throw new RecognitionError(
      "network",
      error instanceof Error ? error.message : "CardSight network error"
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new RecognitionError("auth", "CardSight rejected the API key");
  }
  if (response.status === 402 || response.status === 429) {
    throw new RecognitionError(
      "quota",
      `CardSight quota or rate limit reached (HTTP ${response.status})`
    );
  }
  if (response.status === 408) {
    throw new RecognitionError("timeout", "CardSight timed out (HTTP 408)");
  }
  if (!response.ok) {
    throw new RecognitionError(
      "network",
      `CardSight HTTP ${response.status}`
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new RecognitionError("parse", "CardSight returned invalid JSON");
  }

  const recognized = parseCardSightResponse(payload);
  log.info({
    msg: "CardSight identify",
    matched: recognized != null,
    confidence: recognized?.confidence ?? null,
  });
  return recognized;
}
