import { getDb } from "./db";
import { runInTransaction } from "./sqlite";

/** Session côté serveur (révocable), alignée sur le champ `exp` du jeton signé. */
export interface StoredSession {
  id: string;
  userId: string;
  /** Unix seconds (identique à `exp` dans le cookie JWT-like) */
  exp: number;
}

function rowToSession(row: Record<string, unknown>): StoredSession {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    exp: Number(row.exp),
  };
}

function pruneExpiredSessions(): void {
  const now = Math.floor(Date.now() / 1000);
  getDb().prepare("DELETE FROM sessions WHERE exp <= ?").run(now);
}

/** Enregistre une nouvelle session (après login / bootstrap / rotation). */
export async function createStoredSession(session: StoredSession): Promise<void> {
  const db = getDb();
  runInTransaction(db, () => {
    pruneExpiredSessions();
    db.prepare("DELETE FROM sessions WHERE id = ?").run(session.id);
    db.prepare("INSERT INTO sessions (id, user_id, exp) VALUES (?, ?, ?)").run(
      session.id,
      session.userId,
      session.exp
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

/**
 * Vérifie que la session existe encore côté serveur et correspond au jeton.
 */
export function isStoredSessionValid(
  sessionId: string,
  userId: string,
  exp: number
): boolean {
  const row = getDb()
    .prepare("SELECT id, user_id, exp FROM sessions WHERE id = ?")
    .get(sessionId) as Record<string, unknown> | undefined;
  if (!row) return false;
  const session = rowToSession(row);
  if (session.userId !== userId) return false;
  if (session.exp !== exp) return false;
  const now = Math.floor(Date.now() / 1000);
  if (session.exp <= now) return false;
  return true;
}
