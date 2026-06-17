import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readSessionTokenPayload } from "@/lib/auth-session-crypto";
import {
  createSessionToken,
  sessionCookieOptions,
  verifySessionToken,
} from "@/lib/auth-session";
import { getDb } from "@/lib/db";
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
});
