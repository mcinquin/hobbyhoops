#!/usr/bin/env node
/**
 * Vérifie AUTH_SECRET si défini (CI / déploiement).
 * 32 caractères minimum, comme getAuthSecret().
 */
const secret = process.env.AUTH_SECRET?.trim();
if (!secret) {
  process.exit(0);
}

if (secret.length < 32) {
  console.error(
    "AUTH_SECRET doit contenir au moins 32 caractères (openssl rand -hex 32)."
  );
  process.exit(1);
}
