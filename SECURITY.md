# Sécurité

## Signaler une vulnérabilité

N’ouvrez pas d’issue publique pour un problème de sécurité. Contactez le mainteneur du dépôt en privé (GitHub Security Advisories ou message direct).

## Bonnes pratiques de déploiement

- Définir `AUTH_SECRET` avec une valeur forte (`openssl rand -hex 32` ; **32 caractères minimum** en dev et en production).
- Ne jamais committer `.env` ni `data/hobbyhoops.db` (ni ses fichiers WAL associés).
- Exposer l’application derrière un reverse proxy HTTPS ; laisser `COOKIE_SECURE` par défaut ou forcer `true`.
- Activer `TRUST_PROXY=true` **uniquement** si le reverse proxy réécrit `X-Forwarded-For` / `X-Forwarded-Proto` (sinon les limites de débit partagent une clé unique).
- Définir `BOOTSTRAP_TOKEN` et envoyer l’en-tête `X-Bootstrap-Token` pour créer le premier compte, puis retirer ou changer le token après bootstrap.
- Limiter l’accès réseau au conteneur (port bindé sur `127.0.0.1` dans `docker-compose.yml`).
- Les en-têtes HTTP de durcissement (`HSTS`, `X-Content-Type-Options`, etc.) sont gérés par le reverse proxy.

## Modèle d’accès

Tout utilisateur authentifié peut accéder à `/admin` et aux API de modification. Ce modèle convient à une instance personnelle ou familiale ; pour un déploiement multi-utilisateurs avec rôles, une évolution du schéma utilisateurs serait nécessaire.

## Sessions et authentification

- Cookie de session : `httpOnly`, `Secure` (prod / proxy HTTPS), `SameSite=strict`.
- Une nouvelle connexion révoque les autres sessions du même utilisateur.
- `POST /api/auth/login` et `POST /api/auth/bootstrap` : protection anti-CSRF (`Origin` / `Sec-Fetch-Site`).
- Limite de débit sur login, bootstrap, découverte bootstrap, et vérification du mot de passe actuel (profil).

## Limitations connues

- Limite de débit persistée dans SQLite : suffisante pour une instance unique, à remplacer par un store partagé en déploiement multi-réplicas.
- CSP stricte avec nonces (`src/proxy.ts`) : en développement seulement, `'unsafe-eval'` (React DevTools) et `'unsafe-inline'` pour les styles ; absent en production.
- Langues : français (défaut) et anglais (US), cookie `hh_locale`, commutation via la barre latérale ou l’écran de connexion.
