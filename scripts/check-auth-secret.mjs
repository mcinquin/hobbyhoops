#!/usr/bin/env node
/**
 * Vérifie AUTH_SECRET (CI / déploiement).
 * 32 caractères minimum, comme getAuthSecret().
 */
import { getLogger } from "./lib/logger.mjs";

const log = getLogger("check-auth-secret");
const secret = process.env.AUTH_SECRET?.trim();
const requireSecret =
  process.env.CI === "true" || process.env.NODE_ENV === "production";

if (!secret) {
  if (requireSecret) {
    log.error({
      msg: "AUTH_SECRET doit être défini (CI ou production)",
      hint: "openssl rand -hex 32",
    });
    process.exit(1);
  }
  process.exit(0);
}

if (secret.length < 32) {
  log.error({
    msg: "AUTH_SECRET trop court",
    minLength: 32,
    hint: "openssl rand -hex 32",
  });
  process.exit(1);
}
