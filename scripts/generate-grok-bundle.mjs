#!/usr/bin/env node
// Build the single all-in-one Yaps plugin for the xAI Grok Build marketplace.
//
//   node scripts/generate-grok-bundle.mjs [output-dir]
//
// Output: grok/yaps/ with one Grok manifest, two local stdio MCP servers
// (every media workflow, plus the private-vault Memory connector), and the
// twelve maintained Yaps skills adapted for Grok. Writes files only. It never
// runs Yaps, signs in, installs anything, or publishes.
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(process.argv[2] || join(repo, "grok/yaps"));
const version = "1.0.0";

// Both servers run from one immutable public source commit of this repository.
// Its helper is byte-identical to yaps-cursor-runtime@0.3.0, and its Memory
// launcher gives Grok the generic local-mcp Agent Access identity (the 0.3.1
// change that is not on npm yet). Bump only to a pushed, reachable commit.
const RUNTIME_COMMIT = "c96839613550a79bc7b805285b700b8c681fffd4";
const runtime = `https://codeload.github.com/richawo/yaps-plugins/tar.gz/${RUNTIME_COMMIT}`;

const description =
  "Supercharge Grok with powerful local AI tools from Yaps: transcription, speaker-labelled meeting notes, " +
  "captions, subtitles, translation, text to speech, audio cleanup, background removal, Auto Cut, and private " +
  "Markdown memory. Runs on your own computer through the Yaps desktop app.";

const writeJson = (path, data) => writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
const baseEnv = {
  YAPS_PLUGIN_ID: "yaps",
  YAPS_PLUGIN_VERSION: version,
  YAPS_PLUGIN_HOST: "grok",
  YAPS_PLUGIN_TRANSPORT: "mcp",
};

rmSync(output, { recursive: true, force: true });
mkdirSync(join(output, ".grok-plugin"), { recursive: true });

writeJson(join(output, ".grok-plugin/plugin.json"), {
  name: "yaps",
  displayName: "Yaps",
  version,
  description,
  author: { name: "Yaps AI", email: "support@yaps.ai", url: "https://yaps.ai" },
  homepage: "https://yaps.ai",
  repository: "https://github.com/richawo/yaps-plugins",
  license: "MIT",
  keywords: ["yaps", "yaps ai", "yaps local ai", "yaps transcription", "yaps captions", "yaps memory"],
  logo: "assets/yaps-icon.png",
  skills: "./skills/",
  mcpServers: "./.mcp.json",
});

writeJson(join(output, ".mcp.json"), {
  mcpServers: {
    yaps: {
      command: "npx",
      args: ["--yes", "--package", runtime, "yaps-plugin-media"],
      env: { ...baseEnv },
    },
    "yaps-memory": {
      command: "npx",
      args: ["--yes", "--package", runtime, "yaps-plugin-memory"],
      env: { ...baseEnv, YAPS_MCP_CLIENT_ID: "local-mcp", YAPS_MCP_AUTO_AUTHORIZE_READ: "0" },
    },
  },
});

// Reuse the combined-scope skills maintained for the all-in-one Cursor bundle.
const skillsSource = join(repo, "cursor/yaps/skills");
const skillNames = readdirSync(skillsSource, { withFileTypes: true })
  .filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
for (const name of skillNames) {
  let skill = readFileSync(join(skillsSource, name, "SKILL.md"), "utf8");
  if (name === "memory") {
    skill = skill.replace(
      /The connector uses the \*\*Cursor\*\* identity[^\n]+/,
      "The connector uses Yaps' generic `local-mcp` identity with automatic authorization disabled. Read and write " +
      "permissions are separate and controlled by the desktop app's Agent Access policy. If access is denied, explain " +
      "the reported policy and ask the user to enable the appropriate local MCP connection using the supported settings " +
      "in their installed app. Do not invent a dedicated Grok switch, impersonate Cursor, Codex, or Claude, modify the " +
      "policy, or bypass a revoked connection.",
    );
  }
  skill = skill
    .replaceAll("Cursor's native microphone control", "Grok's native microphone control")
    .replaceAll("Cursor session", "Grok session")
    // Tool lists use "`tool` \u2014 purpose"; keep them readable without dashes.
    .replaceAll("` \u2014 ", "`: ");
  if (skill.replaceAll("impersonate Cursor", "").includes("Cursor")) throw new Error(`Unadapted Cursor reference in skill: ${name}`);
  if (skill.includes("—")) throw new Error(`Em dash in skill: ${name}`);
  mkdirSync(join(output, "skills", name), { recursive: true });
  writeFileSync(join(output, "skills", name, "SKILL.md"), skill);
}
if (skillNames.length !== 12) throw new Error(`Expected 12 skills, found ${skillNames.length}`);

