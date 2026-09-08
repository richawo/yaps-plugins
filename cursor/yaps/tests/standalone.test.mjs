import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { TOOL_PROFILES } from "../helper/tool-profiles.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
test("twelve generated repositories each install one distinct workflow from the same immutable runtime", () => {
  const root = mkdtempSync(join(tmpdir(), "yaps-standalone-test-"));
  try {
    execFileSync(process.execPath, [join(repo, "scripts/generate-cursor-standalone.mjs"), root]);
    const catalog = JSON.parse(readFileSync(join(repo, "cursor/standalone-plugins.json"), "utf8"));
    const directories = readdirSync(root);
    assert.equal(directories.length, 12);
    const names = new Set(), pins = new Set();
    for (const dir of directories) {
      const path = join(root, dir);
      const readJson = name => JSON.parse(readFileSync(join(path, name), "utf8"));
      const manifest = readJson(".cursor-plugin/plugin.json");
      assert.equal(names.has(manifest.name), false);
      names.add(manifest.name);
      assert.equal(manifest.repository, `https://github.com/richawo/${dir}`);
      assert.deepEqual(readdirSync(join(path, "skills")), [manifest.name]);
      assert.match(readFileSync(join(path, "skills", manifest.name, "SKILL.md"), "utf8"), new RegExp(`^name: ${manifest.name}$`, "m"));
      const config = readJson("mcp.json");
      assert.deepEqual(Object.keys(config.mcpServers), [manifest.name]);
      assert.deepEqual(readJson("directory-component.json"), config);
      const entry = config.mcpServers[manifest.name];
      assert.equal(entry.command, "npx");
      if (catalog.runtimePackage) {
        assert.match(entry.args[2], /^yaps-cursor-runtime@\d+\.\d+\.\d+$/);
        assert.equal(entry.args[2], catalog.runtimePackage);
      } else {
        assert.equal(entry.args[2], `https://codeload.github.com/richawo/yaps-plugins/tar.gz/${catalog.runtimeCommit}`);
      }
      pins.add(entry.args[2]);
      assert.equal(Object.hasOwn(entry, "cwd"), false);
      assert.equal(Object.hasOwn(entry.env, "YAPS_CLI_BINARY"), false);
      if (manifest.name === "yaps-memory") {
        assert.equal(entry.args[3], "yaps-plugin-memory");
        assert.equal(entry.env.YAPS_MCP_CLIENT_ID, "cursor");
        assert.equal(entry.env.YAPS_MCP_AUTO_AUTHORIZE_READ, "0");
      } else {
        assert.equal(entry.args[3], "yaps-plugin-media");
        assert.ok(TOOL_PROFILES[entry.env.YAPS_TOOL_PROFILE]);
      }
    }
    assert.equal(pins.size, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
