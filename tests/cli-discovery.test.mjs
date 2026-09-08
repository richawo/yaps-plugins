import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { chmodSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  applyResolvedSettings,
  authStatusSafetyForVersion,
  classifyCliResolutionFailure,
  cliCandidates,
  commandRequiresActiveAccount,
  connectorCandidates,
  diagnoseAccount,
  diagnoseConnection,
  isYapsCliCommand,
  launchInstalledYaps,
  isAuthStatusCommand,
  probeYapsCli,
  readInstalledYapsVersion,
  readYapsAuthStatus,
  resolveWindowsShim,
  resolveYapsConnector,
  resolveYapsCli,
  resolveYapsSession,
} from "../shared/yaps-cli-discovery.mjs";

const pluginsRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const validProbe = async () => ({ ok: true });

test("PATH-missing macOS sessions find and validate the installed app CLI", async () => {
  const installed = "/Applications/Yaps.app/Contents/MacOS/yaps_cli";
  const result = await resolveYapsCli({
    platform: "darwin",
    env: { HOME: "/Users/tester", PATH: "" },
    canAccess: (candidate) => candidate === installed,
    probe: validProbe,
  });
  assert.deepEqual({ path: result.path, source: result.source }, { path: installed, source: "installed_app" });
});

test("macOS covers the system and per-user Applications locations", () => {
  const candidates = cliCandidates({ platform: "darwin", env: { HOME: "/Users/tester", PATH: "" } });
  assert.deepEqual(candidates.map(({ path }) => path), [
    "/Applications/Yaps.app/Contents/MacOS/yaps_cli",
    "/Users/tester/Applications/Yaps.app/Contents/MacOS/yaps_cli",
  ]);
});

test("a validated override wins over PATH and installed-app candidates", async () => {
  const probes = [];
  const result = await resolveYapsCli({
    override: "/chosen/yaps_cli",
    platform: "darwin",
    env: { HOME: "/Users/tester", PATH: "/bin" },
    canAccess: () => true,
    probe: async (candidate) => { probes.push(candidate); return { ok: true }; },
  });
  assert.equal(result.path, "/chosen/yaps_cli");
  assert.deepEqual(probes, ["/chosen/yaps_cli"]);
});

test("an invalid explicit override is rejected authoritatively", async () => {
  const probes = [];
  const result = await resolveYapsCli({
    platform: "linux",
    env: { PATH: "/healthy", YAPS_CLI_BINARY: "/invalid/yaps_cli" },
    canAccess: () => true,
    probe: async (candidate) => {
      probes.push(candidate);
      return { ok: candidate === "/healthy/yaps" };
    },
  });
  assert.equal(result.path, null);
  assert.deepEqual(probes, ["/invalid/yaps_cli"]);
  assert.equal(result.rejected[0].source, "override");
});

test("an invalid PATH binary falls through to a validated packaged binary", async () => {
  const installed = "/usr/bin/yaps_cli";
  const result = await resolveYapsCli({
    platform: "linux",
    env: { PATH: "/untrusted" },
    canAccess: (candidate) => candidate === "/untrusted/yaps" || candidate === installed,
    probe: async (candidate) => ({ ok: candidate === installed, reason: "invalid_status" }),
  });
  assert.equal(result.path, installed);
  assert.equal(result.source, "installed_app");
  assert.deepEqual(result.rejected, [{ source: "path", reason: "invalid_status" }]);
});

test("Windows uses the verified per-machine install and never Local AppData", () => {
  const candidates = cliCandidates({
    platform: "win32",
    env: {
      USERPROFILE: "C:\\Users\\tester",
      PATH: "",
      ProgramW6432: "C:\\Program Files",
      ProgramFiles: "C:\\Program Files",
      "ProgramFiles(x86)": "C:\\Program Files (x86)",
      LOCALAPPDATA: "C:\\Users\\tester\\AppData\\Local",
    },
  });
  const paths = candidates.map(({ path }) => path);
  assert.deepEqual(paths, [
    "C:\\Program Files\\Yaps\\yaps_cli.exe",
    "C:\\Program Files (x86)\\Yaps\\yaps_cli.exe",
  ]);
  assert.equal(paths.some((path) => /AppData/i.test(path)), false);
});

