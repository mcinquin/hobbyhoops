import { createHash } from "crypto";
import { getDb } from "./db";
import { runInTransaction } from "./sqlite";

type RateLimitRow = {
  count: number;
  reset_at: number;
};

function trustProxyHeaders(): boolean {
  return process.env.TRUST_PROXY?.trim().toLowerCase() === "true";
}

function storageKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function retryAfter(resetAt: number, now: number): number {
  return Math.max(1, Math.ceil((resetAt - now) / 1000));
}

function pruneExpiredRateLimits(now: number): void {
  getDb().prepare("DELETE FROM rate_limits WHERE reset_at <= ?").run(now);
}

export function getClientIp(request: Request): string {
  if (trustProxyHeaders()) {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0]?.trim() || "unknown";
    }
    const realIp = request.headers.get("x-real-ip");
    if (realIp) {
      return realIp.trim();
    }
  }

  // Next.js n'expose pas toujours l'IP socket. Par défaut, ne pas faire
  // confiance aux en-têtes proxy spoofables.
  return "direct";
}

export function checkRateLimit(
  key: string,
  {
    limit,
    windowMs,
  }: {
    limit: number;
    windowMs: number;
  }
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const resetAt = now + windowMs;
  const dbKey = storageKey(key);
  const db = getDb();
  let result: { allowed: boolean; retryAfterSec: number } = {
    allowed: true,
    retryAfterSec: 0,
  };

  runInTransaction(db, () => {
    pruneExpiredRateLimits(now);
    const row = db
      .prepare("SELECT count, reset_at FROM rate_limits WHERE key = ?")
      .get(dbKey) as RateLimitRow | undefined;

    if (!row || row.reset_at <= now) {
      db.prepare(
        "INSERT INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = 1, reset_at = excluded.reset_at"
      ).run(dbKey, resetAt);
      return;
    }

    if (row.count >= limit) {
      result = { allowed: false, retryAfterSec: retryAfter(row.reset_at, now) };
      return;
    }

    db.prepare("UPDATE rate_limits SET count = count + 1 WHERE key = ?").run(dbKey);
  });

  return result;
}

export function peekRateLimit(
  key: string,
  {
    limit,
  }: {
    limit: number;
    windowMs: number;
  }
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const row = getDb()
    .prepare("SELECT count, reset_at FROM rate_limits WHERE key = ?")
    .get(storageKey(key)) as RateLimitRow | undefined;

  if (!row || row.reset_at <= now) {
    return { allowed: true, retryAfterSec: 0 };
  }

  if (row.count >= limit) {
    return {
      allowed: false,
      retryAfterSec: retryAfter(row.reset_at, now),
    };
  }

  return { allowed: true, retryAfterSec: 0 };
}

export function resetRateLimit(key: string): void {
  getDb().prepare("DELETE FROM rate_limits WHERE key = ?").run(storageKey(key));
}
