import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import { extname, resolve } from "node:path";
import {
  applyResolvedSettings,
  diagnoseAccount,
  diagnoseConnection,
  resolveYapsSession,
} from "./yaps-cli-discovery.mjs";

export const DEFAULT_CLI_TIMEOUT_MS = 5 * 60 * 1000;
export const LONG_CLI_TIMEOUT_MS = 30 * 60 * 1000;
export const MEETING_AI_MIN_VERSION = "2.3.848";
const MAX_STDOUT_BYTES = 10_000_000;
const MAX_STDERR_BYTES = 1_000_000;

export const VIDEO_EXTENSIONS = new Set([
  ".3gp",
  ".avi",
  ".flv",
  ".m2ts",
  ".m4v",
  ".mkv",
  ".mov",
  ".mp4",
  ".mpeg",
  ".mpg",
  ".mts",
  ".ts",
  ".webm",
  ".wmv",
]);

/**
 * Error carrying a stable machine-readable code plus a user-safe message.
 * Every message routed through this class is either a Yaps-authored guidance
 * string, a CLI stdout-coded product error, or text this server composed —
 * never raw stderr and never a machine path the user did not supply.
 */
export class YapsToolError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "YapsToolError";
    this.code = code;
  }
}

export function textResult(value, isError = false) {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
    ...(isError ? { isError: true } : {}),
  };
}

export function failure(code, message) {
  return textResult({ ok: false, code, message }, true);
}

export function success(value) {
  return textResult(value);
}

function terminateProcess(child) {
  try { child.stdout?.destroy(); } catch {}
  try { child.stderr?.destroy(); } catch {}
  try { child.kill("SIGTERM"); } catch {}
  const force = setTimeout(() => {
    if (child.exitCode == null && child.signalCode == null) {
      try { child.kill("SIGKILL"); } catch {}
    }
  }, 100);
  force.unref?.();
  child.once?.("close", () => clearTimeout(force));
}

function normalizedVersionParts(value) {
  const match = typeof value === "string"
    ? value.trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:\D|$)/)
    : null;
  if (!match) return null;
  const parts = match.slice(1).map(Number);
  return parts.some((part) => !Number.isSafeInteger(part)) ? null : parts;
}

export function versionAtLeast(installed, minimum) {
  const left = normalizedVersionParts(installed);
  const right = normalizedVersionParts(minimum);
  if (!left || !right) return false;
  for (let index = 0; index < right.length; index += 1) {
    if (left[index] > right[index]) return true;
    if (left[index] < right[index]) return false;
  }
  return true;
}

/**
 * Process-wide session cache. The CLI and auth session resolve lazily on the
 * first tool call, then stay cached; an auth-gated failure re-resolves once
 * before giving up so a user who just signed in inside Yaps is picked up
 * without restarting the extension.
 */
let cachedSessionPromise = null;

export function resetSessionCache() {
  cachedSessionPromise = null;
}

export async function getSession({ refresh = false } = {}) {
  if (refresh || !cachedSessionPromise) {
    cachedSessionPromise = resolveYapsSession({ recoverAccount: true }).catch((error) => {
      cachedSessionPromise = null;
      throw error;
    });
  }
  return cachedSessionPromise;
}

/**
 * Diagnose reachability + account state without throwing. Used by the tools
 * that must keep working while signed out (yaps_status, dictation_status).
 */
export async function diagnoseSession({ refresh = false } = {}) {
  const session = await getSession({ refresh });
  const connection = diagnoseConnection({ cli: session });
  const account = connection.code === "ready"
    ? diagnoseAccount(session)
    : null;
  return { session, connection, account };
}

/**
 * Require a reachable CLI. Throws a YapsToolError carrying the exact
 * discovery guidance string when Yaps cannot be found.
 */
export async function requireCli() {
  let { session, connection } = await diagnoseSession();
  if (connection.code !== "ready") {
    ({ session, connection } = await diagnoseSession({ refresh: true }));
  }
  if (connection.code !== "ready") {
    throw new YapsToolError(connection.code, connection.message);
  }
  return session;
}

/**
 * Require a reachable CLI plus an active signed-in account. Account-gated
 * failures re-resolve the session once (with app wake + recovery) before the
 * blueprint's exact guidance string is returned.
 */
export async function requireActiveAccount() {
  const session = await requireCli();
  let account = diagnoseAccount(session);
  if (account.code === "ready") return session;
  const fresh = await getSession({ refresh: true });
  const freshConnection = diagnoseConnection({ cli: fresh });
  if (freshConnection.code !== "ready") {
    throw new YapsToolError(freshConnection.code, freshConnection.message);
  }
  account = diagnoseAccount(fresh);
  if (account.code === "ready") return fresh;
  throw new YapsToolError(account.code, account.message);
}

export async function requireMeetingAiSupport(session) {
  if (versionAtLeast(session.appVersion, MEETING_AI_MIN_VERSION)) return;
  throw new YapsToolError(
    "meeting_ai_requires_update",
    `This tool needs the Yaps meeting AI commands, which arrived in Yaps ${MEETING_AI_MIN_VERSION}. `
      + `The installed Yaps app reports version ${session.appVersion || "unknown"}. `
      + "Update Yaps from https://yaps.ai/download, open it once, and retry. "
      + "Meeting transcription, editing, and export still work on the installed version.",
  );
}

/**
 * Run one yaps_cli command with the resolved session and return its parsed
 * JSON stdout. Coded CLI failures ({error, error_code} on stdout) surface as
 * YapsToolError with the product-authored message; uncoded failures surface
 * as a composed message that never includes raw stderr.
 */
