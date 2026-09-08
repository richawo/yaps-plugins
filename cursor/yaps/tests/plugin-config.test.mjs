import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(pluginRoot, "..", "..");
const kebabName = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const expectedSkills = ["audio-cleaner", "auto-captions", "background-removal", "dictation", "memory", "notes", "read-aloud", "srt-generator", "transcribe", "translation", "video-clipping", "video-to-audio"];

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(pluginRoot, relativePath), "utf8"));
}

function walkStrings(value, visit) {
  if (typeof value === "string") visit(value);
  else if (Array.isArray(value)) value.forEach((item) => walkStrings(item, visit));
  else if (value && typeof value === "object") {
    for (const item of Object.values(value)) walkStrings(item, visit);
  }
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(match, "missing YAML frontmatter");
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator < 1) continue;
    fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return fields;
}

test("Cursor plugin.json is structurally valid", () => {
  const manifest = readJson(".cursor-plugin/plugin.json");
  assert.equal(manifest.name, "yaps");
  assert.match(manifest.name, kebabName);
  assert.equal(manifest.version, "0.2.0");
  assert.equal(typeof manifest.description, "string");
  assert.ok(manifest.description.length > 0);
  assert.equal(manifest.author?.name, "Yaps AI");
  assert.equal(manifest.license, "MIT");
  assert.ok(Array.isArray(manifest.keywords) && manifest.keywords.length > 0);
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.mcpServers, "./mcp.json");
  assert.equal(manifest.logo, "assets/yaps-icon.png");

  walkStrings(manifest, (value) => {
    if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("mailto:")) return;
    assert.equal(isAbsolute(value), false, `absolute path: ${value}`);
    assert.equal(value.includes(".."), false, `parent traversal: ${value}`);
  });

  assert.equal(existsSync(join(pluginRoot, "skills")), true);
  assert.equal(existsSync(join(pluginRoot, "mcp.json")), true);
  assert.equal(existsSync(join(pluginRoot, "assets/yaps-icon.png")), true);
});

test("directory MCP configs install a pinned runtime without relying on a local checkout", () => {
  const config = readJson("mcp.json");
  assert.deepEqual(Object.keys(config.mcpServers).sort(), ["yaps", "yaps-memory"]);
  const runtime = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  for (const [name, entry] of Object.entries(config.mcpServers)) {
    assert.equal(entry.command, "npx");
    assert.deepEqual(entry.args.slice(0, 2), ["--yes", "--package"]);
    assert.match(entry.args[2], /^https:\/\/codeload\.github\.com\/richawo\/yaps-plugins\/tar\.gz\/[a-f0-9]{40}$/);
    assert.equal(entry.args[3], name === "yaps" ? "yaps-plugin-media" : "yaps-plugin-memory");
    assert.equal(entry.args.length, 4);
    assert.equal(existsSync(join(repoRoot, runtime.bin[entry.args[3]])), true);
    assert.equal(Object.hasOwn(entry, "cwd"), false);
    assert.equal(Object.hasOwn(entry.env, "YAPS_CLI_BINARY"), false);
  }
  assert.equal(config.mcpServers.yaps.args[2], config.mcpServers["yaps-memory"].args[2]);
  const memory = config.mcpServers["yaps-memory"];
  assert.equal(memory.env.YAPS_MCP_CLIENT_ID, "cursor");
  assert.equal(memory.env.YAPS_MCP_AUTO_AUTHORIZE_READ, "0");
  assert.equal(memory.env.YAPS_PLUGIN_ID, "yaps");
  assert.equal(memory.env.YAPS_PLUGIN_VERSION, "0.2.0");
  const server = config.mcpServers?.yaps;
  assert.ok(server, "missing mcpServers.yaps");
  assert.equal(server.env.YAPS_PLUGIN_HOST, "cursor");
  assert.equal(server.env.YAPS_PLUGIN_ID, "yaps");
  assert.equal(server.env.YAPS_PLUGIN_VERSION, "0.2.0");
  assert.equal(server.env.YAPS_PLUGIN_TRANSPORT, "mcp");
  assert.equal(Object.hasOwn(server.env, "YAPS_CLI_BINARY"), false);

  walkStrings(config, (value) => {
    assert.equal(isAbsolute(value), false, `absolute path: ${value}`);
    assert.equal(value.includes(".."), false, `parent traversal: ${value}`);
  });
});

