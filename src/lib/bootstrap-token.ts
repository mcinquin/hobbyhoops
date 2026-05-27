import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

const HEADER_NAME = "x-bootstrap-token";

export function isBootstrapTokenRequired(): boolean {
  if (process.env.NODE_ENV === "production") return true;
  return Boolean(process.env.BOOTSTRAP_TOKEN?.trim());
}

export function isBootstrapConfigured(): boolean {
  return Boolean(process.env.BOOTSTRAP_TOKEN?.trim());
}

export function isBootstrapTokenValid(request: NextRequest): boolean {
  const configured = process.env.BOOTSTRAP_TOKEN?.trim();
  if (!configured) return !isBootstrapTokenRequired();
  const provided = request.headers.get(HEADER_NAME)?.trim() ?? "";
  const expected = Buffer.from(configured, "utf8");
  const actual = Buffer.from(provided, "utf8");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