test("Windows leftover-only skip-stale stays a distinct stale signal, not a find-CLI miss", async () => {
  const stale = "C:\\Program Files\\Yaps\\yaps_cli.exe";
  const session = await resolveYapsSession({
    platform: "win32",
    env: {
      USERPROFILE: "C:\\Users\\tester",
      PATH: "",
      ProgramFiles: "C:\\Program Files",
    },
    runningExecutables: [],
    canAccess: (candidate) => candidate === stale,
    probe: validProbe,
    readAppVersion: async () => "2.1.4",
  });
  assert.equal(session.path, null);
  assert.equal(session.source, null);
  assert.equal(session.authStatusSafety, "unsafe");
  assert.ok(session.rejected.some((entry) => entry.source === "installed_app" && entry.reason === "stale_cli"));
  const failure = classifyCliResolutionFailure(session);
  assert.equal(failure.code, "account_status_unsafe");
  assert.equal(failure.exitCode, 78);
  assert.notEqual(failure.code, "local_yaps_unreachable");
  assert.notEqual(diagnoseConnection({ cli: session }).code, "cli_missing");
});

test("Windows prefers a running portable sidecar before Program Files when YAPS_CLI_BINARY is unset", async () => {
  const portable = "C:\\Users\\tester\\portable\\yaps_cli.exe";
  const installed = "C:\\Program Files\\Yaps\\yaps_cli.exe";
  const env = {
    USERPROFILE: "C:\\Users\\tester",
    PATH: "",
    ProgramFiles: "C:\\Program Files",
    ProgramW6432: "C:\\Program Files",
  };
  const candidates = cliCandidates({
    platform: "win32",
    env,
    runningExecutables: ["C:\\Users\\tester\\portable\\yaps.exe"],
  });
  const paths = candidates.map(({ path }) => path);
  assert.equal(Object.hasOwn(env, "YAPS_CLI_BINARY"), false);
  assert.equal(candidates.find(({ path }) => path === portable)?.source, "running_app");
  assert.equal(candidates.find(({ path }) => path === installed)?.source, "installed_app");
  assert.ok(paths.indexOf(portable) < paths.indexOf(installed));

  const result = await resolveYapsCli({
    platform: "win32",
    env,
    runningExecutables: ["C:\\Users\\tester\\portable\\yaps.exe"],
    canAccess: (candidate) => candidate === portable || candidate === installed,
    probe: async () => ({ ok: true }),
    readAppVersion: async (cli) => (cli.path === portable ? "2.3.2129" : "2.1.4"),
  });
  assert.deepEqual({ path: result.path, source: result.source }, { path: portable, source: "running_app" });
});

test("clean install, uninstall, and reinstall are re-evaluated on macOS and Windows", async () => {
  for (const fixture of [
    {
      platform: "darwin",
      env: { HOME: "/Users/fresh", PATH: "" },
      installed: "/Users/fresh/Applications/Yaps.app/Contents/MacOS/yaps_cli",
    },
    {
      platform: "win32",
      env: { USERPROFILE: "C:\\Users\\fresh", PATH: "", ProgramW6432: "C:\\Program Files" },
      installed: "C:\\Program Files\\Yaps\\yaps_cli.exe",
    },
  ]) {
    let present = false;
    const resolveFresh = () => resolveYapsCli({
      platform: fixture.platform,
      env: fixture.env,
      canAccess: (candidate) => present && candidate === fixture.installed,
      probe: async (candidate) => ({ ok: present && candidate === fixture.installed }),
    });

    assert.equal((await resolveFresh()).path, null, `${fixture.platform} should start clean`);
    present = true;
    assert.equal((await resolveFresh()).path, fixture.installed, `${fixture.platform} should see a fresh install`);
    present = false;
    assert.equal((await resolveFresh()).path, null, `${fixture.platform} should forget an uninstall`);
    present = true;
    assert.equal((await resolveFresh()).path, fixture.installed, `${fixture.platform} should see a reinstall without stale cache`);
  }
});

test("Windows connector discovery accepts only the packaged executable contract", () => {
  const candidates = connectorCandidates({
    platform: "win32",
    env: {
      PATH: "C:\\Users\\tester\\.local\\bin",
      PATHEXT: ".EXE;.CMD",
      ProgramFiles: "C:\\Program Files",
    },
  });
  assert.ok(candidates.some(({ path }) => path === "C:\\Users\\tester\\.local\\bin\\yaps_mcp.exe"));
  assert.equal(candidates.some(({ path }) => path.toLowerCase().endsWith(".cmd")), false);
  assert.equal(resolveYapsConnector({
    platform: "win32",
    env: { YAPS_MCP_BINARY: "C:\\tmp\\yaps_mcp.cmd" },
    canAccess: (candidate) => candidate === "C:\\tmp\\yaps_mcp.cmd",
  }).path, null);
});

test("Windows prefers the current yaps.cmd shim over a stale legacy yaps.exe", () => {
  const candidates = cliCandidates({
    platform: "win32",
    env: {
      PATH: "C:\\Users\\tester\\.local\\bin",
      PATHEXT: ".EXE;.CMD",
      ProgramFiles: "C:\\Program Files",
    },
  });
  const paths = candidates.map(({ path }) => path);
  assert.ok(paths.indexOf("C:\\Users\\tester\\.local\\bin\\yaps.cmd")
    < paths.indexOf("C:\\Users\\tester\\.local\\bin\\yaps.exe"));
});