test("thin launcher only sets host env and loads the in-plugin helper snapshot", () => {
  const launcher = readFileSync(join(pluginRoot, "scripts/launch.mjs"), "utf8");
  assert.match(launcher, /YAPS_PLUGIN_HOST/);
  assert.match(launcher, /cursor/);
  assert.match(launcher, /"helper"/);
  assert.match(launcher, /"index\.mjs"/);
  assert.match(launcher, /Leave YAPS_CLI_BINARY unset/);
  assert.doesNotMatch(launcher, /@modelcontextprotocol\/sdk/);
  assert.doesNotMatch(launcher, /ListToolsRequestSchema/);
  assert.doesNotMatch(launcher, /CallToolRequestSchema/);
  assert.doesNotMatch(launcher, /new Server\b/);
  assert.doesNotMatch(launcher, /"mcpb"/);
  assert.doesNotMatch(launcher, /["']\.\.["']\s*,\s*["']\.\.["']/);

  const resolvedServer = resolve(pluginRoot, "scripts", "..", "helper", "index.mjs");
  assert.equal(existsSync(resolvedServer), true);
  assert.equal(resolvedServer, join(pluginRoot, "helper/index.mjs"));
  assert.equal(relative(pluginRoot, resolvedServer).startsWith(".."), false);
  assert.equal(existsSync(join(pluginRoot, "scripts/launch.mjs")), true);
});

test("copied helper is a snapshot of mcpb/yaps and stays inside the plugin root", () => {
  const snapshotFiles = [
    "index.mjs",
    "yaps-runtime.mjs",
    "yaps-cli-discovery.mjs",
    "tools/captions.mjs",
    "tools/cut.mjs",
    "tools/dictation.mjs",
    "tools/media.mjs",
    "tools/meeting.mjs",
    "tools/speech.mjs",
    "tools/status.mjs",
    "tools/transcription.mjs",
    "tools/translation.mjs",
  ];

  for (const file of snapshotFiles) {
    const copied = join(pluginRoot, "helper", file);
    const source = join(repoRoot, "mcpb/yaps/server", file);
    assert.equal(existsSync(copied), true, `missing snapshot ${file}`);
    assert.equal(readFileSync(copied, "utf8"), readFileSync(source, "utf8"), `rewritten snapshot ${file}`);
    assert.equal(relative(pluginRoot, copied).startsWith(".."), false);
  }

  const pluginPackage = readJson("package.json");
  const sourcePackage = JSON.parse(readFileSync(join(repoRoot, "mcpb/yaps/package.json"), "utf8"));
  assert.equal(pluginPackage.type, "module");
  assert.equal(
    pluginPackage.dependencies["@modelcontextprotocol/sdk"],
    sourcePackage.dependencies["@modelcontextprotocol/sdk"],
  );
  assert.deepEqual(Object.keys(pluginPackage.dependencies), ["@modelcontextprotocol/sdk"]);
});

test("repo marketplace catalog keeps one yaps plugin at cursor/yaps", () => {
  const catalog = JSON.parse(readFileSync(join(repoRoot, ".cursor-plugin/marketplace.json"), "utf8"));
  assert.equal(catalog.name, "yaps");
  assert.equal(catalog.plugins.length, 1);
  assert.equal(catalog.plugins[0].name, "yaps");
  assert.equal(catalog.plugins[0].source, "cursor/yaps");
  assert.match(catalog.metadata.description, /cursor.directory\/plugins\/yaps/);
  walkStrings(catalog, (value) => {
    if (value.startsWith("http://") || value.startsWith("https://") || value.includes("@")) return;
    assert.equal(isAbsolute(value), false, `absolute path: ${value}`);
    assert.equal(value.includes(".."), false, `parent traversal: ${value}`);
  });
  assert.equal(existsSync(join(repoRoot, "cursor/yaps/.cursor-plugin/plugin.json")), true);
});

test("skills have required frontmatter and tell the agent to use existing tools", () => {
  const skillDirs = readdirSync(join(pluginRoot, "skills")).sort();
  assert.deepEqual(skillDirs, expectedSkills);

  for (const name of expectedSkills) {
    const skillPath = join(pluginRoot, "skills", name, "SKILL.md");
    const contents = readFileSync(skillPath, "utf8");
    const fields = parseFrontmatter(contents);
    assert.equal(fields.name, name);
    assert.ok(fields.description, `${name} missing description`);
    assert.match(contents, /existing Yaps MCP/);
    assert.match(contents, /Do not invent/);
    assert.match(contents, /yaps_status/);
    assert.match(contents, /local_yaps_unreachable/);
    assert.match(contents, /cli_missing/);
    assert.match(contents, /cannot see the Yaps engine/);
    assert.match(contents, /Do not claim Yaps is uninstalled/);
    assert.match(contents, /yaps\.ai\/download/);
    assert.match(contents, /retry from a local/);
    assert.doesNotMatch(contents, /2629/);
    assert.doesNotMatch(contents, /submit gate/i);
    assert.doesNotMatch(contents, /Windows first-connect/);
    assert.doesNotMatch(contents, /find-the-app is (now )?fixed|finder is fixed/);
    assert.doesNotMatch(contents, /listing is submitted|submitted to/);
    assert.doesNotMatch(contents, /yaps-plugin-runner/);
    assert.doesNotMatch(contents, /yaps_cli /);
  }
});

test("README records local-only use and the existing directory listing", () => {
  const readme = readFileSync(join(pluginRoot, "README.md"), "utf8");
  assert.match(readme, /cursor.directory\/plugins\/yaps/);
  assert.match(readme, /cursor\.com\/marketplace\/publish|cursor\.directory/);
  assert.match(readme, /Yaps desktop/);
  assert.match(readme, /local/i);
  assert.match(readme, /local_yaps_unreachable/);
  assert.match(readme, /cli_missing/);
  assert.match(readme, /Windows session resolution passed on TX16PRO/);
  assert.match(readme, /running portable sidecar/);
  assert.match(readme, /Live Cursor\/Grok tool execution remains untested/);
  assert.match(readme, /YAPS_CLI_BINARY/);
  assert.doesNotMatch(readme, /2629/);
  assert.doesNotMatch(readme, /submit gate/i);
  assert.doesNotMatch(readme, /listing is submitted/);
  assert.doesNotMatch(readme, /Windows first-connect/);
  assert.doesNotMatch(readme, /find-the-app is now fixed|finder is fixed/);
});
