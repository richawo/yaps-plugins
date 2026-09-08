import { accessSync, constants, realpathSync, statSync } from "node:fs";
import { posix, win32 } from "node:path";
import { spawn } from "node:child_process";
import {
  classifyCliResolutionFailure, diagnoseAccount, resolveYapsConnector, resolveYapsSession,
} from "../helper/yaps-cli-discovery.mjs";

export async function prepareMemoryLaunch(options = {}) {
  const env = options.env || process.env;
  const platform = options.platform || process.platform;
  const cli = await (options.resolveSession || resolveYapsSession)({ env, platform, recoverAccount: true });
  if (!cli.path) throw Object.assign(new Error(classifyCliResolutionFailure(cli).message), classifyCliResolutionFailure(cli));
  const account = diagnoseAccount(cli);
  if (account.code !== "ready") throw Object.assign(new Error(account.message), { code: account.code, exitCode: 78 });
  const path = platform === "win32" ? win32 : posix;
  const canAccess = options.canAccess || (candidate => {
    try {
      accessSync(candidate, platform === "win32" ? constants.F_OK : constants.X_OK);
      return statSync(candidate).isFile();
    } catch { return false; }
  });
  const resolveConnector = options.resolveConnector || resolveYapsConnector;
  let connector;
  if (env.YAPS_MCP_BINARY?.trim() || env.YAPS_INSTALL_DIR?.trim()) {
    // Respect a user's explicit connector choice, including an invalid one.
    connector = resolveConnector({ env, platform, canAccess });
  } else {
    let cliPath = cli.path;
    try { cliPath = (options.canonicalize || realpathSync)(cliPath); } catch {}
    const sibling = path.join(path.dirname(cliPath), platform === "win32" ? "yaps_mcp.exe" : "yaps_mcp");
    connector = canAccess(sibling) ? { path: sibling, source: cli.source } : resolveConnector({ env, platform, canAccess });
  }
  if (!connector?.path) {
    throw Object.assign(new Error("The Yaps CLI works, but the private-vault connector is unavailable. Update Yaps, open it, and retry locally."), { code: "vault_connector_unavailable", exitCode: 127 });
  }
  return {
    command: connector.path,
    env: {
      ...env,
      ...(cli.settingsPath && !env.YAPS_SETTINGS_PATH?.trim() ? { YAPS_SETTINGS_PATH: cli.settingsPath } : {}),
      YAPS_MCP_CLIENT_ID: "cursor",
      // Current desktop releases only auto-enroll Codex/Claude. Preserve
      // Cursor's real Agent Access identity and never impersonate either.
      YAPS_MCP_AUTO_AUTHORIZE_READ: "0",
    },
  };
}

export async function startMemory(options = {}) {
  const launch = await prepareMemoryLaunch(options);
  const child = (options.spawnProcess || spawn)(launch.command, [], {
    env: launch.env, stdio: ["inherit", "inherit", "pipe"], windowsHide: true,
  });
  // Native startup logs can contain local settings paths; keep them out of
  // plugin logs while preserving the native MCP protocol on stdout.
  child.stderr?.on("data", () => {});
  child.on("error", () => {
    process.stderr.write("The Yaps private-vault connector could not start. Update Yaps and retry locally.\n");
    process.exitCode = 127;
  });
  child.on("exit", (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { child.kill(signal); });
  return child;
}