test("Linux has one verified fixed fallback and does not scan for AppImages", () => {
  const candidates = cliCandidates({ platform: "linux", env: { HOME: "/home/tester", PATH: "" } });
  assert.deepEqual(candidates, [{ path: "/usr/bin/yaps_cli", source: "installed_app" }]);
});

test("Windows PATH shims resolve without a shell and malformed shims fail closed", () => {
  const binary = "C:\\Program Files\\Yaps\\yaps_cli.exe";
  const shim = "C:\\Users\\tester\\.local\\bin\\yaps.cmd";
  assert.equal(resolveWindowsShim(shim, {
    platform: "win32",
    canAccess: (candidate) => candidate === binary,
    statFile: () => ({ isFile: () => true, size: 128 }),
    readFile: () => `@echo off\r\n"${binary}" %*\r\n`,
  }), binary);
  assert.equal(resolveWindowsShim(shim, {
    platform: "win32",
    canAccess: () => true,
    statFile: () => ({ isFile: () => true, size: 128 }),
    readFile: () => "@echo off\r\nsomething-else %*\r\n",
  }), null);
  let reads = 0;
  assert.equal(resolveWindowsShim(shim, {
    platform: "win32",
    canAccess: () => true,
    statFile: () => ({ isFile: () => true, size: 4_097 }),
    readFile: () => { reads += 1; return `"${binary}" %*`; },
  }), null);
  assert.equal(reads, 0);
});

test("runner command detection routes official Windows cmd shims through discovery", () => {
  assert.equal(isYapsCliCommand("C:\\Users\\tester\\.local\\bin\\yaps.cmd", { platform: "win32" }), true);
  assert.equal(isYapsCliCommand("C:\\Program Files\\Yaps\\yaps_cli.exe", { platform: "win32" }), true);
  assert.equal(isYapsCliCommand("/usr/local/bin/yaps", { platform: "darwin" }), true);
  assert.equal(isYapsCliCommand("C:\\tmp\\not-yaps.cmd", { platform: "win32" }), false);
});

test("a mistaken macOS GUI binary path is rejected before any status probe", async () => {
  let probes = 0;
  const result = await resolveYapsCli({
    platform: "darwin",
    env: { HOME: "/Users/tester", PATH: "", YAPS_CLI_BINARY: "/usr/local/bin/yaps" },
    canAccess: () => true,
    canonicalize: () => "/Applications/Yaps.app/Contents/MacOS/yaps",
    probe: async () => { probes += 1; return { ok: true }; },
  });
  assert.equal(probes, 0);
  assert.equal(result.path, null);
  assert.deepEqual(result.rejected, [{ source: "override", reason: "gui_binary" }]);
});

