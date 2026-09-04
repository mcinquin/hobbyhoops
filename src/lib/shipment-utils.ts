import type { Shipment, ShipmentPlatform, ShipmentStatus } from "./types";
import {
  formatIsoDateForInput,
  formatIsoDateLabel,
  formatTodayIsoDate,
  ISO_DATE_REGEX,
  parseDateInputToIso,
  parseIsoDate,
  type DateLocale,
} from "./locale-date";

export const EBAY_PROTECTION_DAYS = 30;
export const VINTED_PROTECTION_DAYS = 2;

export const SHIPMENT_STATUSES: ShipmentStatus[] = [
  "pending",
  "shipped",
  "in_transit",
  "delivered",
  "received",
  "dispute",
];

export const SHIPMENT_PLATFORMS: ShipmentPlatform[] = [
  "ebay",
  "vinted",
  "comc",
  "private",
  "other",
];

export function normalizeShipmentDate(
  value: string | null | undefined
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (ISO_DATE_REGEX.test(trimmed)) {
    return parseIsoDate(trimmed) ? trimmed : null;
  }

  return parseDateInputToIso(trimmed, "fr");
}

export function formatShipmentDateLabel(
  value: string | null | undefined,
  locale: DateLocale = "fr"
): string {
  const normalized = normalizeShipmentDate(value);
  if (!normalized) return "—";
  return formatIsoDateLabel(normalized, locale);
}

export function formatShipmentDateForInput(
  value: string | null | undefined,
  locale: DateLocale = "fr"
): string {
  const normalized = normalizeShipmentDate(value);
  if (!normalized) return "";
  return formatIsoDateForInput(normalized, locale);
}

export function parseShipmentDateInput(
  value: string | null | undefined,
  locale: DateLocale = "fr"
): string | null {
  return parseDateInputToIso(value, locale);
}

export function formatTodayShipmentDateForInput(
  locale: DateLocale = "fr"
): string {
  return formatShipmentDateForInput(formatTodayIsoDate(), locale);
}

export { formatTodayIsoDate };

export type ProtectionUrgency = "safe" | "warning" | "critical" | "expired";

export type ShipmentProtectionPhase = "awaiting_delivery" | "claim_window";

export interface ShipmentProtectionInfo {
  platform: "ebay" | "vinted";
  /** Date de début de la fenêtre de litige (ou livraison estimée si en attente). */
  protectionStartAt: string;
  totalDays: number;
  daysElapsed: number;
  daysRemaining: number;
  progressPercent: number;
  urgency: ProtectionUrgency;
  isActive: boolean;
  phase: ShipmentProtectionPhase;
}

/** @deprecated Alias conservé pour la compatibilité interne. */
export type EbayProtectionInfo = ShipmentProtectionInfo;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function inactiveProtection(
  platform: "ebay" | "vinted",
  protectionStartAt: string,
  totalDays: number
): ShipmentProtectionInfo {
  return {
    platform,
    protectionStartAt,
    totalDays,
    daysElapsed: totalDays,
    daysRemaining: 0,
    progressPercent: 100,
    urgency: "expired",
    isActive: false,
    phase: "claim_window",
  };
}

function resolveProtectionUrgency(
  daysRemaining: number,
  platform: "ebay" | "vinted"
): ProtectionUrgency {
  if (daysRemaining === 0) return "expired";
  if (platform === "vinted") {
    if (daysRemaining === 1) return "critical";
    return "warning";
  }
  if (daysRemaining <= 3) return "critical";
  if (daysRemaining <= 7) return "warning";
  return "safe";
}

function buildActiveProtection(
  platform: "ebay" | "vinted",
  protectionStartAt: string,
  totalDays: number,
  daysElapsed: number,
  phase: ShipmentProtectionPhase
): ShipmentProtectionInfo {
  const daysRemaining = Math.max(0, totalDays - daysElapsed);
  const progressPercent = Math.min(
    100,
    Math.round((daysElapsed / totalDays) * 100)
  );

  return {
    platform,
    protectionStartAt,
    totalDays,
    daysElapsed,
    daysRemaining,
    progressPercent,
    urgency: resolveProtectionUrgency(daysRemaining, platform),
    isActive: true,
    phase,
  };
}

