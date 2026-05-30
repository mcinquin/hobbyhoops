/** Échappe un token pour une requête FTS5 entre guillemets. */
function escapeFtsToken(token: string): string {
  const sanitized = token.replace(/["'*]/g, "");
  if (!sanitized) return '""';
  return `"${sanitized.replace(/"/g, '""')}"`;
}

/**
 * Construit une requête FTS5 MATCH à partir de la recherche utilisateur.
 * Chaque mot est en préfixe (AND) — adapté aux noms de joueurs, sets, etc.
 */
export function buildFtsMatchQuery(search: string): string | null {
  const tokens = search
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0);
  if (tokens.length === 0) return null;

  return tokens.map((token) => `${escapeFtsToken(token)}*`).join(" AND ");
}
