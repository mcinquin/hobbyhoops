import type { NextRequest } from "next/server";

function trustProxyHeaders(): boolean {
  return process.env.TRUST_PROXY?.trim().toLowerCase() === "true";
}

function firstHeaderValue(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

function isUnusablePublicHost(host: string): boolean {
  const hostname = host
    .split(":")[0]
    ?.replace(/^\[/, "")
    .replace(/\]$/, "")
    .toLowerCase();
  return !hostname || hostname === "0.0.0.0" || hostname === "::";
}

function resolveRequestHost(request: NextRequest): string | null {
  if (trustProxyHeaders()) {
    const forwarded = firstHeaderValue(request.headers.get("x-forwarded-host"));
    if (forwarded && !isUnusablePublicHost(forwarded)) return forwarded;
  }

  const host = firstHeaderValue(request.headers.get("host"));
  if (host && !isUnusablePublicHost(host)) return host;

  const fallbackHost = new URL(request.url).host;
  if (fallbackHost && !isUnusablePublicHost(fallbackHost)) return fallbackHost;

  return null;
}

function resolveRequestProtocol(request: NextRequest): string {
  if (trustProxyHeaders()) {
    const forwarded = firstHeaderValue(request.headers.get("x-forwarded-proto"));
    if (forwarded) return forwarded.toLowerCase();
  }

  return new URL(request.url).protocol.replace(":", "").toLowerCase() || "http";
}

/** Origin public (domaine client), jamais l’adresse d’écoute Docker (0.0.0.0). */
export function getPublicOrigin(request: NextRequest): string {
  const host = resolveRequestHost(request);
  const proto = resolveRequestProtocol(request);
  if (host) return `${proto}://${host.toLowerCase()}`;
  return new URL(request.url).origin;
}

export function buildPublicRequestUrl(
  request: NextRequest,
  pathname: string
): URL {
  return new URL(pathname, getPublicOrigin(request));
}