export function computeEbayProtection(
  expectedDelivery: string | null,
  status: ShipmentStatus
): ShipmentProtectionInfo | null {
  if (!expectedDelivery) return null;

  const parsed = parseIsoDate(expectedDelivery);
  if (!parsed) return null;

  if (status === "received" || status === "dispute") {
    return inactiveProtection("ebay", expectedDelivery, EBAY_PROTECTION_DAYS);
  }

  const today = startOfDay(new Date());
  const delivery = startOfDay(parsed);
  const msPerDay = 86_400_000;
  const daysElapsed = Math.max(
    0,
    Math.floor((today.getTime() - delivery.getTime()) / msPerDay)
  );

  return buildActiveProtection(
    "ebay",
    expectedDelivery,
    EBAY_PROTECTION_DAYS,
    daysElapsed,
    "claim_window"
  );
}

function vintedClaimStart(
  expectedDelivery: string,
  status: ShipmentStatus
): Date {
  const delivery = startOfDay(parseIsoDate(expectedDelivery)!);
  const today = startOfDay(new Date());
  if (status === "delivered") {
    return today.getTime() >= delivery.getTime() ? today : delivery;
  }
  return delivery;
}

export function computeVintedProtection(
  expectedDelivery: string | null,
  status: ShipmentStatus
): ShipmentProtectionInfo | null {
  if (!expectedDelivery) return null;

  const parsed = parseIsoDate(expectedDelivery);
  if (!parsed) return null;

  if (status === "received" || status === "dispute") {
    return inactiveProtection("vinted", expectedDelivery, VINTED_PROTECTION_DAYS);
  }

  const today = startOfDay(new Date());
  const claimStart = vintedClaimStart(expectedDelivery, status);

  if (today.getTime() < claimStart.getTime() && status !== "delivered") {
    return buildActiveProtection(
      "vinted",
      expectedDelivery,
      VINTED_PROTECTION_DAYS,
      0,
      "awaiting_delivery"
    );
  }

  const msPerDay = 86_400_000;
  const daysElapsed = Math.max(
    0,
    Math.floor((today.getTime() - claimStart.getTime()) / msPerDay)
  );

  return buildActiveProtection(
    "vinted",
    toIsoDate(claimStart),
    VINTED_PROTECTION_DAYS,
    daysElapsed,
    "claim_window"
  );
}

export type DetectedCarrier =
  | "laposte"
  | "colissimo"
  | "chronopost"
  | "mondialrelay"
  | "speedpak"
  | "usps"
  | "ups"
  | "fedex"
  | "dhl"
  | "unknown";

/** Préfixes SpeedPAK / Orange Connex (eBay Chine → Europe). */
const SPEEDPAK_PREFIXES = [
  // Format officiel Orange Connex (28 car. : ES/EE/EX/EM + 26).
  "ES",
  "EE",
  "EX",
  "EM",
  // Anciens / variantes S10 Chine parfois vues sur eBay.
  "LK",
  "LM",
  "LX",
  "LY",
  "LZ",
  "UC",
  "JD",
  "SF",
] as const;

