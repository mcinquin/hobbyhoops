import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getRequestTranslator } from "@/i18n/request";
import { authMisconfiguredResponse } from "@/lib/auth-config";
import { authMisconfiguredPageResponse } from "@/lib/auth-pages";
import {
  applySessionRefreshToResponse,
  verifySessionToken,
} from "@/lib/auth-session";
import { SESSION_COOKIE_NAME } from "@/lib/auth-secret";
import {
  applyCspRequestHeaders,
  applyCspResponseHeaders,
  buildContentSecurityPolicy,
  createNonce,
} from "@/lib/csp";
import { buildPublicRequestUrl } from "@/lib/request-url";

const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/bootstrap",
  "/api/auth/me",
  "/api/auth/needs-bootstrap",
  "/api/health",
  "/api/locale",
];

/** Fichiers statiques publics accessibles sans authentification. */
const PUBLIC_STATIC_PATHS = new Set([
  "/manifest.webmanifest",
  "/sw.js",
  "/robots.txt",
]);

function copySearchParams(source: URL, target: URL): URL {
  source.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });
  return target;
}

function unauthenticatedEntryUrl(request: NextRequest, fromPath: string): URL {
  const url = buildPublicRequestUrl(request, "/");
  if (fromPath !== "/") {
    url.searchParams.set("from", fromPath);
  }
  return url;
}

function nextWithCsp(request: NextRequest): NextResponse {
  const nonce = createNonce();
  const csp = buildContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  applyCspRequestHeaders(requestHeaders, nonce, csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  applyCspResponseHeaders(response, csp);
  return response;
}

function withSessionRefresh(
  request: NextRequest,
  response: NextResponse,
  token: string | undefined
): NextResponse {
  return applySessionRefreshToResponse(response, request, token);
}

function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token) !== null;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (PUBLIC_STATIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    const isPublic = PUBLIC_API_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );
    if (isPublic) return NextResponse.next();

    const misconfigured = authMisconfiguredResponse(request);
    if (misconfigured) return misconfigured;

    if (!verifySessionToken(sessionToken)) {
      const t = getRequestTranslator(request);
      return NextResponse.json({ error: t("errors.unauthorized") }, { status: 401 });
    }
    return withSessionRefresh(request, NextResponse.next(), sessionToken);
  }

  const pageMisconfigured = authMisconfiguredPageResponse(request);
  if (pageMisconfigured) return pageMisconfigured;

  if (pathname === "/login") {
    const home = copySearchParams(
      request.nextUrl,
      buildPublicRequestUrl(request, "/")
    );
    return NextResponse.redirect(home, 301);
  }

  const authenticated = isAuthenticated(request);

  if (pathname === "/") {
    if (!authenticated) {
      const loginUrl = copySearchParams(request.nextUrl, request.nextUrl.clone());
      loginUrl.pathname = "/login";
      return NextResponse.rewrite(loginUrl);
    }
    return withSessionRefresh(request, nextWithCsp(request), sessionToken);
  }

  if (!authenticated) {
    return NextResponse.redirect(unauthenticatedEntryUrl(request, pathname));
  }

  return withSessionRefresh(request, nextWithCsp(request), sessionToken);
}

export const config = {
  matcher: [
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|manifest\\.webmanifest|sw\\.js|robots\\.txt|.*\\.(?:ico|png|jpg|jpeg|svg|webp|gif)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
    "/api/:path*",
  ],
};
