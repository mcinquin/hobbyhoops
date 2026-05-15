# Sécurité

## Signaler une vulnérabilité

N’ouvrez pas d’issue publique pour un problème de sécurité. Contactez le mainteneur du dépôt en privé (GitHub Security Advisories ou message direct).

## Bonnes pratiques de déploiement

- Définir `AUTH_SECRET` avec au moins 16 caractères aléatoires (`openssl rand -hex 32`).
- Ne jamais committer `.env`, `data/users.json`, `data/sessions.json` ni `data/hobbyhoops.db`.
- Exposer l’application derrière un reverse proxy HTTPS ; laisser `COOKIE_SECURE` par défaut ou forcer `true`.
- Limiter l’accès réseau au conteneur (port bindé sur `127.0.0.1` dans `docker-compose.yml`).
- Après le bootstrap initial, l’endpoint `/api/auth/bootstrap` renvoie 403 si un compte existe déjà.

## Modèle d’accès

Tout utilisateur authentifié peut accéder à `/admin` et aux API de modification. Ce modèle convient à une instance personnelle ou familiale ; pour un déploiement multi-utilisateurs avec rôles, une évolution du schéma utilisateurs serait nécessaire.

## Limitations connues

- Limite de débit en mémoire (par processus) : insuffisante en déploiement multi-réplicas sans store partagé.
- CSP stricte avec nonces (`src/proxy.ts`) : en développement seulement, `'unsafe-eval'` (React DevTools) et `'unsafe-inline'` pour les styles ; absent en production.
- Langues : français (défaut) et anglais (US), cookie `hh_locale`, commutation via la barre latérale ou l’écran de connexion.