export function detectCarrier(trackingNumber: string): DetectedCarrier {
  const normalized = trackingNumber.trim().toUpperCase().replace(/\s+/g, "");
  if (!normalized) return "unknown";

  // SpeedPAK / Orange Connex — avant les heuristiques génériques (sinon → unknown → ParcelsApp).
  if (/^(ES|EE|EX|EM)[A-Z0-9]{20,30}$/.test(normalized)) {
    return "speedpak";
  }

  if (/^1Z[A-Z0-9]{16}$/.test(normalized)) return "ups";
  if (/^\d{20,22}$/.test(normalized) || /^9\d{21,}$/.test(normalized)) {
    return "usps";
  }
  if (/^\d{12,15}$/.test(normalized) && normalized.startsWith("3")) {
    return "fedex";
  }

  // Mondial Relay : n° d'expédition 8 chiffres (format classique).
  if (/^\d{8}$/.test(normalized)) return "mondialrelay";

  // DHL Express : 10 chiffres — 11 chiffres trop ambigus (souvent MR / autres).
  if (/^\d{10}$/.test(normalized)) return "dhl";

  // La Poste / Colissimo / Lettre suivie (S10 UPU, préfixe parfois chiffre+lettre ex. 6A…FR).
  if (/^[A-Z0-9]{2}\d{9}[A-Z]{2}$/.test(normalized)) {
    const destination = normalized.slice(-2);
    // Variantes S10 Chine parfois routées SpeedPAK.
    if (
      destination === "CN" &&
      SPEEDPAK_PREFIXES.some((prefix) => normalized.startsWith(prefix))
    ) {
      return "speedpak";
    }
    return "laposte";
  }

  if (/^[A-Z0-9]{2}\d{9,11}$/.test(normalized)) return "laposte";
  if (/^\d{13}$/.test(normalized)) return "colissimo";

  // Autres formats SpeedPAK / Orange Connex (longueur variable).
  if (
    /^[A-Z0-9]{12,32}$/.test(normalized) &&
    SPEEDPAK_PREFIXES.some((prefix) => normalized.startsWith(prefix))
  ) {
    return "speedpak";
  }

  return "unknown";
}

function buildParcelsAppUrl(
  trackingNumber: string,
  locale: "fr" | "en" = "fr"
): string {
  const code = encodeURIComponent(trackingNumber.trim());
  const lang = locale === "fr" ? "fr" : "en";
  return `https://parcelsapp.com/${lang}/tracking/${code}`;
}

export function buildTrackingUrl(
  trackingNumber: string,
  carrier?: string | null,
  locale: "fr" | "en" = "fr"
): string {
  const trimmed = trackingNumber.trim();
  const code = encodeURIComponent(trimmed);
  const detected =
    carrier && carrier !== "unknown"
      ? (carrier as DetectedCarrier)
      : detectCarrier(trackingNumber);

  switch (detected) {
    case "laposte":
    case "colissimo":
    case "chronopost":
      return `https://www.laposte.fr/outils/suivre-vos-envois?code=${code}`;
    case "mondialrelay":
      return `https://www.mondialrelay.fr/suivi-de-colis/?numeroExpedition=${code}`;
    case "speedpak":
      // SpeedPAK / Orange Connex (eBay Chine) — suivi via 17track.
      return `https://t.17track.net/en#nums=${code}`;
    case "usps":
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${code}`;
    case "ups":
      return `https://www.ups.com/track?tracknum=${code}`;
    case "fedex":
      return `https://www.fedex.com/fedextrack/?trknbr=${code}`;
    case "dhl":
      return `https://www.dhl.com/fr-fr/home/tracking.html?tracking-id=${code}`;
    default:
      // Agrégateur multi-transporteurs (MR, Colissimo, Lettre suivie…).
      return buildParcelsAppUrl(trimmed, locale);
  }
}

export function buildEbayOrderUrl(
  platform: ShipmentPlatform,
  orderId: string | null
): string | null {
  if (platform !== "ebay") return null;
  if (orderId?.trim()) {
    return `https://www.ebay.fr/vod/FetchOrderDetails?orderId=${encodeURIComponent(orderId.trim())}`;
  }
  return "https://www.ebay.fr/mye/myebay/purchase";
}

export function buildEbayDisputeUrl(platform: ShipmentPlatform): string | null {
  if (platform !== "ebay") return null;
  return "https://www.ebay.fr/res/ItemNotReceived";
}

export function buildVintedOrderUrl(platform: ShipmentPlatform): string | null {
  if (platform !== "vinted") return null;
  return "https://www.vinted.fr/inbox";
}

export function buildVintedDisputeUrl(platform: ShipmentPlatform): string | null {
  if (platform !== "vinted") return null;
  return "https://www.vinted.fr/help/912";
}

export function buildPlatformOrderUrl(
  platform: ShipmentPlatform,
  orderId: string | null
): string | null {
  return buildEbayOrderUrl(platform, orderId) ?? buildVintedOrderUrl(platform);
}

