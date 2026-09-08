import assert from "node:assert/strict";
import test from "node:test";
import { prepareMemoryLaunch } from "../scripts/memory-runtime.mjs";

const active = { auth: { authenticated: true, status: "active" }, authStatusSafety: "safe", settingsPath: "C:\\canonical\\settings.json" };
const cli = { ...active, path: "C:\\portable\\yaps_cli.exe", source: "running_app" };

test("Memory follows the selected Windows portable CLI and preserves Cursor access controls", async () => {
  const launch = await prepareMemoryLaunch({
    platform: "win32", env: { YAPS_MCP_AUTO_AUTHORIZE_READ: "1", YAPS_MCP_CLIENT_ID: "codex" },
    resolveSession: async () => cli, canAccess: path => path === "C:\\portable\\yaps_mcp.exe",
    canonicalize: path => path,
    resolveConnector: () => { throw new Error("Must not select a stale Program Files connector"); },
  });
  assert.equal(launch.command, "C:\\portable\\yaps_mcp.exe");
  assert.equal(launch.env.YAPS_MCP_CLIENT_ID, "cursor");
  assert.equal(launch.env.YAPS_MCP_AUTO_AUTHORIZE_READ, "0");
  assert.equal(launch.env.YAPS_SETTINGS_PATH, cli.settingsPath);
});

test("Memory resolves a macOS CLI symlink before finding its native connector", async () => {
  const native = "/Applications/Yaps.app/Contents/MacOS/yaps_mcp";
  const launch = await prepareMemoryLaunch({
    platform: "darwin", env: {}, resolveSession: async () => ({ ...active, path: "/usr/local/bin/yaps", source: "path" }),
    canonicalize: () => "/Applications/Yaps.app/Contents/MacOS/yaps_cli", canAccess: path => path === native,
  });
  assert.equal(launch.command, native);
});

test("Memory respects invalid explicit connector overrides without falling back", async () => {
  for (const env of [{ YAPS_MCP_BINARY: "C:\\missing\\yaps_mcp.exe" }, { YAPS_INSTALL_DIR: "C:\\missing" }]) {
    await assert.rejects(prepareMemoryLaunch({
      platform: "win32", env, resolveSession: async () => cli,
      canAccess: path => path === "C:\\portable\\yaps_mcp.exe",
      resolveConnector: () => ({ path: null }),
    }), { code: "vault_connector_unavailable" });
  }
});

test("Memory stops on stale discovery and inactive accounts before starting a connector", async () => {
  await assert.rejects(prepareMemoryLaunch({
    env: {}, resolveSession: async () => ({ path: null, rejected: [{ reason: "stale_cli" }] }),
  }), { code: "account_status_unsafe", exitCode: 78 });
  await assert.rejects(prepareMemoryLaunch({
    env: {}, resolveSession: async () => ({ ...cli, auth: { authenticated: false, status: "signed_out" } }),
  }), { code: "unauthenticated" });
});
