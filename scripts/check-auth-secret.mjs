#!/usr/bin/env node
/**
 * Vérifie AUTH_SECRET (CI / déploiement).
 * 32 caractères minimum, comme getAuthSecret().
 */
const secret = process.env.AUTH_SECRET?.trim();
const requireSecret =
  process.env.CI === "true" || process.env.NODE_ENV === "production";

if (!secret) {
  if (requireSecret) {
    console.error(
      "AUTH_SECRET doit être défini (CI ou production). Générer : openssl rand -hex 32"
    );
    process.exit(1);
  }
  process.exit(0);
}

if (secret.length < 32) {
  console.error(
    "AUTH_SECRET doit contenir au moins 32 caractères (openssl rand -hex 32)."
  );
  process.exit(1);
}
