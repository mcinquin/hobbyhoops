export const SESSION_COOKIE_NAME = "hh_session";

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  const minLength = 32;
  if (!secret || secret.length < minLength) {
    throw new Error(
      `AUTH_SECRET doit être défini (${minLength} caractères minimum) pour lancer l'application.`
    );
  }
  return secret;
}

function forwardedProtoIsHttps(headers: Headers): boolean | null {
  if (process.env.TRUST_PROXY?.trim().toLowerCase() !== "true") return null;
  const forwarded = headers.get("x-forwarded-proto");
  if (!forwarded) return null;
  return forwarded.split(",")[0]?.trim().toLowerCase() === "https";
}

export function isCookieSecure(request?: Pick<Request, "headers">): boolean {
  const configured = process.env.COOKIE_SECURE?.trim().toLowerCase();
  if (configured === "true") return true;
  if (configured === "false") return false;
  if (request) {
    const fromProxy = forwardedProtoIsHttps(request.headers);
    if (fromProxy !== null) return fromProxy;
  }
  return process.env.NODE_ENV === "production";
}
