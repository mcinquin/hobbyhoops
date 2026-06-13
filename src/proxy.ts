import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getRequestTranslator } from "@/i18n/request";
import { authMisconfiguredResponse } from "@/lib/auth-config";
import { authMisconfiguredPageResponse } from "@/lib/auth-pages";
import { SESSION_COOKIE_NAME } from "@/lib/auth-secret";
import { verifySessionToken } from "@/lib/auth-session";
import {
  applyCspRequestHeaders,
  applyCspResponseHeaders,
  buildContentSecurityPolicy,
  createNonce,
} from "@/lib/csp";

const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/bootstrap",
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
  const url = new URL("/", request.url);
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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!verifySessionToken(token)) {
      const t = getRequestTranslator(request);
      return NextResponse.json({ error: t("errors.unauthorized") }, { status: 401 });
    }
    return NextResponse.next();
  }

  const pageMisconfigured = authMisconfiguredPageResponse(request);
  if (pageMisconfigured) return pageMisconfigured;

  if (pathname === "/login") {
    const home = copySearchParams(request.nextUrl, new URL("/", request.url));
    return NextResponse.redirect(home, 301);
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = verifySessionToken(token);

  if (pathname === "/") {
    if (!isAuthenticated) {
      const loginUrl = copySearchParams(
        request.nextUrl,
        new URL("/login", request.url)
      );
      return NextResponse.rewrite(loginUrl);
    }
    return nextWithCsp(request);
  }

  if (!isAuthenticated) {
    return NextResponse.redirect(unauthenticatedEntryUrl(request, pathname));
  }

  return nextWithCsp(request);
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
