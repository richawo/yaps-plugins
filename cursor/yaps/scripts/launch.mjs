#!/usr/bin/env node

// Thin Cursor host launcher. Sets plugin identity env, then loads the
// existing mcpb/yaps MCP server. No new tools. No new protocol.
// Leave YAPS_CLI_BINARY unset so discovery finds the installed app (CASE2).

import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

if (!process.env.YAPS_PLUGIN_HOST) process.env.YAPS_PLUGIN_HOST = "cursor";
if (!process.env.YAPS_PLUGIN_ID) process.env.YAPS_PLUGIN_ID = "yaps";
if (!process.env.YAPS_PLUGIN_VERSION) process.env.YAPS_PLUGIN_VERSION = "0.1.0";
if (!process.env.YAPS_PLUGIN_TRANSPORT) process.env.YAPS_PLUGIN_TRANSPORT = "mcp";

const existingServer = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "mcpb",
  "yaps",
  "server",
  "index.mjs",
);

await import(pathToFileURL(existingServer).href);
