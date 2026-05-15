import { getDb } from "./db";
import { runInTransaction } from "./sqlite";

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
}

function rowToUser(row: Record<string, unknown>): UserRecord {
  return {
    id: String(row.id),
    username: String(row.username),
    passwordHash: String(row.password_hash),
  };
}

export function getUsers(): UserRecord[] {
  const rows = getDb()
    .prepare("SELECT id, username, password_hash FROM users ORDER BY username")
    .all() as Record<string, unknown>[];
  return rows.map(rowToUser);
}

export async function saveUsers(users: UserRecord[]): Promise<void> {
  const db = getDb();
  runInTransaction(db, () => {
    db.prepare("DELETE FROM users").run();
    const insert = db.prepare(
      "INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)"
    );
    for (const user of users) {
      insert.run(user.id, user.username, user.passwordHash);
    }
  });
}

export async function bootstrapFirstUser(
  user: UserRecord
): Promise<"created" | "exists"> {
  const db = getDb();
  let created = false;
  runInTransaction(db, () => {
    const count = (
      db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number }
    ).count;
    if (count > 0) return;
    db.prepare(
      "INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)"
    ).run(user.id, user.username, user.passwordHash);
    created = true;
  });
  return created ? "created" : "exists";
}

export function findUserByUsername(username: string): UserRecord | undefined {
  const row = getDb()
    .prepare(
      "SELECT id, username, password_hash FROM users WHERE username = ? COLLATE NOCASE"
    )
    .get(username) as Record<string, unknown> | undefined;
  return row ? rowToUser(row) : undefined;
}

export function findUserById(id: string): UserRecord | undefined {
  const row = getDb()
    .prepare("SELECT id, username, password_hash FROM users WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToUser(row) : undefined;
}

export function isUsernameTaken(username: string, exceptUserId?: string): boolean {
  const row = getDb()
    .prepare(
      "SELECT id FROM users WHERE username = ? COLLATE NOCASE LIMIT 1"
    )
    .get(username) as { id: string } | undefined;
  if (!row) return false;
  return !exceptUserId || row.id !== exceptUserId;
}
