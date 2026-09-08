#!/usr/bin/env node
import { startMemory } from "./memory-runtime.mjs";

process.env.YAPS_PLUGIN_HOST ||= "cursor";
process.env.YAPS_PLUGIN_ID ||= "yaps";
process.env.YAPS_PLUGIN_VERSION ||= "0.2.0";
process.env.YAPS_PLUGIN_TRANSPORT ||= "mcp";

try { await startMemory(); }
catch (error) {
  process.stderr.write(`${error.exitCode ? error.message : "The Yaps private-vault connector could not initialize. Open Yaps and retry locally."}\n`);
  process.exitCode = error.exitCode || 1;
}
