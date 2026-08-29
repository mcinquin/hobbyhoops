const { execFileSync } = require("node:child_process");
const path = require("node:path");

const COMMIT_HASH_LENGTH = 7;
const DEPENDENCY_SECTION = "Dependencies";

/** Un commit de mise à jour de dépendances (chore/build sur deps|deps-dev). */
function isDependencyCommit(commit) {
  const isDepsScope = commit.scope === "deps" || commit.scope === "deps-dev";
  return isDepsScope && (commit.type === "build" || commit.type === "chore");
}

// Transform basé sur le préset `conventional-changelog-angular`, étendu pour
// regrouper les commits de dépendances dans une section « Dependencies » (qui
// serait sinon masquée). Le reste du comportement (liens, hash court, notes de
// breaking changes) est conservé à l'identique.
//
// Pourquoi un transform maison plutôt que le préset `conventionalcommits`
// (qui supporte nativement des sections par type/scope) :
//   - `@semantic-release/release-notes-generator@14` (dernière version, tout
//     comme `semantic-release@25`) est câblé sur `conventional-changelog-writer@8`.
//   - Le préset `conventional-changelog-conventionalcommits@10` présent dans
//     l'arbre (tiré par `@commitlint/config-conventional`, PAS par
//     semantic-release) cible l'API du writer@9 → notes entièrement VIDES.
//   - Aligner les versions est impossible sans casse : commitlint exige
//     conventionalcommits@10, le notes-generator exigerait @8 ; un override npm
//     global casserait l'un ou l'autre, et aucune release semantic-release
//     n'utilise encore writer@9.
// À migrer vers `preset: "conventionalcommits"` + `presetConfig.types` le jour
// où un release-notes-generator basé sur writer@9 sera publié.
function transformCommit(commit, context) {
  let discard = true;
  const notes = commit.notes.map((note) => {
    discard = false;
    return { ...note, title: "BREAKING CHANGES" };
  });

  let { type } = commit;

  if (isDependencyCommit(commit)) {
    type = DEPENDENCY_SECTION;
  } else if (commit.type === "feat") {
    type = "Features";
  } else if (commit.type === "fix") {
    type = "Bug Fixes";
  } else if (commit.type === "perf") {
    type = "Performance Improvements";
  } else if (commit.type === "revert" || commit.revert) {
    type = "Reverts";
  } else if (discard) {
    return undefined;
  } else if (commit.type === "docs") {
    type = "Documentation";
  } else if (commit.type === "style") {
    type = "Styles";
  } else if (commit.type === "refactor") {
    type = "Code Refactoring";
  } else if (commit.type === "test") {
    type = "Tests";
  } else if (commit.type === "build") {
    type = "Build System";
  } else if (commit.type === "ci") {
    type = "Continuous Integration";
  }

  const scope = commit.scope === "*" ? "" : commit.scope;
  const shortHash =
    typeof commit.hash === "string"
      ? commit.hash.substring(0, COMMIT_HASH_LENGTH)
      : commit.shortHash;
  const issues = [];
  let { subject } = commit;

  if (typeof subject === "string") {
    let url = context.repository
      ? `${context.host}/${context.owner}/${context.repository}`
      : context.repoUrl;

    if (url) {
      url = `${url}/issues/`;
      subject = subject.replace(/#([0-9]+)/g, (_, issue) => {
        issues.push(issue);
        return `[#${issue}](${url}${issue})`;
      });
    }

    if (context.host) {
      subject = subject.replace(
        /`[^`]*`|\B@([a-z0-9](?:-?[a-z0-9/]){0,38})/g,
        (match, username) => {
          if (!username) return match;
          if (username.includes("/")) return `@${username}`;
          return `[@${username}](${context.host}/${username})`;
        }
      );
    }
  }

  const references = commit.references.filter(
    (reference) => !issues.includes(reference.issue)
  );

  return { notes, type, scope, shortHash, subject, references };
}

/** @type {import('semantic-release').GlobalConfig} */
module.exports = {
  branches: ["main"],
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        // Les mises à jour de dépendances déclenchent une minor, que ce soit via
        // chore(deps) ou via les commits Dependabot build(deps)/build(deps-dev).
        // Les règles personnalisées sont évaluées avant les règles par défaut
        // (feat → minor, fix → patch).
        releaseRules: [
          { type: "chore", scope: "deps", release: "minor" },
          { type: "build", scope: "deps", release: "minor" },
          { type: "build", scope: "deps-dev", release: "minor" },
        ],
      },
    ],
    [
      "@semantic-release/release-notes-generator",
      {
        // Préset angular par défaut, avec un transform étendu pour la section
        // « Dependencies ». (Le préset conventionalcommits n'est pas compatible
        // avec la version de conventional-changelog-writer utilisée ici.)
        writerOpts: { transform: transformCommit },
      },
    ],
    [
      "@semantic-release/changelog",
      {
        changelogFile: "CHANGELOG.md",
      },
    ],
    [
      "@semantic-release/npm",
      {
        npmPublish: false,
      },
    ],
    {
      prepare() {
        execFileSync(
          process.execPath,
          [path.join(__dirname, "scripts/sync-release-examples.mjs")],
          { stdio: "inherit" }
        );
      },
    },
    [
      "@semantic-release/git",
      {
        assets: [
          "CHANGELOG.md",
          "package.json",
          "package-lock.json",
          "docker-compose.yml",
          "README.md",
        ],
        message:
          "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
      },
    ],
    "@semantic-release/github",
  ],
};
