import { rmSync } from "node:fs";
import { runDir } from "./support/env";

/** Removes this run's temporary data directory (database, photos, auth state). */
export default function globalTeardown(): void {
  if (process.env.E2E_KEEP_DATA === "1") return;
  rmSync(runDir(), { recursive: true, force: true });
}
