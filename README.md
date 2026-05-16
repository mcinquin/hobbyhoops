# HobbyHoops

Application Next.js pour gérer une collection de cartes NBA : collection, fiches joueurs, administration des références et persistance SQLite.

## Prérequis

- Node.js 24 (voir `.nvmrc`)
- npm

## Démarrage local

```bash
cp .env.example .env.local
# Renseigner AUTH_SECRET dans .env.local (openssl rand -hex 32)
npm ci
npm run dev
```

L’application est disponible sur [http://localhost:3000](http://localhost:3000).

Au premier lancement, créez le compte administrateur via l’écran de connexion (bootstrap).

## Langues

Français (par défaut) et anglais (US). Le choix est mémorisé dans le cookie `hh_locale` et modifiable depuis la barre latérale ou l’écran de connexion.

Fichiers de traduction : `messages/fr.json`, `messages/en.json`.

## Scripts utiles

```bash
npm run ci         # contrôles locaux rapides (recommandé avant push)
npm run ci:full    # lint + typecheck + audit npm high+ (utilisé par GitHub Actions)
npm run check      # alias de npm run ci
npm run lint
npm run typecheck
npm run build
npm start
npm run clean      # supprime .next, caches TypeScript, etc.
```

## Données

Tout est stocké dans **`data/hobbyhoops.db`** (SQLite via `better-sqlite3`) : collection, références, comptes, sessions et rate limiting. Ce fichier et ses journaux WAL sont **locaux** et ne doivent **jamais** être commités.

Au premier lancement, la base est créée vide ; créez le compte administrateur via l’écran de connexion.

## Déploiement Docker

L’image Docker démarre avec une **collection vide** : seul un répertoire `data/` inscriptible est nécessaire (la base SQLite y est créée automatiquement).

```bash
cp .env.example .env
# Définir AUTH_SECRET dans .env
mkdir -p data && sudo chown -R 1111:1111 data
docker compose up --build -d
```

L’application écoute sur `127.0.0.1:3000`. Les données persistent dans le dossier hôte `data/` (monté sur `/app/data`).

Le conteneur tourne sous l’utilisateur système **`hobbyhoops`** (UID/GID **1111**). Le répertoire `data/` doit être inscriptible par cet utilisateur (voir `chown` ci-dessus).

En production derrière un reverse proxy HTTPS, laisser `COOKIE_SECURE` à sa valeur par défaut ou forcez `COOKIE_SECURE=true`.
Si le proxy réécrit strictement `X-Forwarded-For` / `X-Real-IP`, activez `TRUST_PROXY=true` pour appliquer le rate limit par IP réelle. Sinon, laissez la valeur par défaut afin d’éviter les en-têtes spoofés.

Image de production (après chaque release semantic-release) : `ghcr.io/<organisation>/hobbyhoops:latest`, `ghcr.io/<organisation>/hobbyhoops:1.2.0`, etc.

## CI GitHub Actions

Le workflow `.github/workflows/ci.yml` exécute sur chaque push et pull request vers `main` ou `master` :

- `npm ci` puis `npm run ci:full` (Node, ESLint, TypeScript, audit npm high+)
- build de l’image Docker (validation sur `main`, push d’images de test sur les PR)
- sur **push vers `main` uniquement** : **semantic-release** (tag Git `vX.Y.Z`, release GitHub, `CHANGELOG.md`, bump de `package.json`)
- à chaque **GitHub Release publiée** : workflow `release-docker.yml` pousse `ghcr.io/<organisation>/hobbyhoops:X.Y.Z` et `:latest` (aligné sur le tag semantic-release)

En local, lancez `npm run ci` avant de pousser. L’audit réseau complet reste disponible avec `npm run ci:full`.

### Versions (semantic-release)

Config : `release.config.cjs`. Les releases sont créées automatiquement après une CI réussie sur `main`, à partir des commits [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `refactor:`, etc.).

- Fusionnez les PR en **squash** avec un titre conventionnel (ex. `feat: ajout du filtre collection`), ou poussez des commits conventionnels directement sur `main`.
- Les merges du type `Merge pull request #12` ne déclenchent pas de version à eux seuls.
- Dans les réglages du dépôt GitHub : **Settings → Actions → General → Workflow permissions** → *Read and write permissions* (requis pour que semantic-release pousse le tag et le commit de release).
- L’image Docker `:latest` et `:X.Y.Z` correspondent au commit du tag Git `vX.Y.Z` créé par semantic-release (pas au SHA intermédiaire du push).

## Pousser sur GitHub

Vérifier qu’aucun secret ni donnée locale ne sera versionné :

```bash
git status
git check-ignore -v data/hobbyhoops.db .env.local
```

Puis commit et push :

```bash
npm run ci
git add .
git commit -m "feat: application HobbyHoops"
git push origin main
```

Ne poussez jamais `.env`, `.env.local`, les comptes locaux ni la base SQLite de développement. Voir [SECURITY.md](SECURITY.md).

## Qualité du code

- **`npm run ci`** : contrôles locaux sans dépendance réseau (Node, lint, typecheck)
- **`npm run ci:full`** : contrôles GitHub Actions avec audit npm high+
- **Husky** : `pre-commit` (ESLint sur les fichiers stagés), `pre-push` (`npm run ci`), `commit-msg` (commitlint conventional)
- **Dependabot** : mises à jour hebdomadaires npm et GitHub Actions
