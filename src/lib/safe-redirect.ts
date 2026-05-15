/**
 * Valide une URL de redirection interne (paramètre `from` après login).
 * Évite les redirections ouvertes du type `?from=//evil.com`.
 */
export function safeInternalRedirectPath(from: string | null | undefined): string {
  if (!from || typeof from !== "string") return "/";
  const trimmed = from.trim();
  if (!trimmed.startsWith("/")) return "/";
  try {
    const base = "https://hobbyhoops.invalid";
    const u = new URL(trimmed, base);
    if (u.origin !== base) return "/";
    const out = u.pathname + u.search + u.hash;
    if (out.length > 2048) return "/";
    return out || "/";
  } catch {
    return "/";
  }
}