test("the real probe accepts only Yaps status JSON and never invokes a shell", async () => {
  const root = mkdtempSync(join(tmpdir(), "yaps cli ; no-shell-"));
  const cli = join(root, "yaps_cli");
  const sentinel = join(root, "INJECTED");
  try {
    writeFileSync(cli, `#!/usr/bin/env node\nprocess.stdout.write(JSON.stringify({settings_path:"/private/settings",settings_exists:true,auth_store_path:"/private/auth",models_dir:"/private/models"}));\n`);
    chmodSync(cli, 0o755);
    assert.deepEqual(await probeYapsCli(cli, { timeoutMs: 1_000 }), { ok: true });
    assert.equal(existsSync(sentinel), false);

    writeFileSync(cli, "#!/usr/bin/env node\nprocess.stdout.write('{}');\n");
    assert.deepEqual(await probeYapsCli(cli, { timeoutMs: 1_000 }), { ok: false, reason: "invalid_status" });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the real probe terminates a hung candidate within its timeout", async () => {
  const root = mkdtempSync(join(tmpdir(), "yaps-cli-timeout-"));
  const cli = join(root, "yaps_cli");
  try {
    writeFileSync(cli, "#!/usr/bin/env node\nsetInterval(() => {}, 1000);\n");
    chmodSync(cli, 0o755);
    assert.deepEqual(await probeYapsCli(cli, { timeoutMs: 50 }), { ok: false, reason: "timeout" });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the real probe force-terminates a candidate that ignores SIGTERM", { skip: process.platform === "win32" }, async () => {
  const root = mkdtempSync(join(tmpdir(), "yaps-cli-ignore-term-"));
  const cli = join(root, "yaps_cli");
  try {
    writeFileSync(cli, "#!/bin/sh\ntrap '' TERM\nwhile :; do sleep 1; done\n");
    chmodSync(cli, 0o755);
    const started = Date.now();
    assert.deepEqual(await probeYapsCli(cli, { timeoutMs: 50 }), { ok: false, reason: "timeout" });
    assert.ok(Date.now() - started < 1_000);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("account checks are allowed only after the credential-free Yaps release", () => {
  assert.equal(authStatusSafetyForVersion("2.3.123"), "unsafe");
  assert.equal(authStatusSafetyForVersion("2.3.124"), "safe");
  assert.equal(authStatusSafetyForVersion("2.4.0"), "safe");
  assert.equal(authStatusSafetyForVersion("not-a-version"), "unknown");
});

test("installed package version discovery uses only fixed platform metadata", async () => {
  const mac = await readInstalledYapsVersion(
    { path: "/Applications/Yaps.app/Contents/MacOS/yaps_cli" },
    {
      platform: "darwin",
      canonicalize: (value) => value,
      statFile: () => ({ isFile: () => true, size: 1_024 }),
      readFile: () => "<key>CFBundleIdentifier</key><string>com.yaps.app</string><key>CFBundleShortVersionString</key><string>2.3.295</string>",
    },
  );
  assert.equal(mac, "2.3.295");

  const setapp = await readInstalledYapsVersion(
    { path: "/usr/local/bin/yaps_cli" },
    {
      platform: "darwin",
      canonicalize: () => "/Applications/Setapp/Yaps.app/Contents/MacOS/yaps_cli",
      statFile: () => ({ isFile: () => true, size: 1_024 }),
      readFile: () => "<key>CFBundleIdentifier</key><string>com.yaps.app-setapp</string><key>CFBundleShortVersionString</key><string>2.3.295</string>",
    },
  );
  assert.equal(setapp, null);

  const windowsCalls = [];
  const windows = await readInstalledYapsVersion(
    { path: "C:\\Program Files\\Yaps\\yaps_cli.exe" },
    {
      platform: "win32",
      env: { SystemRoot: "C:\\Windows" },
      canAccess: () => true,
      readText: async (command, args, env) => { windowsCalls.push({ command, args, env }); return "2.3.124.0"; },
    },
  );
  assert.equal(windows, "2.3.124");
  assert.equal(windowsCalls[0].command, "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe");
  assert.equal(windowsCalls[0].args.join(" ").includes("C:\\Program Files\\Yaps"), false);
  assert.equal(windowsCalls[0].env.YAPS_PLUGIN_VERSION_TARGET, "C:\\Program Files\\Yaps\\yaps_cli.exe");

  const linuxCalls = [];
  const linux = await readInstalledYapsVersion(
    { path: "/usr/bin/yaps_cli" },
    {
      platform: "linux",
      canonicalize: (value) => value,
      canAccess: (value) => value === "/usr/bin/dpkg-query",
      readText: async (command, args) => {
        linuxCalls.push({ command, args });
        return args[0] === "-S" ? "yaps: /usr/bin/yaps_cli" : "2.3.124-1";
      },
    },
  );
  assert.equal(linux, "2.3.124");
  assert.deepEqual(linuxCalls, [
    { command: "/usr/bin/dpkg-query", args: ["-S", "/usr/bin/yaps_cli"] },
    { command: "/usr/bin/dpkg-query", args: ["-W", "-f=${Version}", "yaps"] },
  ]);
});

test("auth status command detection ignores only known global flags", () => {
  assert.equal(isAuthStatusCommand(["auth", "status", "--pretty"]), true);
  assert.equal(isAuthStatusCommand(["--settings-path", "/safe/settings.json", "auth", "status"]), true);
  assert.equal(isAuthStatusCommand(["auth", "billing"]), false);
  assert.equal(isAuthStatusCommand(["vault", "get", "auth", "status"]), false);
});

test("an inaccessible CLI override is authoritative and never falls through", async () => {
  const probes = [];
  const result = await resolveYapsCli({
    platform: "darwin",
    env: {
      HOME: "/Users/example",
      PATH: "/healthy",
      YAPS_CLI_BINARY: "/missing/yaps_cli",
    },
    canAccess: (candidate) => candidate !== "/missing/yaps_cli",
    probe: async (candidate) => {
      probes.push(candidate);
      return { ok: true };
    },
  });
  assert.equal(result.path, null);
  assert.deepEqual(probes, []);
  assert.deepEqual(result.rejected, [{ source: "override", reason: "not_accessible" }]);
});

test("execution commands require an active desktop account while diagnosis remains available", () => {
  assert.equal(commandRequiresActiveAccount(["--help"]), false);
  assert.equal(commandRequiresActiveAccount(["vault", "--help"]), false);
  assert.equal(commandRequiresActiveAccount(["vault", "status", "-h"]), false);
  assert.equal(commandRequiresActiveAccount(["status", "--pretty"]), false);
  assert.equal(commandRequiresActiveAccount(["settings", "list"]), false);
  assert.equal(commandRequiresActiveAccount(["features", "list"]), false);
  assert.equal(commandRequiresActiveAccount(["auth", "billing"]), false);
  assert.equal(commandRequiresActiveAccount(["vault", "status"]), true);
  assert.equal(commandRequiresActiveAccount(["srt", "generate", "/tmp/audio.wav"]), true);
  assert.equal(commandRequiresActiveAccount(["features", "subtitles", "--enable"]), true);
});

test("help-only commands never wake Yaps for account recovery", async () => {
  for (const commandArguments of [["--help"], ["vault", "--help"], ["vault", "status", "-h"]]) {
    let launches = 0;
    const session = await resolveYapsSession({
      cli: { path: "/Applications/Yaps.app/Contents/MacOS/yaps_cli", source: "installed_app", rejected: [] },
      platform: "darwin",
      env: {},
      appVersion: "2.3.124",
      commandArguments,
      recoverAccount: commandRequiresActiveAccount(commandArguments),
      readAuth: async () => ({
        ok: true,
        auth: { authenticated: false, status: "verification_unavailable", diagnosticCode: "account_cache_incomplete", recommendedSettingsPath: null },
      }),
      launchApp: async () => { launches += 1; return true; },
    });
    assert.equal(launches, 0);
    assert.equal(session.appLaunchAttempted, false);
  }
});

test("account recovery automatically selects the desktop app's recommended settings", async () => {
  const calls = [];
  const session = await resolveYapsSession({
    cli: { path: "/Applications/Yaps.app/Contents/MacOS/yaps_cli", source: "installed_app", rejected: [] },
    platform: "darwin",
    env: {},
    commandArguments: ["vault", "status", "--pretty"],
    appVersion: "2.3.124",
    recoverAccount: true,
    readAuth: async (settingsPath) => {
      calls.push(settingsPath);
      return settingsPath
        ? { ok: true, auth: { authenticated: true, status: "active", diagnosticCode: null, recommendedSettingsPath: null } }
        : { ok: true, auth: { authenticated: false, status: "settings_path_mismatch", diagnosticCode: "settings_path_mismatch", recommendedSettingsPath: "/Users/tester/Library/Application Support/com.yaps.app/settings.json" } };
    },
  });
  assert.equal(session.settingsPath, "/Users/tester/Library/Application Support/com.yaps.app/settings.json");
  assert.equal(session.auth.status, "active");
  assert.deepEqual(calls, [null, session.settingsPath]);
  assert.deepEqual(
    applyResolvedSettings(["vault", "status", "--pretty"], session.settingsPath, { env: {} }),
    ["--settings-path", session.settingsPath, "vault", "status", "--pretty"],
  );
});

test("an explicit settings environment or argument remains authoritative", async () => {
  const status = { ok: true, auth: { authenticated: false, status: "settings_path_mismatch", diagnosticCode: "settings_path_mismatch", recommendedSettingsPath: "/canonical/settings.json" } };
  for (const variant of [
    { env: { YAPS_SETTINGS_PATH: "/chosen/settings.json" }, commandArguments: ["vault", "status"], expectedProbePath: null },
    { env: {}, commandArguments: ["--settings-path", "/chosen/settings.json", "vault", "status"], expectedProbePath: "/chosen/settings.json" },
    { env: {}, commandArguments: ["--settings-path=/chosen/settings.json", "vault", "status"], expectedProbePath: "/chosen/settings.json" },
  ]) {
    const calls = [];
    const session = await resolveYapsSession({
      cli: { path: "/opt/yaps_cli", source: "override", rejected: [] },
      platform: "linux",
      ...variant,
      appVersion: "2.3.124",
      recoverAccount: true,
      readAuth: async (settingsPath) => { calls.push(settingsPath); return status; },
    });
    assert.equal(session.settingsPath, null);
    assert.deepEqual(calls, [variant.expectedProbePath]);
  }
});

test("session resolution never wakes the desktop app unless the caller opts in", async () => {
  for (const commandArguments of [["vault", "status"], ["status", "--pretty"]]) {
    let launches = 0;
    const session = await resolveYapsSession({
      cli: { path: "/Applications/Yaps.app/Contents/MacOS/yaps_cli", source: "installed_app", rejected: [] },
      platform: "darwin",
      env: {},
      appVersion: "2.3.124",
      commandArguments,
      readAuth: async () => ({
        ok: true,
        auth: { authenticated: true, status: "verification_unavailable", diagnosticCode: "account_cache_incomplete", recommendedSettingsPath: null },
      }),
      launchApp: async () => { launches += 1; return true; },
    });
    assert.equal(launches, 0);
    assert.equal(session.appLaunchAttempted, false);
  }
});

test("incomplete signed-in account caches trigger one bounded app wake-up and retry", async () => {
  const calls = [];
  let launches = 0;
  const responses = [
    { ok: true, auth: { authenticated: true, status: "verification_unavailable", diagnosticCode: "account_cache_incomplete", recommendedSettingsPath: null } },
    { ok: true, auth: { authenticated: true, status: "active", diagnosticCode: null, recommendedSettingsPath: null } },
  ];
  const session = await resolveYapsSession({
    cli: { path: "/Applications/Yaps.app/Contents/MacOS/yaps_cli", source: "installed_app", rejected: [] },
    platform: "darwin",
    env: {},
    appVersion: "2.3.124",
    recoverAccount: true,
    readAuth: async (settingsPath, timeoutMs) => {
      calls.push({ settingsPath, timeoutMs });
      return responses.shift();
    },
    launchApp: async () => { launches += 1; return true; },
    sleep: async () => {},
    now: () => 0,
  });
  assert.equal(launches, 1);
  assert.equal(calls.length, 2);
  assert.equal(session.appLaunchAttempted, true);
  assert.equal(session.appLaunchSucceeded, true);
  assert.equal(session.auth.status, "active");
});

test("unsigned-in, expired, and mobile-only accounts never auto-launch the app", async () => {
  for (const status of ["unauthenticated", "expired", "platform_mismatch"]) {
    let launches = 0;
    const session = await resolveYapsSession({
      cli: { path: "/Applications/Yaps.app/Contents/MacOS/yaps_cli", source: "installed_app", rejected: [] },
      platform: "darwin",
      env: {},
      appVersion: "2.3.124",
      recoverAccount: true,
      readAuth: async () => ({ ok: true, auth: { authenticated: status !== "unauthenticated", status, diagnosticCode: null, recommendedSettingsPath: null } }),
      launchApp: async () => { launches += 1; return true; },
    });
    assert.equal(launches, 0);
    assert.equal(session.appLaunchAttempted, false);
  }
});

test("old and unverifiable CLIs never execute the legacy credential-based account check", async () => {
  for (const appVersion of ["2.3.123", null]) {
    let authReads = 0;
    let launches = 0;
    const session = await resolveYapsSession({
      cli: { path: "/Applications/Yaps.app/Contents/MacOS/yaps_cli", source: "installed_app", rejected: [] },
      platform: "darwin",
      env: {},
      appVersion: appVersion || undefined,
      readAppVersion: async () => appVersion,
      readAuth: async () => { authReads += 1; return { ok: false }; },
      launchApp: async () => { launches += 1; return true; },
    });
    assert.equal(authReads, 0);
    assert.equal(launches, 0);
    assert.equal(session.auth, null);
    assert.equal(session.authStatusSafety, appVersion ? "unsafe" : "unknown");
  }
});

test("a Setapp PATH symlink is diagnosed without reading account credentials", async () => {
  let authReads = 0;
  const session = await resolveYapsSession({
    cli: { path: "/usr/local/bin/yaps", source: "path", rejected: [] },
    platform: "darwin",
    env: { HOME: "/Users/tester" },
    canonicalize: () => "/Applications/Setapp/Yaps.app/Contents/MacOS/yaps_cli",
    readAuth: async () => { authReads += 1; return { ok: false }; },
  });
  assert.equal(authReads, 0);
  assert.equal(session.installationVariant, "setapp");
  const diagnosis = diagnoseAccount(session);
  assert.equal(diagnosis.code, "setapp_unsupported");
  assert.match(diagnosis.message, /Setapp edition/i);
});

test("installed-app wake-up uses fixed platform paths without a shell", async () => {
  const calls = [];
  const spawnImpl = (command, args, options) => {
    calls.push({ command, args, options });
    const child = new EventEmitter();
    child.kill = () => {};
    child.unref = () => {};
    queueMicrotask(() => {
      child.emit("spawn");
      if (!options.detached) child.emit("close", 0, null);
    });
    return child;
  };
  assert.equal(await launchInstalledYaps(
    { path: "/Applications/Yaps.app/Contents/MacOS/yaps_cli" },
    { platform: "darwin", pathExists: () => true, spawnImpl },
  ), true);
  assert.deepEqual(calls[0].command, "/usr/bin/open");
  assert.deepEqual(calls[0].args, ["-g", "/Applications/Yaps.app"]);
  assert.equal("shell" in calls[0].options, false);

  assert.equal(await launchInstalledYaps(
    { path: "/usr/local/bin/yaps_cli" },
    {
      platform: "darwin",
      canonicalize: () => "/Applications/Yaps.app/Contents/MacOS/yaps_cli",
      pathExists: () => true,
      spawnImpl,
    },
  ), true);
  assert.deepEqual(calls[1].args, ["-g", "/Applications/Yaps.app"]);

  assert.equal(await launchInstalledYaps(
    { path: "C:\\Program Files\\Yaps\\yaps_cli.exe" },
    {
      platform: "win32",
      env: { ProgramFiles: "C:\\Program Files" },
      canonicalize: (value) => value,
      canAccess: (path) => path === "C:\\Program Files\\Yaps\\Yaps.exe",
      spawnImpl,
    },
  ), true);
  assert.equal(calls[2].command, "C:\\Program Files\\Yaps\\Yaps.exe");
  assert.deepEqual(calls[2].args, []);

  assert.equal(await launchInstalledYaps(
    { path: "/usr/bin/yaps_cli" },
    { platform: "linux", canAccess: () => true, spawnImpl },
  ), true);
  assert.equal(calls[3].command, "/usr/bin/yaps");
  assert.deepEqual(calls[3].args, []);
  assert.equal(calls[3].options.detached, true);
  assert.equal("shell" in calls[3].options, false);

  for (const [platform, path, options] of [
    ["darwin", "/tmp/Yaps.app/Contents/MacOS/yaps_cli", { pathExists: () => true }],
    ["win32", "C:\\tmp\\Yaps\\yaps_cli.exe", { env: { ProgramFiles: "C:\\Program Files" }, canAccess: () => true }],
    ["linux", "/tmp/yaps_cli", { canAccess: () => true }],
  ]) {
    assert.equal(await launchInstalledYaps(
      { path },
      { platform, canonicalize: (value) => value, spawnImpl, ...options },
    ), false);
  }
  assert.equal(calls.length, 4);
});

test("macOS launch success requires the fixed open command to exit successfully", async () => {
  const spawnImpl = () => {
    const child = new EventEmitter();
    child.kill = () => {};
    queueMicrotask(() => {
      child.emit("spawn");
      child.emit("close", 1, null);
    });
    return child;
  };
  assert.equal(await launchInstalledYaps(
    { path: "/Applications/Yaps.app/Contents/MacOS/yaps_cli" },
    { platform: "darwin", canonicalize: (value) => value, pathExists: () => true, spawnImpl },
  ), false);
});

test("auth status parsing exposes no account identifiers or credentials", async () => {
  const root = mkdtempSync(join(tmpdir(), "yaps-auth-status-"));
  const cli = join(root, "yaps_cli");
  try {
    writeFileSync(cli, `#!${process.execPath}\nprocess.stdout.write(JSON.stringify({authenticated:true,status:"active",email:"private@example.com",credential:"secret"}));\n`);
    chmodSync(cli, 0o755);
    const result = await readYapsAuthStatus(cli, { timeoutMs: 5_000 });
    assert.deepEqual(result, {
      ok: true,
      auth: { authenticated: true, status: "active", diagnosticCode: null, recommendedSettingsPath: null },
    });
    assert.doesNotMatch(JSON.stringify(result), /private@example|secret/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("account diagnosis distinguishes signed-out, paid/trial expiry, and cache recovery", () => {
  assert.equal(diagnoseAccount({ auth: { authenticated: true, status: "active" } }).code, "ready");
  assert.match(diagnoseAccount({ auth: { authenticated: true, status: "expired" } }).message, /trial or Yaps Pro/i);
  assert.match(diagnoseAccount({ auth: { authenticated: true, status: "platform_mismatch" } }).message, /mobile access/i);
  assert.match(diagnoseAccount({ auth: { authenticated: false, status: "unauthenticated" } }).message, /no separate connection/i);
  assert.match(diagnoseAccount({ auth: { authenticated: true, status: "future_state" } }).message, /does not recognize/i);
  assert.match(diagnoseAccount({ auth: { authenticated: true, status: "credential_unavailable", diagnosticCode: "keychain_unavailable" } }).message, /Update Yaps/i);
  const incomplete = diagnoseAccount({
    auth: { authenticated: true, status: "verification_unavailable", diagnosticCode: "account_cache_incomplete" },
    appLaunchAttempted: true,
    appLaunchSucceeded: true,
  });
  assert.equal(incomplete.code, "account_cache_incomplete");
  assert.match(incomplete.message, /opened.*automatically/i);
  const failedLaunch = diagnoseAccount({
    auth: { authenticated: true, status: "verification_unavailable", diagnosticCode: "account_cache_incomplete" },
    appLaunchAttempted: true,
    appLaunchSucceeded: false,
  });
  assert.doesNotMatch(failedLaunch.message, /opened.*automatically/i);
  assert.match(failedLaunch.message, /could not safely open/i);
  const notAttempted = diagnoseAccount({
    auth: { authenticated: true, status: "verification_unavailable", diagnosticCode: "account_cache_incomplete" },
    appLaunchAttempted: false,
    appLaunchSucceeded: false,
  });
  assert.doesNotMatch(notAttempted.message, /opened|could not safely open/i);
  assert.equal(diagnoseAccount({ appVersion: "2.3.123", authStatusSafety: "unsafe", auth: null }).code, "account_status_unsafe");
});

test("diagnosis distinguishes CLI discovery from the private-vault connector", () => {
  const missing = diagnoseConnection({ cli: { path: null, rejected: [] } });
  assert.equal(missing.code, "cli_missing");
  assert.match(missing.message, /included with Yaps/i);
  assert.match(missing.message, /no separate CLI or PATH setup/i);
  const missingFailure = classifyCliResolutionFailure({ path: null, rejected: [] });
  assert.equal(missingFailure.code, "local_yaps_unreachable");
  assert.equal(missingFailure.exitCode, 127);

  const invalid = diagnoseConnection({ cli: { path: null, rejected: [{ source: "override", reason: "invalid_status" }] } });
  assert.equal(invalid.code, "cli_invalid");
  assert.match(invalid.message, /YAPS_CLI_BINARY/);
  const invalidFailure = classifyCliResolutionFailure({ path: null, rejected: [{ source: "override", reason: "invalid_status" }] });
  assert.equal(invalidFailure.code, "local_yaps_unreachable");
  assert.equal(invalidFailure.exitCode, 127);

  const leftoverOnly = diagnoseConnection({
    cli: { path: null, rejected: [{ source: "installed_app", reason: "stale_cli" }] },
  });
  assert.equal(leftoverOnly.code, "account_status_unsafe");
  assert.notEqual(leftoverOnly.code, "cli_missing");
  assert.notEqual(leftoverOnly.code, "cli_invalid");
  const leftoverFailure = classifyCliResolutionFailure({
    path: null,
    rejected: [{ source: "installed_app", reason: "stale_cli" }],
  });
  assert.equal(leftoverFailure.code, "account_status_unsafe");
  assert.equal(leftoverFailure.exitCode, 78);
  assert.notEqual(leftoverFailure.code, "local_yaps_unreachable");

  const connector = diagnoseConnection({ cli: { path: "/Applications/Yaps.app/Contents/MacOS/yaps_cli" }, connector: { path: null }, needsConnector: true });
  assert.equal(connector.code, "vault_connector_unavailable");
  assert.match(connector.message, /CLI is installed and working/i);
  assert.match(connector.message, /private-vault connector is unavailable/i);
});

test("all shipped plugin copies are generated from the shared runtime", () => {
  const shared = readFileSync(join(pluginsRoot, "shared", "yaps-cli-discovery.mjs"), "utf8");
  const standaloneBundle = join(pluginsRoot, "..", "extensions", "yaps-mcp", "bundle", "server", "yaps-cli-discovery.js");
  if (existsSync(standaloneBundle)) {
    assert.equal(
      readFileSync(standaloneBundle, "utf8"),
      shared,
      "standalone MCP bundle discovery drifted",
    );
  }
  const referenceRunner = readFileSync(join(pluginsRoot, "yaps-memory", "scripts", "yaps-plugin-runner.mjs"), "utf8");
  for (const relative of [
    "mcpb/yaps/server/yaps-cli-discovery.mjs",
    "mcpb/yaps-memory/server/yaps-cli-discovery.mjs",
    "cursor/yaps/helper/yaps-cli-discovery.mjs",
  ]) {
    assert.equal(readFileSync(join(pluginsRoot, relative), "utf8"), shared, `${relative} discovery drifted`);
  }
  for (const candidate of connectorCandidates({ platform: "linux", env: { PATH: "" } })) {
    assert.equal(candidate.path, "/usr/bin/yaps_mcp");
  }
  for (const entry of readdirSync(pluginsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith("yaps-")) continue;
    assert.equal(readFileSync(join(pluginsRoot, entry.name, "scripts", "yaps-cli-discovery.mjs"), "utf8"), shared, `${entry.name} discovery drifted`);
    assert.equal(readFileSync(join(pluginsRoot, entry.name, "scripts", "yaps-plugin-runner.mjs"), "utf8"), referenceRunner, `${entry.name} runner drifted`);
  }
});
