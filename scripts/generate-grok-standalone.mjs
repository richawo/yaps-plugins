#!/usr/bin/env node
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(process.argv[2] || join(repo, "grok/plugins"));
const catalog = JSON.parse(readFileSync(join(repo, "cursor/standalone-plugins.json"), "utf8"));
const runtime = "yaps-cursor-runtime@0.3.1";
const version = "0.1.0";
const scratch = mkdtempSync(join(tmpdir(), "yaps-grok-source-"));
const writeJson = (path, data) => writeFileSync(path, JSON.stringify(data, null, 2) + "\n");

try {
  // Reuse the maintained skill scoping and model-setup instructions.
  execFileSync(process.execPath, [join(repo, "scripts/generate-cursor-standalone.mjs"), scratch], { stdio: "pipe" });
  for (const plugin of catalog.plugins) {
    const root = join(output, plugin.id);
    const cursorRoot = join(scratch, plugin.id.replace(/^yaps-/, "yaps-cursor-"));
    mkdirSync(join(root, ".grok-plugin"), { recursive: true });
    mkdirSync(join(root, "skills", plugin.id), { recursive: true });
    const homepage = `https://github.com/richawo/yaps-plugins/tree/main/grok/plugins/${plugin.id}`;
    writeJson(join(root, ".grok-plugin/plugin.json"), {
      name: plugin.id, version, description: plugin.description,
      author: { name: "Yaps AI", email: "support@yaps.ai" },
      homepage, repository: "https://github.com/richawo/yaps-plugins", license: "MIT",
      keywords: plugin.keywords.map(word => `yaps ${word.replaceAll("-", " ")}`),
      skills: [`./skills/${plugin.id}`], mcpServers: "./.mcp.json",
    });
    writeJson(join(root, ".mcp.json"), { mcpServers: { [plugin.id]: {
      command: "npx",
      args: ["--yes", "--package", runtime, plugin.profile === "memory" ? "yaps-plugin-memory" : "yaps-plugin-media"],
      env: {
        YAPS_PLUGIN_ID: plugin.id, YAPS_PLUGIN_VERSION: version,
        YAPS_PLUGIN_HOST: "grok", YAPS_PLUGIN_TRANSPORT: "mcp",
        ...(plugin.profile === "memory"
          ? { YAPS_MCP_CLIENT_ID: "local-mcp", YAPS_MCP_AUTO_AUTHORIZE_READ: "0" }
          : { YAPS_TOOL_PROFILE: plugin.profile }),
      },
    } } });
    let skill = readFileSync(join(cursorRoot, "skills", plugin.id, "SKILL.md"), "utf8")
      .replaceAll("Cursor", "Grok");
    if (plugin.profile === "memory") {
      skill = skill.replace(/The connector uses the \*\*Grok\*\* identity[^\n]+/, "The connector uses Yaps' generic `local-mcp` identity with automatic authorization disabled. Read and write permissions are separate and controlled by the desktop app's Agent Access policy. If access is denied, explain the reported policy and ask the user to enable the appropriate local MCP connection using the supported settings in their installed app. Do not invent a dedicated Grok switch, impersonate Cursor, Codex, or Claude, modify the policy, or bypass a revoked connection.");
      skill = skill.replace(" A missing vault connector does not prevent the plugin's media tools from working.", "");
    }
    writeFileSync(join(root, "skills", plugin.id, "SKILL.md"), skill);
    cpSync(join(repo, "LICENSE"), join(root, "LICENSE"));
    writeFileSync(join(root, "README.md"), `# ${plugin.title} for Grok Build

${plugin.description}

One purpose-specific plugin with one skill and one local MCP server. Install only the Yaps workflows you need. The twelve plugins share the same maintained runtime and existing desktop models.

## Setup

1. Install [Yaps desktop](https://yaps.ai/download) on the same computer and sign in with active desktop access.
2. Install Node.js 20+ with npm/npx. The MCP configuration installs the exact package \`${runtime}\` from npm. No Git checkout or separate CLI installation is needed.
3. Install this plugin in a Grok Build environment that can start local stdio MCP processes on that computer. A cloud-only session cannot reach a desktop engine on another machine.
4. ${plugin.profile === "memory" ? "Call vault_status. Yaps Agent Access must permit the generic local-mcp connection. The connector never enables access automatically or borrows Cursor, Codex, or Claude permissions. Read and write access remain separate; use the controls supported by your installed desktop version." : "Call yaps_status to check feature and model readiness. Missing feature models can be installed after your agreement; existing models and your Yaps account are reused."}

Yaps 2.3.124 is only the credential-free account-check minimum. ${["cut", "meeting"].includes(plugin.profile) ? "This workflow requires 2.3.848 or newer." : "Individual tools can require a newer desktop version."} No API key is required.

## Execution, network, and permissions

The plugin starts a local stdio MCP process using an exact npm package version. npm contacts registry.npmjs.org to download that package and its JavaScript dependencies. The package has no installation lifecycle scripts and does not fetch or run arbitrary shell scripts or native binaries. Its source is readable in this repository; the package name retains Cursor for compatibility with the shared runtime.

The wrapper calls the already installed Yaps CLI or native MCP helper. It does not directly upload media or vault contents. Tool results, including requested text or notes, are returned to the calling Grok host and are subject to that host's data handling. Only request files and notes that the user intends to share with that host.

The existing desktop app can contact yaps-api.richardawoyemi.workers.dev for account refresh, model assets, and its diagnostic service. Asset redirects and endpoints depend on the installed desktop release; older releases can use huggingface.co and GitHub release assets. These are desktop operations, not a hosted MCP endpoint. Model setup requires authorization unless already granted. Existing desktop diagnostics may report operation outcomes under Yaps' privacy settings; this wrapper has no independent telemetry uploader. See [Yaps privacy](https://yaps.ai/privacy).

Credentials stay in the existing desktop account store. The plugin asks for no API keys, tokens, or credential files. File access is limited by the installed helper, operating system permissions, the requested workflow, and, for Memory, Yaps Agent Access. It provides no generic shell-execution tool or lifecycle hooks. Preserve input media and export to a separate output path.

## Validation and distribution

The shared runtime has direct macOS MCP and selected media-export coverage. The Grok manifest is checked with the xAI catalog extractor. Live Grok host tool execution, a fresh Windows run of this package, and fresh model downloads for every workflow are not established by those checks. Marketplace submission is subject to xAI review and does not itself mean acceptance or availability in every Grok product.

## Ownership and maintenance

Richard Awoyemi maintains the Yaps plugin source under the existing richawo GitHub account. This is the same public source used by the published Yaps Cursor packages; it is not a separate third-party implementation. Source and skills use the MIT license included here. Desktop models retain their own licenses.

Generated from the central workflow catalog and skills by scripts/generate-grok-standalone.mjs. Keep the Grok manifest and runtime version pinned together, validate, publish the source commit, then update the marketplace SHA and generated index.

[Yaps](https://yaps.ai) · [Privacy](https://yaps.ai/privacy) · [Terms](https://yaps.ai/terms)
`);
    console.log(JSON.stringify({ id: plugin.id, path: root, runtime }));
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
