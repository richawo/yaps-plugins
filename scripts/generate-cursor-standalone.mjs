#!/usr/bin/env node
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = process.argv[2];
if (!output) throw new Error("Pass the output directory for the twelve repository checkouts.");
const catalog = JSON.parse(readFileSync(join(repo, "cursor/standalone-plugins.json"), "utf8"));
if (!/^[a-f0-9]{40}$/.test(catalog.runtimeCommit)) throw new Error("Runtime must be pinned to a full commit SHA.");
const archive = `https://codeload.github.com/richawo/yaps-plugins/tar.gz/${catalog.runtimeCommit}`;
const writeJson = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + "\n");

for (const plugin of catalog.plugins) {
  const repositoryName = plugin.id.replace(/^yaps-/, "yaps-cursor-");
  const repository = `https://github.com/richawo/${repositoryName}`;
  const root = join(resolve(output), repositoryName);
  mkdirSync(join(root, ".cursor-plugin"), { recursive: true });
  mkdirSync(join(root, "assets"), { recursive: true });
  mkdirSync(join(root, "skills", plugin.id), { recursive: true });
  const env = {
    YAPS_PLUGIN_ID: plugin.id, YAPS_PLUGIN_VERSION: catalog.version,
    YAPS_PLUGIN_HOST: "cursor", YAPS_PLUGIN_TRANSPORT: "mcp",
    ...(plugin.profile === "memory" ? { YAPS_MCP_CLIENT_ID: "cursor", YAPS_MCP_AUTO_AUTHORIZE_READ: "0" } : { YAPS_TOOL_PROFILE: plugin.profile }),
  };
  const config = { command: "npx", args: ["--yes", "--package", archive, plugin.profile === "memory" ? "yaps-plugin-memory" : "yaps-plugin-media"], env };
  writeJson(join(root, ".cursor-plugin/plugin.json"), {
    name: plugin.id, version: catalog.version, description: plugin.description,
    author: { name: "Yaps AI", email: "support@yaps.ai" }, homepage: "https://yaps.ai",
    repository, license: "MIT", keywords: [...plugin.keywords, "yaps", "local-first", "mcp"],
    logo: "assets/yaps-icon.png", skills: "./skills/", mcpServers: "./mcp.json",
  });
  writeJson(join(root, "mcp.json"), { mcpServers: { [plugin.id]: config } });
  // The directory needs the wrapper to preserve the server name in its
  // install deep link. This review artifact is not another discovered MCP.
  writeJson(join(root, "directory-component.json"), { mcpServers: { [plugin.id]: config } });
  let skill = readFileSync(join(repo, "cursor/yaps/skills", plugin.skill, "SKILL.md"), "utf8");
  skill = skill.replace(/^name: .+$/m, `name: ${plugin.id}`).replaceAll("\u2014", ":");
  if (plugin.profile === "transcription") skill = skill.replace(/^- `srt_generate`[^\n]*\n/m, "");
  if (plugin.profile === "memory") skill = skill.replace("Call the main connector's `yaps_status`", "Call `yaps_status`");
  skill += `\n## Standalone plugin scope\n\nThis plugin supplies only the ${plugin.title} workflow. Other Yaps skills mentioned above are separate plugins. Use another workflow only if its tools are actually installed; otherwise explain which plugin is needed. Do not invent missing tool calls.\n`;
  if (!["memory", "video-to-audio"].includes(plugin.profile)) {
    skill += "\nCheck `yaps_status` for feature and model readiness when setup is missing. If a required model is absent, explain the download and ask once unless the user already authorized that installation. Use `yaps_enable_feature` with an allowed feature and appropriate engine, check readiness again, then resume the original task. Reuse existing models; do not delete or reinstall working models.\n";
  }
  writeFileSync(join(root, "skills", plugin.id, "SKILL.md"), skill);
  cpSync(join(repo, "cursor/yaps/assets/yaps-icon.png"), join(root, "assets/yaps-icon.png"));
  cpSync(join(repo, "LICENSE"), join(root, "LICENSE"));
  writeFileSync(join(root, ".gitignore"), "node_modules/\n.DS_Store\n");
  writeFileSync(join(root, "README.md"), `# ${plugin.title}\n\n${plugin.description}\n\nOne purpose-specific Cursor plugin, with one skill and one local MCP server. Install only the Yaps workflows you need. All twelve packages use the same maintained runtime and the models already installed in Yaps.\n\n## Setup\n\n1. Install [Yaps desktop](https://yaps.ai/download) on this computer and sign in with active desktop access.\n2. Install Node.js 20+ with npm/npx. First launch downloads a small helper package and its JavaScript dependencies from GitHub and npm. Git and a source checkout are not required.\n3. Add this repository as a Cursor plugin, or use its Cursor Directory components. A directory MCP install button installs the server configuration; add the skill separately when using that component flow.\n4. ${plugin.profile === "memory" ? "Enable Cursor in Yaps Settings > Agent Access. Read and write permissions are separate and are never silently enabled. Call vault_status to check the connection." : "Use yaps_status to check readiness. Missing feature models can be installed after your agreement; existing models and your Yaps account are reused."}\n\nThe runtime is pinned to [${catalog.runtimeCommit}](https://github.com/richawo/yaps-plugins/commit/${catalog.runtimeCommit}). There are no API keys to supply. Yaps handles local processing and feature model downloads. Yaps 2.3.124 is only the credential-free account-check floor; ${["cut", "meeting"].includes(plugin.profile) ? "this workflow requires 2.3.848 or newer." : "individual tools can require a newer app."}\n\n## Scope and validation\n\nThis is a local Cursor integration. Grok Bot runs primarily in the cloud; its local-execution integration and marketplace distribution have not been validated. Do not treat this package as an automatic Grok Bot listing.\n\nThe shared runtime has direct macOS MCP and Auto Cut export coverage. Windows and live host UI validation must be reported separately; a listing approval does not prove those paths. Model-download code is present, but a fresh download has not been exercised for every workflow.\n\n## Maintenance\n\nGenerated from [the central catalog](https://github.com/richawo/yaps-plugins/blob/main/cursor/standalone-plugins.json) and its skill sources. Update the central runtime and catalog, validate, then regenerate using scripts/generate-cursor-standalone.mjs. Do not copy or fork the helper into this repository. Keep directory-component.json's named wrapper when updating a directory install payload.\n\n[Privacy](https://yaps.ai/privacy) · [Terms](https://yaps.ai/terms) · MIT license\n`);
  console.log(JSON.stringify({ id: plugin.id, title: plugin.title, repository, path: root }));
}
