/**
 * HobbyHoops Service Worker
 *
 * Strategy:
 *  - Navigation requests  → network-first, inline HTML fallback when offline
 *  - /_next/static/**     → cache-first (immutable versioned assets)
 *  - /icons/**, /brand/** → stale-while-revalidate
 *  - /api/**              → network-only (never cache)
 */

const CACHE = "hobbyhoops-v1";

const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0a0a0a">
<title>HobbyHoops – Hors ligne</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:#0a0a0a;color:#fafafa;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:2rem;text-align:center}
svg{margin-bottom:1.5rem;opacity:.6}
h1{font-size:1.25rem;font-weight:600;margin-bottom:.5rem}
p{color:#888;font-size:.9rem;line-height:1.6;max-width:28ch}
button{margin-top:1.5rem;padding:.5rem 1.25rem;border-radius:.5rem;border:1px solid #333;background:transparent;color:#fafafa;font-size:.875rem;cursor:pointer}
button:hover{background:#1a1a1a}
</style>
</head>
<body>
<div>
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M8.56 2.9A7 7 0 0 1 19 9v4"/>
    <path d="M19 13a7 7 0 1 1-13.96-1.77"/>
    <circle cx="12" cy="13" r="3"/>
    <line x1="12" y1="5" x2="12" y2="2"/>
    <line x1="5" y1="13" x2="2" y2="13"/>
  </svg>
  <h1>Vous êtes hors ligne</h1>
  <p>Connectez-vous à internet pour accéder à HobbyHoops.</p>
  <button onclick="location.reload()">Réessayer</button>
</div>
</body>
</html>`;

// ─── Message (skip-waiting on update) ────────────────────────────────────────

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(["/icons/icon-192x192.png", "/icons/icon-512x512.png"])
    )
  );
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API → network-only
  if (url.pathname.startsWith("/api/")) return;

  // Versioned static bundles → cache-first (immutable hashes)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((res) => {
            caches.open(CACHE).then((c) => c.put(request, res.clone()));
            return res;
          })
      )
    );
    return;
  }

  // Public assets (icons, brand images) → stale-while-revalidate
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/brand/")
  ) {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(request).then((hit) => {
          const fresh = fetch(request).then((res) => {
            cache.put(request, res.clone());
            return res;
          });
          return hit ?? fresh;
        })
      )
    );
    return;
  }

  // Navigation → network-first, inline offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(OFFLINE_HTML, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          })
      )
    );
  }
});
