#!/usr/bin/env node
/**
 * Quality gate locale. L'audit npm réseau est réservé à `npm run ci:full`.
 */
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { getLogger } from "./lib/logger.mjs";

const log = getLogger("ci");
const includeAudit = process.argv.includes("--with-audit");

/** Types Next générés obsolètes (routes supprimées/ajoutées) font échouer `tsc`. */
function removeStaleNextBuildArtifacts() {
  if (!existsSync(".next")) return;
  rmSync(".next", { recursive: true, force: true });
  log.info({
    msg: "Nettoyage .next",
    reason: "types de routes potentiellement obsolètes",
  });
}

const steps = [
  { name: "Node.js", command: "node", args: ["scripts/check-node.mjs"] },
  { name: "AUTH_SECRET", command: "node", args: ["scripts/check-auth-secret.mjs"] },
  { name: "ESLint", command: "npm", args: ["run", "lint"] },
  { name: "Markdownlint", command: "npm", args: ["run", "lint:md"] },
  { name: "TypeScript", command: "npm", args: ["run", "typecheck"] },
  { name: "Vitest", command: "npm", args: ["run", "test"] },
];

if (includeAudit) {
  steps.push({
    name: "Audit npm (high+)",
    command: "npm",
    args: ["run", "audit:ci"],
  });
}

function runStep({ name, command, args }) {
  log.info({ msg: "Étape CI", step: name });
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) {
    log.error({ msg: "Étape CI en échec", step: name, err: result.error });
    return 1;
  }
  return result.status ?? 1;
}

removeStaleNextBuildArtifacts();

let failed = false;
for (const step of steps) {
  const code = runStep(step);
  if (code !== 0) {
    failed = true;
    break;
  }
}

if (failed) {
  log.error({ msg: "Contrôles CI échoués" });
  process.exit(1);
}

log.info({ msg: "Tous les contrôles CI sont passés" });
