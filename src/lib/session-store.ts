import { getDb } from "./db";
import { runInTransaction } from "./sqlite";

export const MAX_SESSIONS_PER_USER = 5;

/** Session côté serveur (révocable), alignée sur le champ `exp` du jeton signé. */
export interface StoredSession {
  id: string;
  userId: string;
  /** Unix seconds (identique à `exp` dans le cookie JWT-like) */
  exp: number;
  createdAt: number;
  lastSeenAt: number;
  userAgent: string;
}

export interface StoredSessionSummary {
  id: string;
  createdAt: number;
  lastSeenAt: number;
  userAgent: string;
  expiresAt: number;
}

function rowToSession(row: Record<string, unknown>): StoredSession {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    exp: Number(row.exp),
    createdAt: Number(row.created_at ?? 0),
    lastSeenAt: Number(row.last_seen_at ?? 0),
    userAgent: String(row.user_agent ?? ""),
  };
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function pruneExpiredSessions(): void {
  getDb().prepare("DELETE FROM sessions WHERE exp <= ?").run(nowSeconds());
}

/** Enregistre une nouvelle session (après login / bootstrap / rotation). */
export async function createStoredSession(session: StoredSession): Promise<void> {
  const db = getDb();
  runInTransaction(db, () => {
    pruneExpiredSessions();
    db.prepare("DELETE FROM sessions WHERE id = ?").run(session.id);
    db.prepare(
      `INSERT INTO sessions (id, user_id, exp, created_at, last_seen_at, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      session.id,
      session.userId,
      session.exp,
      session.createdAt,
      session.lastSeenAt,
      session.userAgent
    );
  });
}

/** Supprime une session (déconnexion). */
export async function deleteStoredSession(sessionId: string): Promise<void> {
  getDb().prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}

/** Invalide toutes les sessions d’un utilisateur (ex. changement de mot de passe). */
export async function deleteAllStoredSessionsForUser(userId: string): Promise<void> {
  getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

/** Révoque une session précise si elle appartient à l’utilisateur. */
export async function deleteStoredSessionForUser(
  sessionId: string,
  userId: string
): Promise<boolean> {
  const result = getDb()
    .prepare("DELETE FROM sessions WHERE id = ? AND user_id = ?")
    .run(sessionId, userId);
  return result.changes > 0;
}

/** Révoque toutes les sessions sauf celle en cours. */
export async function deleteOtherStoredSessionsForUser(
  userId: string,
  keepSessionId: string
): Promise<number> {
  const result = getDb()
    .prepare("DELETE FROM sessions WHERE user_id = ? AND id != ?")
    .run(userId, keepSessionId);
  return result.changes;
}

/**
 * Vérifie que la session existe encore côté serveur et correspond au jeton.
 */
export function isStoredSessionValid(
  sessionId: string,
  userId: string,
  exp: number
): boolean {
  const row = getDb()
    .prepare(
      `SELECT id, user_id, exp, created_at, last_seen_at, user_agent
       FROM sessions WHERE id = ?`
    )
    .get(sessionId) as Record<string, unknown> | undefined;
  if (!row) return false;
  const session = rowToSession(row);
  if (session.userId !== userId) return false;
  if (session.exp !== exp) return false;
  if (session.exp <= nowSeconds()) return false;
  return true;
}

export function touchStoredSession(sessionId: string, userId: string): void {
  getDb()
    .prepare(
      "UPDATE sessions SET last_seen_at = ? WHERE id = ? AND user_id = ? AND exp > ?"
    )
    .run(nowSeconds(), sessionId, userId, nowSeconds());
}

export function extendStoredSessionExp(
  sessionId: string,
  userId: string,
  currentExp: number,
  newExp: number
): boolean {
  const result = getDb()
    .prepare(
      `UPDATE sessions
       SET exp = ?, last_seen_at = ?
       WHERE id = ? AND user_id = ? AND exp = ? AND exp > ?`
    )
    .run(newExp, nowSeconds(), sessionId, userId, currentExp, nowSeconds());
  return result.changes > 0;
}

export function listStoredSessionsForUser(
  userId: string
): StoredSessionSummary[] {
  const now = nowSeconds();
  const rows = getDb()
    .prepare(
      `SELECT id, exp, created_at, last_seen_at, user_agent
       FROM sessions
       WHERE user_id = ? AND exp > ?
       ORDER BY last_seen_at DESC, created_at DESC`
    )
    .all(userId, now) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: String(row.id),
    createdAt: Number(row.created_at ?? 0),
    lastSeenAt: Number(row.last_seen_at ?? 0),
    userAgent: String(row.user_agent ?? ""),
    expiresAt: Number(row.exp),
  }));
}

/** Conserve au plus MAX_SESSIONS_PER_USER sessions actives (supprime les plus anciennes). */
export async function enforceMaxSessionsForUser(userId: string): Promise<void> {
  const now = nowSeconds();
  const rows = getDb()
    .prepare(
      `SELECT id FROM sessions
       WHERE user_id = ? AND exp > ?
       ORDER BY last_seen_at DESC, created_at DESC`
    )
    .all(userId, now) as { id: string }[];

  if (rows.length <= MAX_SESSIONS_PER_USER) return;

  const toRemove = rows.slice(MAX_SESSIONS_PER_USER);
  const db = getDb();
  runInTransaction(db, () => {
    const del = db.prepare("DELETE FROM sessions WHERE id = ? AND user_id = ?");
    for (const row of toRemove) {
      del.run(row.id, userId);
    }
  });
}
