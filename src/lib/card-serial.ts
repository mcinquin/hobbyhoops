import type { Card } from "./types";

const SERIAL_FRACTION_PATTERN = /^(\d+)\s*\/\s*(\d+)$/;
const SERIAL_TOTAL_ONLY_PATTERN = /^\/(\d+)$/;

function parsePositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function isLikelyCorruptedSerialNumber(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (SERIAL_FRACTION_PATTERN.test(trimmed) || SERIAL_TOTAL_ONLY_PATTERN.test(trimmed)) {
    return false;
  }
  if (!/^-?\d+(?:\.\d+)?$/.test(trimmed)) return false;
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) && numeric >= 10_000;
}

export function normalizeCardSerialFields<
  T extends Pick<Card, "serialNumber" | "serialCurrent" | "serialTotal">,
>(card: T): T {
  const raw = card.serialNumber?.trim();
  if (!raw) {
    return { ...card, serialNumber: null, serialCurrent: null, serialTotal: null };
  }

  if (isLikelyCorruptedSerialNumber(raw)) {
    return { ...card, serialNumber: null, serialCurrent: null, serialTotal: null };
  }

  const fraction = raw.match(SERIAL_FRACTION_PATTERN);
  if (fraction) {
    return {
      ...card,
      serialNumber: raw,
      serialCurrent: card.serialCurrent ?? parsePositiveInt(fraction[1]),
      serialTotal: card.serialTotal ?? parsePositiveInt(fraction[2]),
    };
  }

  const totalOnly = raw.match(SERIAL_TOTAL_ONLY_PATTERN);
  if (totalOnly) {
    return {
      ...card,
      serialNumber: raw,
      serialCurrent: null,
      serialTotal: card.serialTotal ?? parsePositiveInt(totalOnly[1]),
    };
  }

  return { ...card, serialNumber: raw };
}
