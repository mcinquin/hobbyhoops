import type { NextRequest } from "next/server";

const HEADER_NAME = "x-bootstrap-token";

export function isBootstrapTokenRequired(): boolean {
  return Boolean(process.env.BOOTSTRAP_TOKEN?.trim());
}

export function isBootstrapTokenValid(request: NextRequest): boolean {
  const configured = process.env.BOOTSTRAP_TOKEN?.trim();
  if (!configured) return true;
  const provided = request.headers.get(HEADER_NAME)?.trim();
  return provided === configured;
}
