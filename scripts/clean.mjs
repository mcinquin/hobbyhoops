import { rmSync } from "node:fs";

const paths = [".next", "out", "build", "coverage", "tsconfig.tsbuildinfo"];

for (const path of paths) {
  rmSync(path, { recursive: true, force: true });
  console.log(`Removed ${path}`);
}