mkdirSync(join(output, "assets"), { recursive: true });
cpSync(join(repo, "cursor/yaps/assets/yaps-icon.png"), join(output, "assets/yaps-icon.png"));
cpSync(join(repo, "LICENSE"), join(output, "LICENSE"));

writeFileSync(join(output, "README.md"), `# Yaps for Grok

**Supercharge Grok with powerful local AI tools.** One plugin gives Grok the whole Yaps toolkit, running on your own computer through the Yaps desktop app. Your media is processed locally, not uploaded to a hosted service.

| Ask Grok to | Skill | What you get |
| --- | --- | --- |
| Transcribe a recording | \`transcribe\` | A plain-text transcript of any audio or video file |
| Write up a meeting | \`notes\` | Speaker-labelled notes, recaps, chapters, and answers grounded in the recording |
| Caption a video | \`auto-captions\` | A new MP4 with styled, word-highlighted captions |
| Make subtitles | \`srt-generator\` | A timed \`.srt\` file |
| Translate | \`translation\` | Translated text, Markdown, or SRT with timing preserved |
| Read something aloud | \`read-aloud\` | Local text-to-speech saved as WAV |
| Clean up audio | \`audio-cleaner\` | A separate WAV with noise, hiss, and static reduced |
| Remove a background | \`background-removal\` | A transparent PNG or a subject on a solid colour |
| Tighten a talking-head video | \`video-clipping\` | Auto Cut removes dead air and exports a new MP4 |
| Pull audio from a video | \`video-to-audio\` | MP3, WAV, or M4A |
| Check voice typing | \`dictation\` | Dictation readiness and recovery of recent dictations |
| Remember things across tasks | \`memory\` | Search, cite, and update your private Markdown vault |

Every export goes to a new file. Your originals are never overwritten.

## Setup

1. Install [Yaps desktop](https://yaps.ai/download) on the same computer as Grok Build, open it, and sign in. New accounts start with a free trial; some features need Yaps Pro.
2. Install Node.js 20 or newer (for \`npx\`).
3. Install this plugin from the Grok Build marketplace (\`/plugin\`).
4. Ask Grok to run \`yaps_status\`. It reports which features are ready. When a feature needs a model, Grok asks before downloading it. Models you already installed in Yaps are reused.

No API key is needed. A cloud-only Grok session cannot reach a Yaps app on another machine; run Grok Build locally.

For Memory, allow the local MCP connection in the Yaps app's Agent Access settings. Read and write access are separate, and nothing is enabled automatically.

## What runs, and what it can reach

The plugin has two local stdio MCP servers and no hooks, commands, or agents:

- \`yaps\`: transcription, meetings, captions, subtitles, translation, speech, audio cleanup, background removal, Auto Cut, video to audio, and dictation tools.
- \`yaps-memory\`: the private-vault connector shipped inside the Yaps app.

Both start with \`npx\` from one pinned public commit of this repository (\`${RUNTIME_COMMIT}\`). npm fetches that source and its JavaScript dependencies (\`@modelcontextprotocol/sdk\`) and runs no install scripts. The servers call the Yaps CLI and vault connector that are already installed with the desktop app. They download no native binaries, fetch no remote scripts, and expose no generic shell tool.

The plugin asks for no credentials. It reuses the signed-in desktop account. Tool results, including transcripts or notes you ask for, go back to Grok and follow Grok's data handling, so request only what you are happy to share with it. The Yaps desktop app itself can contact \`yaps-api.richardawoyemi.workers.dev\` for account refresh, model downloads, and diagnostics under the [Yaps privacy policy](https://yaps.ai/privacy). The plugin adds no telemetry of its own.

## Ownership

Richard Awoyemi, the founder of Yaps, maintains this source under the \`richawo\` GitHub account, which also publishes the Yaps Claude, Codex, Cursor, and OpenClaw plugins. MIT licensed. Desktop models keep their own licenses.

Generated by \`scripts/generate-grok-bundle.mjs\` from the maintained Yaps skills.

[Yaps](https://yaps.ai) · [Privacy](https://yaps.ai/privacy) · [Terms](https://yaps.ai/terms)
`);

console.log(JSON.stringify({ output, version, runtimeCommit: RUNTIME_COMMIT, skills: skillNames }));
