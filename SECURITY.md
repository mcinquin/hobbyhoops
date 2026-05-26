# Security

## Reporting a vulnerability

Do not open a public issue for a security problem. Contact the repository maintainer privately (GitHub Security Advisories or direct message).

## Deployment best practices

- Set `AUTH_SECRET` to a strong value (`openssl rand -hex 32`; **32 characters minimum** in development and production).
- Never commit `.env` or `data/hobbyhoops.db` (or its associated WAL files).
- Expose the application behind an HTTPS reverse proxy; leave `COOKIE_SECURE` at its default or force `true`.
- Enable `TRUST_PROXY=true` **only** if the reverse proxy rewrites `X-Forwarded-For` / `X-Forwarded-Proto` (otherwise rate limits share a single key).
- Set `BOOTSTRAP_TOKEN` and send the `X-Bootstrap-Token` header to create the first account, then remove or rotate the token after bootstrap.
- Restrict network access to the container (port bound to `127.0.0.1` in `docker-compose.yml`).
- HTTP hardening headers (`HSTS`, `X-Content-Type-Options`, etc.) are handled by the reverse proxy.
- Back up `data/hobbyhoops.db` regularly on the host with `sqlite3 … ".backup '…'"` (consistent snapshot, WAL-safe). Keep at least 14 days in `data/backups/` (gitignored) and ideally an off-site copy. See [README.md](README.md) — backup scripts stay local, outside the repository.

## Access model

Every authenticated user can access `/admin` and write APIs. This model fits a personal or family instance; multi-user deployments with roles would require evolving the user schema.

## Sessions and authentication

- Session cookie: `httpOnly`, `Secure` (production / HTTPS proxy), `SameSite=strict`.
- A new login revokes other sessions for the same user.
- `POST /api/auth/login` and `POST /api/auth/bootstrap`: CSRF protection (`Origin` / `Sec-Fetch-Site`).
- All API mutations require `Origin` or `Sec-Fetch-Site` (`requireFetchMetadata`).
- Rate limiting on login, bootstrap, bootstrap discovery, current-password verification (profile), and card / reference / guide writes.
- `POST /api/auth/bootstrap` is rejected once an account exists.

## Known limitations

- Rate limits stored in SQLite: sufficient for a single instance; replace with a shared store for multi-replica deployments.
- Strict CSP with nonces (`src/proxy.ts`): in development only, `'unsafe-eval'` (React DevTools) and `'unsafe-inline'` for styles; not used in production.
- Languages: French (default) and English (US), `hh_locale` cookie, switch via the sidebar or login screen.
