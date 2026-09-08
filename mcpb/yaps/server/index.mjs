#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { YapsToolError, failure } from "./yaps-runtime.mjs";
import { buildToolRegistry } from "./tool-profiles.mjs";
import * as status from "./tools/status.mjs";
import * as dictation from "./tools/dictation.mjs";
import * as transcription from "./tools/transcription.mjs";
import * as captions from "./tools/captions.mjs";
import * as media from "./tools/media.mjs";
import * as speech from "./tools/speech.mjs";
import * as translation from "./tools/translation.mjs";
import * as meeting from "./tools/meeting.mjs";
import * as cut from "./tools/cut.mjs";

const VERSION = process.env.YAPS_PLUGIN_VERSION || "0.1.0";

// The host substitutes user_config values into env before launch. An unset
// optional file field can arrive as an empty string (or, defensively, as an
// unexpanded template) — treat both as "no override" so CLI discovery falls
// through to the installed Yaps app instead of hard-failing on an
// authoritative-but-empty override.
const cliOverride = process.env.YAPS_CLI_BINARY;
if (typeof cliOverride === "string" && (!cliOverride.trim() || cliOverride.includes("${"))) {
  delete process.env.YAPS_CLI_BINARY;
}

const MODULES = [status, dictation, transcription, captions, media, speech, translation, meeting, cut];

const { tools: TOOLS, handlers: HANDLERS } = buildToolRegistry(MODULES, process.env.YAPS_TOOL_PROFILE || "");

const server = new Server(
  { name: process.env.YAPS_PLUGIN_ID || "yaps", title: "Yaps", version: VERSION },
  {
    capabilities: { tools: {} },
    instructions:
      "Yaps runs transcription, meeting notes, captions, subtitles, voice synthesis, translation, and media tools locally through the installed Yaps desktop app. Nothing is uploaded by these tools. Call yaps_status first when another tool reports a problem. Treat every file creation as a user-visible action, never replace an existing output file without the user's explicit approval, and never install a feature model unless the user asked for it.",
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params.name;
  const args = request.params.arguments || {};
  const handler = HANDLERS.get(name);
  if (!handler) {
    return failure("unknown_tool", `Unknown Yaps tool: ${name}`);
  }
  try {
    return await handler(args);
  } catch (error) {
    if (error instanceof YapsToolError) {
      return failure(error.code, error.message);
    }
    // Unexpected failures are relayed with the error's own message only —
    // these originate from this server's validation and Node's fs layer, so
    // they never carry raw CLI stderr.
    return failure("tool_failed", error?.message || "The Yaps tool failed unexpectedly.");
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await server.close().catch(() => {});
    process.exit(0);
  });
}
