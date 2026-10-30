/**
 * Sync GitHub labels from `.github/labels.yml` (create or update).
 * Requires `gh` authenticated against the current repo remote.
 *
 * Usage: node scripts/sync-github-labels.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { getLogger } from "./lib/logger.mjs";

const log = getLogger("sync-github-labels");
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const labelsPath = path.join(root, ".github", "labels.yml");

/**
 * Minimal YAML list parser for `{ name, color, description }` entries.
 * @param {string} source
 * @returns {{ name: string, color: string, description: string }[]}
 */
function parseLabelsYaml(source) {
  /** @type {{ name: string, color: string, description: string }[]} */
  const labels = [];
  /** @type {{ name?: string, color?: string, description?: string } | null} */
  let current = null;

  const flush = () => {
    if (!current) return;
    if (!current.name || !current.color || current.description === undefined) {
      throw new Error(
        `Label incomplet: ${JSON.stringify(current)} (name, color, description requis)`
      );
    }
    labels.push({
      name: current.name,
      color: current.color.replace(/^#/, ""),
      description: current.description,
    });
    current = null;
  };

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+#.*$/, "").trimEnd();
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const itemMatch = trimmed.match(/^- name:\s*(.+)$/);
    if (itemMatch) {
      flush();
      current = { name: unquote(itemMatch[1].trim()) };
      continue;
    }

    if (!current) {
      throw new Error(`Ligne hors entrée label: ${trimmed}`);
    }

    const fieldMatch = trimmed.match(/^(color|description):\s*(.*)$/);
    if (!fieldMatch) {
      throw new Error(`Champ inconnu: ${trimmed}`);
    }
    current[/** @type {'color'|'description'} */ (fieldMatch[1])] = unquote(
      fieldMatch[2].trim()
    );
  }

  flush();
  return labels;
}

/** @param {string} value */
function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function requireGh() {
  const version = spawnSync("gh", ["--version"], { encoding: "utf8" });
  if (version.status !== 0) {
    log.error({ msg: "gh CLI introuvable — installez GitHub CLI" });
    process.exit(1);
  }
}

/**
 * @param {string[]} args
 * @returns {{ status: number | null, stdout: string, stderr: string }}
 */
function runGh(args) {
  const result = spawnSync("gh", args, { encoding: "utf8" });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

const source = fs.readFileSync(labelsPath, "utf8");
const labels = parseLabelsYaml(source);

if (labels.length === 0) {
  log.error({ msg: "Aucun label dans .github/labels.yml" });
  process.exit(1);
}

requireGh();

let synced = 0;
let failed = 0;

for (const label of labels) {
  const result = runGh([
    "label",
    "create",
    label.name,
    "--color",
    label.color,
    "--description",
    label.description,
    "--force",
  ]);

  if (result.status === 0) {
    synced += 1;
    log.info({ msg: "Label synchronisé", name: label.name, color: label.color });
    continue;
  }

  failed += 1;
  log.error({
    msg: "Échec sync label",
    name: label.name,
    stderr: result.stderr.trim() || result.stdout.trim(),
  });
}

if (failed > 0) {
  log.error({ msg: "Sync terminée avec erreurs", ok: synced, failed });
  process.exit(1);
}

log.info({ msg: "Labels GitHub synchronisés", count: synced });
