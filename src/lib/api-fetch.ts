export const API_FETCH_OPTS = {
  credentials: "include" as const,
  cache: "no-store" as const,
};

export async function parseApiErrorMessage(
  res: Response,
  fallback: string
): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return typeof data.error === "string" ? data.error : fallback;
}
