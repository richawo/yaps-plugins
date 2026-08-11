#!/usr/bin/env node

import { cpSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pluginsRoot = resolve(dirname(fileURLToPath(import.meta.url)));
const source = join(pluginsRoot, "shared", "yaps-cli-discovery.mjs");
const runner = join(pluginsRoot, "yaps-memory", "scripts", "yaps-plugin-runner.mjs");

for (const entry of readdirSync(pluginsRoot)) {
  const pluginRoot = join(pluginsRoot, entry);
  if (!entry.startsWith("yaps-") || !statSync(pluginRoot).isDirectory()) continue;
  cpSync(source, join(pluginRoot, "scripts", "yaps-cli-discovery.mjs"));
  const runnerDestination = join(pluginRoot, "scripts", "yaps-plugin-runner.mjs");
  if (runnerDestination !== runner) cpSync(runner, runnerDestination);
}

cpSync(
  source,
  join(pluginsRoot, "..", "extensions", "yaps-mcp", "bundle", "server", "yaps-cli-discovery.js"),
);

cpSync(
  source,
  join(pluginsRoot, "mcpb", "yaps-memory", "server", "yaps-cli-discovery.mjs"),
);

cpSync(
  source,
  join(pluginsRoot, "mcpb", "yaps", "server", "yaps-cli-discovery.mjs"),
);
