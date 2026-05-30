import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8")
).version;

if (!/^\d+\.\d+\.\d+/.test(version)) {
  console.error(`sync-release-examples: invalid semver in package.json: ${version}`);
  process.exit(1);
}

const exportPattern = /export HOBBYHOOPS_VERSION=\d+\.\d+\.\d+/g;
const composeDefaultPattern = /HOBBYHOOPS_VERSION:-\d+\.\d+\.\d+/g;
const readmeExamplePattern = /\(e\.g\. `\d+\.\d+\.\d+`\)/g;

function syncDockerCompose(content) {
  return content
    .replace(exportPattern, `export HOBBYHOOPS_VERSION=${version}`)
    .replace(composeDefaultPattern, `HOBBYHOOPS_VERSION:-${version}`);
}

function syncReadme(content) {
  return content
    .replace(readmeExamplePattern, `(e.g. \`${version}\`)`)
    .replace(exportPattern, `export HOBBYHOOPS_VERSION=${version}`);
}

const targets = [
  { file: "docker-compose.yml", sync: syncDockerCompose },
  { file: "README.md", sync: syncReadme },
];

for (const { file, sync } of targets) {
  const absPath = path.join(root, file);
  const before = fs.readFileSync(absPath, "utf8");
  const after = sync(before);

  if (!after.includes(version)) {
    console.error(
      `sync-release-examples: ${file} does not contain version ${version} after sync`
    );
    process.exit(1);
  }

  if (before !== after) {
    fs.writeFileSync(absPath, after);
    console.log(`sync-release-examples: updated ${file} → ${version}`);
  }
}
