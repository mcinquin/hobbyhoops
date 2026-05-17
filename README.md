# HobbyHoops

Next.js application for managing an NBA card collection: collection browsing, player pages, reference administration, and SQLite persistence.

## Requirements

- Node.js 24 (voir `.nvmrc`)
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

## Docker Deployment

The Docker image starts with an **empty collection**: only a writable `data/` directory is required (the SQLite database is created there automatically).

```bash
cp .env.example .env
# Set AUTH_SECRET in .env
mkdir -p data && sudo chown -R 1111:1111 data
docker compose up --build -d
```

The application listens on `127.0.0.1:3000`. Data persists in the host `data/` directory (mounted at `/app/data`).

The container runs as the **`hobbyhoops`** system user (UID/GID **1111**). The `data/` directory must be writable by this user (see the `chown` command above).

In production behind an HTTPS reverse proxy, leave `COOKIE_SECURE` at its default value or force `COOKIE_SECURE=true`.
If the proxy strictly rewrites `X-Forwarded-For` / `X-Real-IP`, enable `TRUST_PROXY=true` to apply rate limiting by real client IP. Otherwise, keep the default value to avoid spoofed headers.

Production image (after each semantic-release release): `ghcr.io/<organisation>/hobbyhoops:latest`, `ghcr.io/<organisation>/hobbyhoops:1.2.0`, etc.

## CI GitHub Actions

The `.github/workflows/ci.yml` workflow runs on every push and pull request to `main` or `master`:

- `npm ci`, then `npm run ci:full` (Node, ESLint, TypeScript, npm audit high+)
- build and push the test Docker image on PRs
- on **push to `main` only**: **semantic-release** (Git tag `vX.Y.Z`, GitHub Release, `CHANGELOG.md`, `package.json` bump), then publish the versioned Docker image from the `release` job

Locally, run `npm run ci` before pushing. The full network audit remains available with `npm run ci:full`.

### Versions (semantic-release)

Config: `release.config.cjs`. Releases are created automatically after a successful CI run on `main`, based on [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `refactor:`, etc.).

- Squash-merge PRs with a conventional title (e.g. `feat: add collection filter`), or push conventional commits directly to `main`.
- Merge commits such as `Merge pull request #12` do not trigger a version by themselves.
- In the GitHub repository settings: **Settings → Actions → General → Workflow permissions** → *Read and write permissions* (required so semantic-release can push the release tag and commit).
- Docker images `:latest` and `:X.Y.Z` point to the commit of the `vX.Y.Z` Git tag created by semantic-release (not the intermediate push SHA).

## Pushing to GitHub

Check that no secret or local data will be versioned:

```bash
git status
git check-ignore -v data/hobbyhoops.db .env.local
```

Then commit and push:

```bash
npm run ci
git add .
git commit -m "feat: application HobbyHoops"
git push origin main
```

Never push `.env`, `.env.local`, local accounts, or the development SQLite database. See [SECURITY.md](SECURITY.md).

## Code Quality

- **`npm run ci`**: local checks without network dependency (Node, lint, typecheck)
- **`npm run ci:full`**: GitHub Actions checks with npm audit high+
- **Husky**: `pre-commit` (ESLint on staged files), `pre-push` (`npm run ci`), `commit-msg` (commitlint conventional)
- **Dependabot**: weekly npm and GitHub Actions updates
