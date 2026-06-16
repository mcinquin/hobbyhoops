#!/usr/bin/env node
import { getLogger } from "./lib/logger.mjs";

const log = getLogger("check-node");
const [major] = process.versions.node.split(".").map(Number);

if (major !== 24) {
  log.error({
    msg: "Node.js non supporté pour HobbyHoops",
    nodeVersion: process.versions.node,
    requiredMajor: 24,
  });
  process.exit(1);
}
