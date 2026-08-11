import {
  LONG_CLI_TIMEOUT_MS,
  YapsToolError,
  destructiveAnnotations,
  diagnoseSession,
  emptySchema,
  readOnlyAnnotations,
  requireActiveAccount,
  runCli,
  success,
  tool,
} from "../yaps-runtime.mjs";

const FEATURE_IDS = [
  "dictation",
  "cleanup",
  "reading",
  "subtitles",
  "auto-captions",
  "auto-cut",
  "audio-cleaner",
  "text-in-between",
  "background-removal",
  "translation",
  "meeting",
];

const MODE_FIRST_FEATURES = new Set(["dictation", "cleanup", "reading"]);
const ENABLE_FLAG_FEATURES = new Set([
  "subtitles",
  "auto-captions",
  "auto-cut",
  "audio-cleaner",
  "text-in-between",
  "background-removal",
]);

export const tools = [
  tool({
    name: "yaps_status",
    title: "Check Yaps readiness",
    description:
      "Check whether the local Yaps desktop app is installed, which version it is, whether an account is signed in and active, and which features and models are installed. Works while signed out and returns guidance instead of failing. Call this first when any other Yaps tool reports a problem.",
    inputSchema: emptySchema(),
    annotations: readOnlyAnnotations("Check Yaps readiness"),
  }),
  tool({
    name: "yaps_enable_feature",
    title: "Install a Yaps feature",
    description:
      "Install or enable one Yaps feature by downloading its on-device model. Downloads are large (roughly 145 MB for the Supertonic voice up to 2.8 GB for the Chatterbox voice; translation engines are 1.7-2.5 GB) and can take many minutes. Only call this after the user explicitly asks to install the feature; never auto-install mid-task.",
    inputSchema: {
      type: "object",
      properties: {
        feature: {
          type: "string",
          enum: FEATURE_IDS,
          description: "Feature to install or enable.",
        },
        mode_or_engine: {
          type: "string",
          description:
            "Optional mode or engine: dictation realtime|compact|medium|max|cloud; cleanup none|small|large|cloud; reading kokoro|chatterbox|supertonic; translation standard|extended; meeting sherpa|moss. Ignored for the on/off features.",
        },
      },
      required: ["feature"],
      additionalProperties: false,
    },
    annotations: destructiveAnnotations("Install a Yaps feature"),
  }),
];

async function yapsStatus() {
  const { session, connection, account } = await diagnoseSession({ refresh: true });
  const status = {
    ok: connection.code === "ready" && account?.code === "ready",
    connection_code: connection.code,
    connection_message: connection.message,
    app_version: session.appVersion || null,
    account_code: account?.code || null,
    account_message: account?.message || null,
    authenticated: session.auth?.authenticated === true,
    account_status: session.auth?.status || "unknown",
  };
  if (connection.code === "ready") {
    try {
      const inventory = await runCli(session, ["features", "list"], { label: "feature inventory" });
      status.features = inventory.features;
      status.feature_settings = inventory.settings;
    } catch (error) {
      status.features_error = error instanceof YapsToolError
        ? error.message
        : "The Yaps feature inventory could not be read.";
    }
  }
  return success(status);
}

function enableFeatureArgs(feature, modeOrEngine) {
  const mode = typeof modeOrEngine === "string" && modeOrEngine.trim()
    ? modeOrEngine.trim().toLowerCase()
    : undefined;
  if (MODE_FIRST_FEATURES.has(feature)) {
    if (!mode) {
      throw new YapsToolError(
        "invalid_input",
        `The ${feature} feature needs a mode_or_engine value to install (for example ${feature === "reading" ? "kokoro" : feature === "cleanup" ? "small" : "medium"}).`,
      );
    }
    return ["features", feature, mode];
  }
  if (ENABLE_FLAG_FEATURES.has(feature)) {
    return ["features", feature, "--enable"];
  }
  if (feature === "translation") {
    return ["features", "translation", mode || "standard", "--enable"];
  }
  if (feature === "meeting") {
    return ["features", "meeting", "--enable", ...(mode ? ["--engine", mode] : [])];
  }
  throw new YapsToolError("invalid_input", `Unknown feature: ${feature}`);
}

async function yapsEnableFeature(args) {
  const feature = typeof args.feature === "string" ? args.feature : "";
  const cliArgs = enableFeatureArgs(feature, args.mode_or_engine);
  const session = await requireActiveAccount();
  const result = await runCli(session, cliArgs, {
    timeoutMs: LONG_CLI_TIMEOUT_MS,
    label: `${feature} feature install`,
  });
  return success(result);
}

export const handlers = {
  yaps_status: yapsStatus,
  yaps_enable_feature: yapsEnableFeature,
};
