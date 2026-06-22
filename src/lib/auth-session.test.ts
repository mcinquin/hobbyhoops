import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readSessionTokenPayload } from "@/lib/auth-session-crypto";
import {
  createSessionToken,
  maybeRefreshSessionToken,
  SESSION_MAX_AGE_SEC,
  sessionCookieOptions,
  verifySessionToken,
} from "@/lib/auth-session";
import { getDb } from "@/lib/db";
import {
  MAX_SESSIONS_PER_USER,
  listStoredSessionsForUser,
} from "@/lib/session-store";
import { resetDatabaseCacheForTests } from "@/lib/test/db-test-helper";

describe("auth session", () => {
  let dbPath: string;

  beforeEach(() => {
    process.env.AUTH_SECRET =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    resetDatabaseCacheForTests();
    dbPath = path.join("data", `test-auth-${randomUUID()}.db`);
    process.env.HOBBYHOOPS_DB_PATH = dbPath;
  });

  afterEach(() => {
    vi.useRealTimers();
    resetDatabaseCacheForTests();
    for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    delete process.env.HOBBYHOOPS_DB_PATH;
  });

  it("creates and verifies a session token", async () => {
    const token = await createSessionToken("user-1", "admin");
    const payload = verifySessionToken(token);
    expect(payload?.userId).toBe("user-1");
    expect(payload?.username).toBe("admin");
    expect(readSessionTokenPayload(token)?.userId).toBe("user-1");
  });

  it("rejects tampered tokens", async () => {
    const token = await createSessionToken("user-1", "admin");
    const tampered = `${token}x`;
    expect(verifySessionToken(tampered)).toBeNull();
    expect(readSessionTokenPayload(tampered)).toBeNull();
  });

  it("rejects revoked sessions without sqlite in crypto-only check", async () => {
    const token = await createSessionToken("user-1", "admin");
    expect(readSessionTokenPayload(token)).not.toBeNull();

    const session = verifySessionToken(token);
    expect(session).not.toBeNull();
    getDb().prepare("DELETE FROM sessions WHERE id = ?").run(session!.sid);

    expect(readSessionTokenPayload(token)).not.toBeNull();
    expect(verifySessionToken(token)).toBeNull();
  });

  it("uses lax sameSite so sessions survive external top-level navigations", () => {
    expect(sessionCookieOptions(3600).sameSite).toBe("lax");
  });

  it("uses a 30-day session duration", () => {
    expect(SESSION_MAX_AGE_SEC).toBe(30 * 24 * 60 * 60);
  });

  it("keeps multiple concurrent sessions for the same user", async () => {
    const tokenA = await createSessionToken("user-1", "admin");
    const tokenB = await createSessionToken("user-1", "admin");

    const sessionA = verifySessionToken(tokenA);
    const sessionB = verifySessionToken(tokenB);
    expect(sessionA).not.toBeNull();
    expect(sessionB).not.toBeNull();
    expect(sessionA!.sid).not.toBe(sessionB!.sid);
    expect(listStoredSessionsForUser("user-1")).toHaveLength(2);
  });

  it("enforces the max sessions per user cap", async () => {
    const tokens: string[] = [];
    for (let i = 0; i < MAX_SESSIONS_PER_USER + 2; i += 1) {
      tokens.push(await createSessionToken("user-1", "admin"));
    }

    const validCount = tokens.filter((token) => verifySessionToken(token)).length;
    expect(validCount).toBe(MAX_SESSIONS_PER_USER);
    expect(listStoredSessionsForUser("user-1")).toHaveLength(MAX_SESSIONS_PER_USER);
  });

  it("stores user-agent metadata when request headers are provided", async () => {
    const request = new Request("https://example.com", {
      headers: { "user-agent": "Mozilla/5.0 (Android 14)" },
    });
    const token = await createSessionToken("user-1", "admin", request);
    const session = verifySessionToken(token);
    expect(session).not.toBeNull();

    const row = getDb()
      .prepare("SELECT user_agent FROM sessions WHERE id = ?")
      .get(session!.sid) as { user_agent: string };
    expect(row.user_agent).toContain("Android");
  });

  it("does not refresh sessions with more than 7 days remaining", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T12:00:00Z"));

    const token = await createSessionToken("user-1", "admin");
    vi.setSystemTime(new Date("2025-01-03T12:00:00Z"));

    const { refreshedToken } = maybeRefreshSessionToken(token);
    expect(refreshedToken).toBeNull();
  });

  it("slides session expiry when less than 7 days remain", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T12:00:00Z"));

    const token = await createSessionToken("user-1", "admin");
    const before = verifySessionToken(token);
    expect(before).not.toBeNull();

    vi.setSystemTime(new Date("2025-01-25T12:00:00Z"));

    const { refreshedToken, session } = maybeRefreshSessionToken(token);
    expect(refreshedToken).not.toBeNull();
    expect(session).not.toBeNull();
    expect(session!.exp).toBeGreaterThan(before!.exp);
    expect(verifySessionToken(refreshedToken!)).not.toBeNull();
  });
});
