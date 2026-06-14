import { createHmac, timingSafeEqual } from "crypto";
import { getAuthSecret } from "./auth-secret";

export interface SessionPayload {
  userId: string;
  username: string;
  exp: number;
  /** Identifiant de session côté serveur (révocation). */
  sid: string;
}

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(s: string): Buffer {
  const pad = 4 - (s.length % 4);
  const b64 =
    s.replace(/-/g, "+").replace(/_/g, "/") + (pad < 4 ? "=".repeat(pad) : "");
  return Buffer.from(b64, "base64");
}

/** Vérifie signature et expiration du jeton, sans accès SQLite (safe pour le proxy). */
export function readSessionTokenPayload(
  token: string | undefined | null
): SessionPayload | null {
  if (!token || !token.includes(".")) return null;
  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) return null;
  try {
    const expected = createHmac("sha256", getAuthSecret())
      .update(payloadB64)
      .digest();
    const actual = base64UrlDecode(sigB64);
    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      return null;
    }
    const payload = JSON.parse(
      base64UrlDecode(payloadB64).toString("utf8")
    ) as SessionPayload;
    if (
      typeof payload.userId !== "string" ||
      typeof payload.username !== "string" ||
      typeof payload.exp !== "number" ||
      typeof payload.sid !== "string"
    ) {
      return null;
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function encodeSessionToken(payload: SessionPayload): string {
  const payloadB64 = base64UrlEncode(
    Buffer.from(JSON.stringify(payload), "utf8")
  );
  const sig = createHmac("sha256", getAuthSecret())
    .update(payloadB64)
    .digest();
  const sigB64 = base64UrlEncode(sig);
  return `${payloadB64}.${sigB64}`;
}
