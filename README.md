# HobbyHoops

Next.js application for managing an NBA card collection: collection browsing, player pages, reference administration, and SQLite persistence.

## Requirements

- Node.js 24 (see `.nvmrc`)
- npm

## Local Setup

```bash
cp .env.example .env.local
# Set AUTH_SECRET in .env.local (openssl rand -hex 32)
npm ci
npm run dev
```

The application is available at [http://localhost:3000](http://localhost:3000).

On first launch, create the administrator account from the login screen (bootstrap).

## Languages

French (default) and English (US). The selected language is stored in the `hh_locale` cookie and can be changed from the sidebar or the login screen.

Translation files: `messages/fr.json`, `messages/en.json`.

## Useful Scripts

```bash
npm run ci         # fast local checks (recommended before pushing)
npm run ci:full    # lint + typecheck + npm audit high+ (used by GitHub Actions)
npm run check      # alias for npm run ci
npm run lint
npm run typecheck
npm run build
npm start
npm run clean      # removes .next, TypeScript caches, etc.
```

## Data

Everything is stored in **`data/hobbyhoops.db`** (SQLite via `better-sqlite3`): collection, references, accounts, sessions, and rate limiting. This file and its WAL journals are **local** and must **never** be committed.

On first launch, an empty database is created; create the administrator account from the login screen.

### Backup and restore

The SQLite file is the single source of truth. The database runs in **WAL mode** (`hobbyhoops.db` plus optional `-wal` / `-shm` sidecar files). Back it up **on the host** (the production container has no `sqlite3` CLI). Keep a local script or cron on the server — it is **not** versioned in this repository.

**Backup** — use SQLite’s online backup API (consistent snapshot, safe while the app is running). Do **not** copy `hobbyhoops.db` with `cp` while the application is open; that can produce an incomplete file.

```bash
# Prerequisite: sqlite3 (apt install sqlite3)
mkdir -p data/backups
sqlite3 data/hobbyhoops.db ".backup 'data/backups/hobbyhoops-$(date +%Y-%m-%dT%H-%M-%S).db'"
# Optional: delete backups older than 14 days
find data/backups -maxdepth 1 -name 'hobbyhoops-*.db' -mtime +14 -delete
```

Daily cron example:

```bash
0 3 * * * cd /path/to/hobbyhoops && mkdir -p data/backups && sqlite3 data/hobbyhoops.db ".backup 'data/backups/hobbyhoops-$(date +\%Y-\%m-\%dT\%H-\%M-\%S).db'" && find data/backups -maxdepth 1 -name 'hobbyhoops-*.db' -mtime +14 -delete >> /var/log/hobbyhoops-backup.log 2>&1
```

**Restore** — stop the application first, replace the database file, then **delete stale WAL journals**. Skipping the last step (or restoring while the app is still running) can corrupt the database (`SQLITE_CORRUPT` / *database disk image is malformed*).

Production:

```bash
docker compose stop app
cp data/backups/hobbyhoops-YYYY-MM-DDTHH-MM-SS.db data/hobbyhoops.db
rm -f data/hobbyhoops.db-wal data/hobbyhoops.db-shm
docker compose start app
```

Local development (`npm run dev`):

```bash
# Stop the dev server (Ctrl+C), then:
cp data/backups/hobbyhoops-YYYY-MM-DDTHH-MM-SS.db data/hobbyhoops.db
rm -f data/hobbyhoops.db-wal data/hobbyhoops.db-shm
npm run dev
```

**Corruption recovery** — if the database is already corrupted after a bad restore, stop the app and run:

```bash
node scripts/recover-sqlite.mjs
```

This copies readable tables into a fresh file, rebuilds `references_state` from cards, and recreates the FTS index. The broken file is kept as `data/hobbyhoops.db.corrupt-<timestamp>`.

Backups are stored in `data/backups/` (gitignored). See [SECURITY.md](SECURITY.md).

## Import / export CSV (collection)

Export or import cards from **Admin → CSV import / export**.

- **Export** — filtered view or full collection (UTF-8 CSV, comma-separated).
- **Import** — create-only or upsert by `id` (max 5 000 rows per file).

Full format specification, column aliases (FR/EN), and Excel/Sheets workflow: [docs/csv-import-export.md](docs/csv-import-export.md).

This complements the SQLite backup (`hobbyhoops.db`): CSV is ideal for spreadsheets and portability; the database file remains the complete instance backup.

## Docker

The image starts with an **empty collection**: only a writable `data/` directory is required (the SQLite database is created there automatically). The container runs as the **`hobbyhoops`** system user (UID/GID **1111**). Mount `data/` at `/app/data` and make it writable by that user.

The application listens on **`127.0.0.1:3000`** (not exposed on all interfaces). In production, place a reverse proxy (e.g. Apache) in front of the host and proxy to that address.

Two Compose files:

| File | Usage |
| ------ | ------- |
| `docker-compose.yml` | **Production** — pinned image from GHCR, hardened runtime |
| `docker-compose.dev.yml` | **Local Docker** — build from the Dockerfile |

### Production (GHCR)

After each semantic-release run on `main`, images are published to GitHub Container Registry:

- `ghcr.io/mcinquin/hobbyhoops:latest`
- `ghcr.io/mcinquin/hobbyhoops:X.Y.Z` (e.g. `1.23.1`)

Prefer a **version tag** in production, not `latest`.

```bash
cp .env.example .env
# Required: AUTH_SECRET (openssl rand -hex 32)
mkdir -p data && sudo chown -R 1111:1111 data

export HOBBYHOOPS_VERSION=1.23.1   # tag matching your GHCR release
docker compose pull
docker compose up -d
```

`docker-compose.yml` expects a `.env` file (`required: true`). `AUTH_SECRET` must be set or Compose will fail at startup. Defaults suited to an HTTPS reverse proxy that rewrites forwarding headers:

- `TRUST_PROXY=true` (set `false` in `.env` if the proxy does not set `X-Forwarded-For` / `X-Forwarded-Proto` correctly)
- `COOKIE_SECURE=true`

Override via `.env` if needed. See [SECURITY.md](SECURITY.md).

Production-oriented options in Compose include: non-root user, `read_only` root filesystem, dropped capabilities, health check on `/api/health`, and log rotation. **No CPU/RAM cap** by default (a low `mem_limit` / `cpus` makes Next.js feel very slow). The reverse proxy stays **outside** Compose (Apache on the host).

### Local Docker (build)

To build and run the image from the repository (development or testing the Dockerfile):

```bash
cp .env.example .env
mkdir -p data && sudo chown -R 1111:1111 data
docker compose -f docker-compose.dev.yml up --build -d
```

`AUTH_SECRET` is optional here (a dev-only default is provided); still set a real value to match production behaviour.

## CI GitHub Actions

The `.github/workflows/ci.yml` workflow runs on every push and pull request to `main` or `master`:

- `npm ci`, then `npm run ci:full` (Node, ESLint, TypeScript, npm audit high+)
- build and push the test Docker image on PRs
- on **push to `main` only**: **semantic-release** (Git tag `vX.Y.Z`, GitHub Release, `CHANGELOG.md`, `package.json` bump, deploy examples in `README.md` / `docker-compose.yml`), then publish the versioned Docker image from the `release` job

Locally, run `npm run ci` before pushing. The full network audit remains available with `npm run ci:full`.

### Versions (semantic-release)

Config: `release.config.cjs`. Releases are created automatically after a successful CI run on `main`, based on [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `refactor:`, etc.).

Deploy examples (`HOBBYHOOPS_VERSION` in `README.md` and `docker-compose.yml`) are bumped in the same release commit as `package.json` via `scripts/sync-release-examples.mjs`.

- Open a PR and **squash-merge** with a conventional title (e.g. `feat: add collection filter`). Direct pushes to `main` are blocked by branch protection.
- Merge commits such as `Merge pull request #12` do not trigger a version by themselves.
- **GitHub App** `hobbyhoops-release` pushes release commits and tags (bypass ruleset). Repository secrets: `RELEASE_APP_ID`, `RELEASE_APP_PRIVATE_KEY`.
- **Settings → Actions → General → Workflow permissions** → *Read and write permissions* (Docker GHCR still uses `GITHUB_TOKEN`).
- Docker images `:latest` and `:X.Y.Z` point to the commit of the `vX.Y.Z` Git tag created by semantic-release (not the intermediate push SHA).

## Pushing to GitHub

Check that no secret or local data will be versioned:

```bash
git status
git check-ignore -v data/hobbyhoops.db .env.local
```

Then commit, push a branch, and open a PR toward `main`:

```bash
npm run ci
git checkout -b feat/my-change
git add .
git commit -m "feat: application HobbyHoops"
git push -u origin feat/my-change
```

Merge the PR on GitHub (squash-merge with a conventional title). semantic-release runs on the resulting push to `main`.

Never push `.env`, `.env.local`, local accounts, or the development SQLite database. See [SECURITY.md](SECURITY.md).

## Code Quality

- **`npm run ci`**: local checks without network dependency (Node, lint, typecheck, tests)
- **`npm run test`**: Vitest unit tests (auth, CSRF, collection query, card CRUD)
- **`npm run ci:full`**: GitHub Actions checks with npm audit high+
- **Husky**: `pre-commit` (ESLint on staged files), `pre-push` (`npm run ci`), `commit-msg` (commitlint conventional)
- **Dependabot**: weekly npm and GitHub Actions updates