export function buildPlatformDisputeUrl(
  platform: ShipmentPlatform
): string | null {
  return buildEbayDisputeUrl(platform) ?? buildVintedDisputeUrl(platform);
}

export function isActiveShipment(status: ShipmentStatus): boolean {
  return status !== "received";
}

export function statusSortWeight(status: ShipmentStatus): number {
  switch (status) {
    case "dispute":
      return 0;
    case "pending":
      return 1;
    case "shipped":
      return 2;
    case "in_transit":
      return 3;
    case "delivered":
      return 4;
    case "received":
      return 5;
    default:
      return 6;
  }
}

export function compareShipmentsByUrgency(a: Shipment, b: Shipment): number {
  const protectionA = getShipmentProtection(a);
  const protectionB = getShipmentProtection(b);

  const remainingA = protectionA?.isActive ? protectionA.daysRemaining : 999;
  const remainingB = protectionB?.isActive ? protectionB.daysRemaining : 999;
  if (remainingA !== remainingB) return remainingA - remainingB;

  const phaseWeight = (protection: ShipmentProtectionInfo | null) => {
    if (protection?.phase === "claim_window") return 0;
    if (protection?.phase === "awaiting_delivery") return 1;
    return 2;
  };
  const phaseDiff = phaseWeight(protectionA) - phaseWeight(protectionB);
  if (phaseDiff !== 0) return phaseDiff;

  const statusDiff = statusSortWeight(a.status) - statusSortWeight(b.status);
  if (statusDiff !== 0) return statusDiff;

  return b.orderedAt.localeCompare(a.orderedAt);
}

export function formatPriceLabel(
  priceCents: number | null,
  currency: string,
  locale: "fr" | "en" = "fr"
): string | null {
  if (priceCents == null) return null;
  const amount = priceCents / 100;
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency: currency || "EUR",
  }).format(amount);
}

export function timelineStepIndex(status: ShipmentStatus): number {
  switch (status) {
    case "pending":
      return 0;
    case "shipped":
      return 1;
    case "in_transit":
      return 2;
    case "delivered":
    case "received":
      return 3;
    case "dispute":
      return 2;
    default:
      return 0;
  }
}

export interface ShipmentAlertItem {
  shipment: Shipment;
  protection: ShipmentProtectionInfo | null;
}

export interface ShipmentAlertSummary {
  activeCount: number;
  urgentCount: number;
  alerts: ShipmentAlertItem[];
  preview: ShipmentAlertItem[];
}

export function isUrgentProtection(protection: ShipmentProtectionInfo): boolean {
  if (protection.phase === "awaiting_delivery") return false;
  return (
    protection.urgency === "warning" ||
    protection.urgency === "critical" ||
    protection.urgency === "expired"
  );
}

export function getShipmentProtection(
  shipment: Shipment
): ShipmentProtectionInfo | null {
  if (shipment.platform === "ebay") {
    return computeEbayProtection(shipment.expectedDelivery, shipment.status);
  }
  if (shipment.platform === "vinted") {
    return computeVintedProtection(shipment.expectedDelivery, shipment.status);
  }
  return null;
}

export function buildShipmentAlertSummary(
  shipments: Shipment[],
  previewLimit = 4
): ShipmentAlertSummary {
  const active = shipments.filter((shipment) => isActiveShipment(shipment.status));
  const alerts: ShipmentAlertItem[] = [];

  for (const shipment of active) {
    const protection = getShipmentProtection(shipment);
    if (protection?.isActive && isUrgentProtection(protection)) {
      alerts.push({ shipment, protection });
    }
  }

  alerts.sort((a, b) => {
    const remainingA = a.protection?.daysRemaining ?? 999;
    const remainingB = b.protection?.daysRemaining ?? 999;
    return remainingA - remainingB;
  });

  const sortedActive = [...active].sort(compareShipmentsByUrgency);
  const previewItems: ShipmentAlertItem[] = sortedActive
    .slice(0, previewLimit)
    .map((shipment) => ({
      shipment,
      protection: getShipmentProtection(shipment),
    }));

  return {
    activeCount: active.length,
    urgentCount: alerts.length,
    alerts,
    preview: previewItems,
  };
}
