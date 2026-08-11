import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const pluginsRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const codexCampaignUrl =
  "https://www.yaps.ai/codex?utm_source=codex&utm_medium=plugin&utm_campaign=official_plugins";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const pluginNames = readdirSync(pluginsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith("yaps-"))
  .map((entry) => entry.name)
  .sort();

test("every Codex manifest uses the dedicated attributed landing page", () => {
  assert.equal(pluginNames.length, 11);

  for (const pluginName of pluginNames) {
    const manifest = readJson(
      join(pluginsRoot, pluginName, ".codex-plugin", "plugin.json"),
    );
    assert.equal(manifest.homepage, codexCampaignUrl, pluginName);
    assert.equal(manifest.interface?.websiteURL, codexCampaignUrl, pluginName);
    assert.equal(manifest.author?.url, "https://www.yaps.ai", pluginName);
  }
});

test("shared Claude manifests remain untagged", () => {
  for (const pluginName of pluginNames) {
    const manifest = readJson(
      join(pluginsRoot, pluginName, ".claude-plugin", "plugin.json"),
    );
    assert.equal(manifest.homepage, "https://www.yaps.ai", pluginName);
    assert.doesNotMatch(JSON.stringify(manifest), /utm_source=codex/, pluginName);
  }
});

test("every manifest-referenced image ships inside its plugin", () => {
  for (const pluginName of pluginNames) {
    const pluginRoot = join(pluginsRoot, pluginName);
    const manifest = readJson(
      join(pluginRoot, ".codex-plugin", "plugin.json"),
    );

    for (const field of ["composerIcon", "logo", "logoDark"]) {
      const relativePath = manifest.interface?.[field];
      assert.equal(typeof relativePath, "string", `${pluginName}:${field}`);
      const assetPath = resolve(pluginRoot, relativePath);
      assert.ok(assetPath.startsWith(`${pluginRoot}/`), `${pluginName}:${field}`);
      assert.ok(existsSync(assetPath), `${pluginName}:${field} (${relativePath})`);
    }
  }
});

test("Yaps Memory reports the Codex campaign URL only for the Codex host", () => {
  const launcher = readFileSync(
    join(pluginsRoot, "yaps-memory", "mcp", "server", "index.mjs"),
    "utf8",
  );
  assert.match(launcher, /YAPS_PLUGIN_HOST === "codex_plugin"/);
  assert.ok(launcher.includes(codexCampaignUrl));
  assert.match(launcher, /: "https:\/\/yaps\.ai\/download"/);
});
