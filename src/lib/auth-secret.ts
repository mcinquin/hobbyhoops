export const SESSION_COOKIE_NAME = "hh_session";

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET doit être défini (16 caractères minimum) pour lancer l'application."
    );
  }
  return secret;
}

function forwardedProtoIsHttps(headers: Headers): boolean | null {
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