export function runCli(session, args, {
  timeoutMs = DEFAULT_CLI_TIMEOUT_MS,
  label = "command",
  spawnProcess = spawn,
} = {}) {
  const fullArgs = applyResolvedSettings(["--pretty", ...args], session.settingsPath);
  return new Promise((resolvePromise, reject) => {
    let child;
    try {
      child = spawnProcess(session.path, fullArgs, {
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
    } catch {
      reject(new YapsToolError(
        "cli_launch_failed",
        "The Yaps CLI could not be started. Update or reinstall Yaps from https://yaps.ai/download, open it once, and retry.",
      ));
      return;
    }
    let stdout = "";
    let stderrBytes = 0;
    let settled = false;
    const finishError = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    };
    const timer = setTimeout(() => {
      terminateProcess(child);
      finishError(new YapsToolError(
        "timeout",
        `Yaps did not finish this ${label} within ${Math.round(timeoutMs / 60000)} minutes. `
          + "Very long media can exceed the limit; try a shorter file or run the job inside the Yaps app.",
      ));
    }, timeoutMs);

    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
      if (stdout.length > MAX_STDOUT_BYTES && !settled) {
        terminateProcess(child);
        finishError(new YapsToolError("output_too_large", "Yaps returned more output than this tool can relay."));
      }
    });
    // Stderr is consumed and counted but deliberately never surfaced: it can
    // contain machine paths and engine internals. Coded product errors arrive
    // on stdout instead.
    child.stderr?.on("data", (chunk) => {
      stderrBytes += chunk.length;
      if (stderrBytes > MAX_STDERR_BYTES && !settled) {
        terminateProcess(child);
        finishError(new YapsToolError("output_too_large", "Yaps returned more diagnostics than this tool can relay."));
      }
    });
    child.on("error", () => finishError(new YapsToolError(
      "cli_launch_failed",
      "The Yaps CLI could not be started. Update or reinstall Yaps from https://yaps.ai/download, open it once, and retry.",
    )));
    child.on("close", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      let parsed;
      try {
        parsed = JSON.parse(stdout);
      } catch {
        parsed = undefined;
      }
      if (signal || code !== 0) {
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)
          && typeof parsed.error === "string") {
          reject(new YapsToolError(
            typeof parsed.error_code === "string" && parsed.error_code ? parsed.error_code : "cli_error",
            parsed.error,
          ));
          return;
        }
        reject(new YapsToolError(
          "cli_error",
          `Yaps could not complete this ${label} (exit code ${code ?? "unknown"}). `
            + "Open the Yaps app, confirm the feature is installed and the account is active, then retry. "
            + "The yaps_status tool reports the exact readiness state.",
        ));
        return;
      }
      if (!parsed || typeof parsed !== "object") {
        reject(new YapsToolError("invalid_cli_output", "Yaps returned an unexpected response. Update Yaps and retry."));
        return;
      }
      // `captions styles` is the one command returning a top-level array.
      resolvePromise(Array.isArray(parsed) ? { items: parsed } : parsed);
    });
  });
}

/** Run a command that needs an active account, refreshing the session once on auth-gated failure. */
export async function runAccountCli(args, options = {}) {
  const session = await requireActiveAccount();
  return { session, result: await runCli(session, args, options) };
}

export async function requireExistingFile(pathValue, { label = "file", extensions } = {}) {
  if (typeof pathValue !== "string" || !pathValue.trim()) {
    throw new YapsToolError("invalid_input", `An absolute path to the ${label} is required.`);
  }
  const path = resolve(pathValue.trim());
  const details = await stat(path).catch(() => undefined);
  if (!details?.isFile()) {
    throw new YapsToolError("source_not_found", `The ${label} was not found: ${path}`);
  }
  if (extensions && !extensions.has(extname(path).toLowerCase())) {
    throw new YapsToolError(
      "unsupported_source_type",
      `Unsupported ${label} type: ${extname(path) || "(no extension)"}`,
    );
  }
  return path;
}

export async function pathExists(pathValue) {
  try {
    await access(pathValue, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Pre-check an output destination. When the target exists and the caller did
 * not explicitly opt into overwriting, refuse with a clear message instead of
 * letting the job run and fail (or clobber) later.
 */
export async function requireWritableOutput(pathValue, { overwrite = false, expectedExtension } = {}) {
  const path = resolve(pathValue);
  if (expectedExtension && extname(path).toLowerCase() !== expectedExtension) {
    throw new YapsToolError("invalid_output_path", `The output path must end in ${expectedExtension}: ${path}`);
  }
  if (!overwrite && await pathExists(path)) {
    throw new YapsToolError(
      "output_exists",
      `The output file already exists: ${path}. Choose a new output path, or set overwrite to true after the user explicitly approves replacing it.`,
    );
  }
  return path;
}

export async function requireCreatedOutput(path) {
  const details = await stat(path).catch(() => undefined);
  if (!details?.isFile() || details.size === 0) {
    throw new YapsToolError("output_missing", `Yaps did not create a non-empty output file: ${path}`);
  }
}

export function featureById(inventory, id) {
  const features = Array.isArray(inventory?.features) ? inventory.features : [];
  return features.find((feature) => feature?.id === id) || null;
}

export function readOnlyAnnotations(title) {
  return {
    title,
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  };
}

export function createAnnotations(title, { idempotent = false } = {}) {
  return {
    title,
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: idempotent,
    openWorldHint: false,
  };
}

export function destructiveAnnotations(title, { idempotent = false } = {}) {
  return {
    title,
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: idempotent,
    openWorldHint: false,
  };
}

export function tool({ name, title, description, inputSchema, annotations }) {
  return { name, title, description, inputSchema, annotations };
}

export function emptySchema() {
  return { type: "object", properties: {}, additionalProperties: false };
}
