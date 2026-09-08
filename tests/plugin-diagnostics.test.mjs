import assert from "node:assert/strict";
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runner = join(repositoryRoot, "yaps-dictation", "scripts", "yaps-plugin-runner.mjs");
const ownerKey = "a".repeat(64);

function run(root, action, script, { host = "codex_plugin", runnerPath = runner } = {}) {
  return spawnSync(
    process.execPath,
    [runnerPath, "--action", action, "--stage", "execution", "--", process.execPath, "-e", script],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        YAPS_PLUGIN_DIAGNOSTICS_DIR: root,
        YAPS_PLUGIN_HOST: host,
      },
    },
  );
}

function events(root) {
  const inbox = join(root, "inbox");
  return readdirSync(inbox)
    .filter((name) => name.endsWith(".json"))
    .map((name) => JSON.parse(readFileSync(join(inbox, name), "utf8")));
}

test("runner records only reviewed metadata for attempts and outcomes", () => {
  const root = mkdtempSync(join(tmpdir(), "yaps-plugin-diagnostics-"));
  try {
    writeFileSync(join(root, "owner.json"), JSON.stringify({ schema_version: 1, owner_key: ownerKey }));
    const secret = "PRIVATE_COMMAND_ARGUMENT_AND_OUTPUT";
    const result = run(root, "dictation.test", `process.stdout.write(${JSON.stringify(secret)})`);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, secret);

    const recorded = events(root).sort((left, right) => left.status.localeCompare(right.status));
    assert.equal(recorded.length, 2);
    assert.deepEqual(new Set(recorded.map((event) => event.status)), new Set(["attempt", "success"]));
    assert.equal(recorded[0].operation_id, recorded[1].operation_id);
    for (const event of recorded) {
      assert.equal(event.plugin_id, "yaps-dictation");
      assert.equal(event.integration_host, "codex_plugin");
      assert.equal(event.owner_key, ownerKey);
      assert.equal(JSON.stringify(event).includes(secret), false);
      assert.deepEqual(
        Object.keys(event).sort(),
        [
          "duration_ms",
          "event_id",
          "integration_host",
          "integration_transport",
          "occurred_at",
          "operation_id",
          "owner_key",
          "plugin_action",
          "plugin_id",
          "plugin_version",
          "schema_version",
          "stage",
          "status",
        ].filter((key) => key !== "duration_ms" || event.status !== "attempt").sort(),
      );
    }

    const failure = run(root, "auth.test", "process.stderr.write('unauthenticated'); process.exit(4)");
    assert.equal(failure.status, 4);
    const failedEvent = events(root).find((event) => event.plugin_action === "auth.test" && event.status === "failure");
    assert.equal(failedEvent.error_code, "unauthenticated");
    assert.equal(JSON.stringify(failedEvent).includes("process.stderr"), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function writeSessionDiscovery(scripts, resolveBody) {
  writeFileSync(
    join(scripts, "yaps-cli-discovery.mjs"),
    `
import {
  applyResolvedSettings,
  classifyCliResolutionFailure,
  commandRequiresActiveAccount,
  diagnoseAccount,
  diagnoseConnection,
  isYapsCliCommand,
  isAuthStatusCommand,
  resolveYapsSession as resolveRealYapsSession,
} from ${JSON.stringify(join(repositoryRoot, "shared", "yaps-cli-discovery.mjs"))};

export {
  applyResolvedSettings,
  classifyCliResolutionFailure,
  commandRequiresActiveAccount,
  diagnoseAccount,
  diagnoseConnection,
  isYapsCliCommand,
  isAuthStatusCommand,
};

export async function resolveYapsSession() {
  ${resolveBody}
}
export { resolveRealYapsSession };
`,
  );
}

function stagedDictationRunner(root) {
  const pluginRoot = join(root, "yaps-dictation");
  const scripts = join(pluginRoot, "scripts");
  mkdirSync(join(pluginRoot, ".codex-plugin"), { recursive: true });
  mkdirSync(scripts, { recursive: true });
  writeFileSync(
    join(pluginRoot, ".codex-plugin", "plugin.json"),
    JSON.stringify({ name: "yaps-dictation", version: "0.1.9" }),
  );
  copyFileSync(runner, join(scripts, "yaps-plugin-runner.mjs"));
  return { scripts, runnerPath: join(scripts, "yaps-plugin-runner.mjs") };
}

function runYapsCommand(root, runnerPath, action, command, extraEnv = {}) {
  const env = {
    ...process.env,
    PATH: "",
    YAPS_PLUGIN_DIAGNOSTICS_DIR: root,
    YAPS_PLUGIN_HOST: "codex_plugin",
    HOME: root,
    ...extraEnv,
  };
  delete env.YAPS_CLI_BINARY;
  delete env.YAPS_INSTALL_DIR;
  return spawnSync(
    process.execPath,
    [runnerPath, "--action", action, "--stage", "execution", "--", ...command],
    { encoding: "utf8", env },
  );
}

test("yaps-dictation runner leftover-only stale_cli records account_status_unsafe and exits 78", () => {
  const root = mkdtempSync(join(tmpdir(), "yaps-dictation-stale-runner-"));
  try {
    writeFileSync(join(root, "owner.json"), JSON.stringify({ schema_version: 1, owner_key: ownerKey }));
    const { scripts, runnerPath } = stagedDictationRunner(root);
    writeSessionDiscovery(
      scripts,
      `return resolveRealYapsSession({
        platform: "win32",
        env: { USERPROFILE: "C:\\\\Users\\\\tester", PATH: "", ProgramFiles: "C:\\\\Program Files" },
        runningExecutables: [],
        canAccess: (candidate) => candidate === "C:\\\\Program Files\\\\Yaps\\\\yaps_cli.exe",
        probe: async () => ({ ok: true }),
        readAppVersion: async () => "2.1.4",
      });`,
    );
    const result = runYapsCommand(root, runnerPath, "dictation.status", ["yaps", "status", "--pretty"]);
    assert.equal(result.status, 78, result.stderr);
    assert.match(result.stderr, /2\.1\.4|2\.3\.124/i);
    assert.doesNotMatch(result.stderr, /local_yaps_unreachable|cli_missing|cli_invalid/);
    const failed = events(root).find((event) => event.status === "failure");
    assert.equal(failed?.plugin_id, "yaps-dictation");
    assert.equal(failed?.error_code, "account_status_unsafe");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("yaps-dictation runner miss with no stale helper records local_yaps_unreachable and exits 127", () => {
  const root = mkdtempSync(join(tmpdir(), "yaps-dictation-miss-runner-"));
  try {
    writeFileSync(join(root, "owner.json"), JSON.stringify({ schema_version: 1, owner_key: ownerKey }));
    const result = runYapsCommand(root, runner, "dictation.status", ["yaps", "status", "--pretty"]);
    assert.equal(result.status, 127, result.stderr);
    assert.match(result.stderr, /could not be found|included with Yaps/i);
    assert.doesNotMatch(result.stderr, /account_status_unsafe|2\.3\.124/);
    const failed = events(root).find((event) => event.status === "failure");
    assert.equal(failed?.plugin_id, "yaps-dictation");
    assert.equal(failed?.error_code, "local_yaps_unreachable");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runner records the manifest version for the active host", () => {
  const pluginRoot = join(repositoryRoot, "yaps-auto-captions");
  const runnerPath = join(pluginRoot, "scripts", "yaps-plugin-runner.mjs");
  for (const [host, expectedVersion] of [["codex_plugin", "0.1.9"], ["claude_code", "0.1.12"]]) {
    const root = mkdtempSync(join(tmpdir(), `yaps-plugin-${host}-`));
    try {
      writeFileSync(join(root, "owner.json"), JSON.stringify({ schema_version: 1, owner_key: ownerKey }));
      const result = run(root, "identity.test", "process.exit(0)", { host, runnerPath });
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(new Set(events(root).map((event) => event.plugin_version)), new Set([expectedVersion]));
      assert.deepEqual(new Set(events(root).map((event) => event.integration_host)), new Set([host]));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("runner fails closed when Yaps has not supplied an owner marker", () => {
  const root = mkdtempSync(join(tmpdir(), "yaps-plugin-diagnostics-unowned-"));
  try {
    const result = run(root, "dictation.test", "process.exit(0)");
    assert.equal(result.status, 0);
    assert.equal(readdirSync(root).length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runner applies automatic settings recovery without exposing auth data", () => {
  const root = mkdtempSync(join(tmpdir(), "yaps-plugin-session-"));
  const application = join(root, "Yaps.app");
  const cli = join(application, "Contents", "MacOS", "yaps_cli");
  const invocation = join(root, "invocation.json");
  const canonicalSettings = join(root, "canonical settings", "settings.json");
  try {
    mkdirSync(join(application, "Contents", "MacOS"), { recursive: true });
    writeFileSync(join(application, "Contents", "Info.plist"), "<key>CFBundleIdentifier</key><string>com.yaps.app</string><key>CFBundleShortVersionString</key><string>2.3.124</string>");
    writeFileSync(cli, `#!${process.execPath}
const { writeFileSync } = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "status") {
  process.stdout.write(JSON.stringify({settings_path:"/default/settings.json",settings_exists:true,auth_store_path:"/default/auth.json",models_dir:"/default/models"}));
} else if (args.includes("auth") && args.includes("status")) {
  const selected = args.includes("--settings-path");
  process.stdout.write(JSON.stringify(selected
    ? {authenticated:true,status:"active",email:"private@example.com",credential:"never-print"}
    : {authenticated:false,status:"settings_path_mismatch",diagnostic_code:"settings_path_mismatch",recommended_settings_path:process.env.YAPS_TEST_CANONICAL_SETTINGS,email:"private@example.com",credential:"never-print"}));
} else {
  writeFileSync(process.env.YAPS_TEST_INVOCATION, JSON.stringify(args));
  process.stdout.write(JSON.stringify({ok:true}));
}
`);
    chmodSync(cli, 0o755);
    const result = spawnSync(
      process.execPath,
      [runner, "--action", "vault.status", "--stage", "execution", "--", "yaps", "vault", "status", "--pretty"],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: "",
          YAPS_CLI_BINARY: cli,
          YAPS_PLUGIN_DIAGNOSTICS_DIR: root,
          YAPS_SETTINGS_PATH: "",
          YAPS_TEST_CANONICAL_SETTINGS: canonicalSettings,
          YAPS_TEST_INVOCATION: invocation,
        },
      },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, JSON.stringify({ ok: true }));
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, /private@example|never-print/);
    assert.deepEqual(JSON.parse(readFileSync(invocation, "utf8")), [
      "--settings-path",
      canonicalSettings,
      "vault",
      "status",
      "--pretty",
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runner flexes trial, Yaps Pro, and inactive desktop account states safely", () => {
  const root = mkdtempSync(join(tmpdir(), "yaps-plugin-account-gate-"));
  const application = join(root, "Yaps.app");
  const cli = join(application, "Contents", "MacOS", "yaps_cli");
  const invocation = join(root, "feature-invocation.txt");
  const authLog = join(root, "auth-invocation.log");
  try {
    mkdirSync(join(application, "Contents", "MacOS"), { recursive: true });
    writeFileSync(join(application, "Contents", "Info.plist"), "<key>CFBundleIdentifier</key><string>com.yaps.app</string><key>CFBundleShortVersionString</key><string>2.3.124</string>");
    writeFileSync(cli, `#!${process.execPath}
const { appendFileSync, writeFileSync } = require("node:fs");
const args = process.argv.slice(2);
if (args[0] === "status") {
  process.stdout.write(JSON.stringify({settings_path:"/settings",settings_exists:true,auth_store_path:"/auth",models_dir:"/models"}));
} else if (args.includes("auth") && args.includes("status")) {
  appendFileSync(process.env.YAPS_TEST_AUTH_LOG, "auth-status\\n");
  const status = process.env.YAPS_TEST_ACCOUNT_STATUS || "expired";
  const authenticated = !["signed_out", "unauthenticated", "verification_unavailable"].includes(status);
  process.stdout.write(JSON.stringify({authenticated,status,access_source:process.env.YAPS_TEST_ACCESS_KIND || null,email:"private@example.com",credential:"never-print"}));
} else {
  writeFileSync(process.env.YAPS_TEST_INVOCATION, args.join(" "));
  process.stdout.write(JSON.stringify({ok:true}));
}
`);
    chmodSync(cli, 0o755);
    const environment = {
      ...process.env,
      PATH: "",
      YAPS_CLI_BINARY: cli,
      YAPS_PLUGIN_DIAGNOSTICS_DIR: root,
      YAPS_SETTINGS_PATH: "",
      YAPS_TEST_AUTH_LOG: authLog,
      YAPS_TEST_INVOCATION: invocation,
    };
    const gated = spawnSync(
      process.execPath,
      [runner, "--action", "vault.status", "--stage", "execution", "--", "yaps", "vault", "status", "--pretty"],
      { encoding: "utf8", env: environment },
    );
    assert.equal(gated.status, 77, gated.stderr);
    assert.match(gated.stderr, /trial or Yaps Pro access is not active/i);
    assert.equal(existsSync(invocation), false);
    assert.doesNotMatch(gated.stderr, /private@example|never-print/);
    assert.equal(readFileSync(authLog, "utf8").trim().split(/\n/).length, 1);

    const status = spawnSync(
      process.execPath,
      [runner, "--action", "auth.status", "--stage", "authentication", "--", "yaps", "auth", "status", "--pretty"],
      { encoding: "utf8", env: environment },
    );
    assert.equal(status.status, 0, status.stderr);
    assert.deepEqual(JSON.parse(status.stdout), {
      authenticated: true,
      status: "expired",
      diagnostic_code: null,
      credential_status: "not_accessed",
    });
    assert.equal(readFileSync(authLog, "utf8").trim().split(/\n/).length, 2);
    assert.doesNotMatch(status.stdout, /private@example|never-print/);

    for (const accessKind of ["trial", "yaps_pro"]) {
      rmSync(invocation, { force: true });
      const allowed = spawnSync(
        process.execPath,
        [runner, "--action", `vault.${accessKind}`, "--stage", "execution", "--", "yaps", "vault", "status", "--pretty"],
        {
          encoding: "utf8",
          env: {
            ...environment,
            YAPS_TEST_ACCOUNT_STATUS: "active",
            YAPS_TEST_ACCESS_KIND: accessKind,
          },
        },
      );
      assert.equal(allowed.status, 0, allowed.stderr);
      assert.equal(existsSync(invocation), true);
      assert.doesNotMatch(`${allowed.stdout}${allowed.stderr}`, /private@example|never-print|access_source|yaps_pro/);
    }

    for (const [accountStatus, expectedGuidance] of [
      ["signed_out", /no active desktop account is signed in/i],
      ["expired", /trial or Yaps Pro access is not active/i],
      ["platform_mismatch", /only has mobile access/i],
      ["verification_unavailable", /could not verify current trial or Yaps Pro access/i],
      ["unexpected_future_state", /does not recognize/i],
    ]) {
      rmSync(invocation, { force: true });
      const denied = spawnSync(
        process.execPath,
        [runner, "--action", `vault.${accountStatus}`, "--stage", "execution", "--", "yaps", "vault", "status", "--pretty"],
        {
          encoding: "utf8",
          env: { ...environment, YAPS_TEST_ACCOUNT_STATUS: accountStatus },
        },
      );
      assert.equal(denied.status, 77, denied.stderr);
      assert.match(denied.stderr, expectedGuidance);
      assert.equal(existsSync(invocation), false);
      assert.doesNotMatch(`${denied.stdout}${denied.stderr}`, /private@example|never-print/);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
