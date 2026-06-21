/** Libellé court pour l’UI à partir du User-Agent. */
export function summarizeUserAgent(userAgent: string | null | undefined): string {
  const ua = userAgent?.trim();
  if (!ua) return "unknown";

  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Windows/i.test(ua)) return "windows";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macos";
  if (/Linux/i.test(ua)) return "linux";

  return "browser";
}

export function readRequestUserAgent(
  request: Pick<Request, "headers">
): string | null {
  return request.headers.get("user-agent");
}
