import { rmSync } from "node:fs";
import { getLogger } from "./lib/logger.mjs";

const log = getLogger("clean");
const paths = [".next", "out", "build", "coverage", "tsconfig.tsbuildinfo"];

for (const path of paths) {
  rmSync(path, { recursive: true, force: true });
  log.info({ msg: "Répertoire supprimé", path });
}
