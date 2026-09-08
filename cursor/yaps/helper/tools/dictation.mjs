import {
  YapsToolError,
  diagnoseSession,
  emptySchema,
  featureById,
  readOnlyAnnotations,
  requireActiveAccount,
  runCli,
  success,
  tool,
} from "../yaps-runtime.mjs";

export const tools = [
  tool({
    name: "dictation_status",
    title: "Check Yaps dictation",
    description:
      "Check whether Yaps system-wide voice dictation is ready on this computer: app reachability, account state, and which dictation engines are installed. Live dictation runs inside the Yaps app via its configurable global shortcut (Yaps > Settings > Shortcuts); this tool only reports readiness. Works while signed out and returns guidance instead of failing.",
    inputSchema: emptySchema(),
    annotations: readOnlyAnnotations("Check Yaps dictation"),
  }),
  tool({
    name: "dictation_history_recover",
    title: "Recover recent dictations",
    description:
      "List recent Yaps dictations from the local activity history so a lost or misplaced dictation can be recovered into chat.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 50,
          default: 10,
          description: "How many recent history entries to return.",
        },
      },
      additionalProperties: false,
    },
    annotations: readOnlyAnnotations("Recover recent dictations"),
  }),
];

async function dictationStatus() {
  const { session, connection, account } = await diagnoseSession({ refresh: true });
  const status = {
    ok: connection.code === "ready" && account?.code === "ready",
    connection_code: connection.code,
    connection_message: connection.message,
    account_code: account?.code || null,
    account_message: account?.message || null,
    shortcut_hint:
      "Dictation is triggered with the Yaps global shortcut, configurable in Yaps > Settings > Shortcuts.",
  };
  if (connection.code === "ready") {
    try {
      const inventory = await runCli(session, ["features", "list"], { label: "feature inventory" });
      const dictation = featureById(inventory, "dictation");
      if (dictation) {
        status.dictation_enabled = dictation.enabled;
        status.active_mode = dictation.active_mode || null;
        status.modes = dictation.modes;
      }
    } catch (error) {
      status.features_error = error instanceof YapsToolError
        ? error.message
        : "The Yaps dictation engine inventory could not be read.";
    }
  }
  return success(status);
}

async function dictationHistoryRecover(args) {
  let limit = 10;
  if (args.limit !== undefined) {
    if (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 50) {
      throw new YapsToolError("invalid_input", "limit must be an integer from 1 to 50.");
    }
    limit = args.limit;
  }
  const session = await requireActiveAccount();
  return success(await runCli(session, ["history-list", "--limit", String(limit)], {
    label: "history listing",
  }));
}

export const handlers = {
  dictation_status: dictationStatus,
  dictation_history_recover: dictationHistoryRecover,
};
