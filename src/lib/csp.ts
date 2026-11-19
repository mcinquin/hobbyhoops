const isDev = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";

/** Random per-request nonce for inline scripts. */
export function createNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

/** Content-Security-Policy header value allowing scripts with `nonce`. */
export function buildContentSecurityPolicy(nonce: string): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(isDev ? ["'unsafe-eval'"] : []),
  ].join(" ");

  const styleSrc = [
    "'self'",
    isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`,
  ].join(" ");

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  if (isProduction) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

/** Passes the nonce and CSP to the app through request headers (read by the root layout). */
export function applyCspRequestHeaders(
  requestHeaders: Headers,
  nonce: string,
  csp: string
): void {
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
}

/** Sets the CSP header on the response. */
export function applyCspResponseHeaders(
  response: Response,
  csp: string
): void {
  response.headers.set("Content-Security-Policy", csp);
}
