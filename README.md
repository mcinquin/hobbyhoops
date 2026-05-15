# HobbyHoops

Application Next.js pour gérer une collection de cartes NBA : collection, fiches joueurs, administration des références et persistance SQLite.

## Prérequis

- Node.js 22.5 ou plus récent (24 recommandé, voir `.nvmrc`)
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
npm run ci         # même suite que la job GitHub « quality » (recommandé avant push)
npm run check      # alias de npm run ci
npm run lint
npm run typecheck
npm run build
npm start
npm run clean      # supprime .next, caches TypeScript, etc.
```

## Données

Tout est stocké dans **`data/hobbyhoops.db`** (SQLite) : collection, références, comptes et sessions. Ce fichier et ses journaux WAL sont **locaux** et ne doivent **jamais** être commités.

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

Image CI (après push sur `main`) : `ghcr.io/mcinquin/hobbyhoops:latest`

## CI GitHub Actions

Le workflow `.github/workflows/ci.yml` exécute sur chaque push et pull request vers `main` ou `master` :

- `npm ci` puis `npm run ci` (Node, ESLint, TypeScript, audit npm high+)
- build de l’image Docker (job séparé, après la qualité)
- push vers `ghcr.io/<organisation>/hobbyhoops` sur les pushes vers `main` ou `master`

En local, lancez la même commande avant de pousser : `npm run ci`.

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

- **`npm run ci`** : contrôles identiques à la CI (lint, typecheck, audit)
- **Husky** : `pre-commit` (ESLint sur les fichiers stagés), `pre-push` (`npm run ci`), `commit-msg` (commitlint conventional)
- **Dependabot** : mises à jour hebdomadaires npm et GitHub Actions
