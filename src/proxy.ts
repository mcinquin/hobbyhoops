import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getRequestTranslator } from "@/i18n/request";
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

  if (pathname.startsWith("/api/")) {
    const isPublic = PUBLIC_API_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );
    if (isPublic) return NextResponse.next();

    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!verifySessionToken(token)) {
      const t = getRequestTranslator(request);
      return NextResponse.json({ error: t("errors.unauthorized") }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (pathname === "/login") {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (verifySessionToken(token)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return nextWithCsp(request);
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  return nextWithCsp(request);
}

export const config = {
  matcher: [
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|svg|webp|gif)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
    "/api/:path*",
  ],
};
