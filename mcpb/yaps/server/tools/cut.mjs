import {
  LONG_CLI_TIMEOUT_MS, VIDEO_EXTENSIONS, YapsToolError, createAnnotations,
  destructiveAnnotations, emptySchema, readOnlyAnnotations, requireActiveAccount,
  requireCreatedOutput, requireExistingFile, requireWritableOutput, runCli,
  success, tool, versionAtLeast,
} from "../yaps-runtime.mjs";

const MIN_CUT_VERSION = "2.3.848";
const project = { type: "string", minLength: 1, description: "Opaque project id returned by cut_create or cut_list." };
const full = { type: "boolean", default: false };
const video = { type: "string", description: "Absolute path to the source video." };
const milliseconds = { type: "integer", minimum: 0, maximum: 4294967295 };
const knobs = {
  preset: { type: "string", enum: ["tight", "natural", "relaxed", "custom"] },
  pause_budget_ms: milliseconds, lead_in_ms: milliseconds, lead_out_ms: milliseconds,
  merge_gap_ms: milliseconds, min_keep_ms: milliseconds, head_ms: milliseconds, tail_ms: milliseconds,
  speech_threshold: { type: "number", minimum: 0.05, maximum: 0.95 },
  noise_floor_db: { type: "number", minimum: -90, maximum: 0 },
  floor_margin_db: { type: "number", minimum: 0, maximum: 40 },
  normalize_loudness: { type: "boolean" }, refine_boundaries: { type: "boolean" },
};
const schema = (properties, required = []) => ({ type: "object", properties, required, additionalProperties: false });
const define = (name, title, description, inputSchema, annotations = readOnlyAnnotations) => tool({
  name, title, description, inputSchema, annotations: annotations(title),
});

export const tools = [
  define("cut_presets", "List Auto Cut presets", "List pause budgets for tight, natural, relaxed, and custom Auto Cut presets. Requires Yaps 2.3.848 or newer.", emptySchema()),
  define("cut_verify", "Check Auto Cut video", "Probe a video's duration, audio, and processing limits without creating a project.", schema({ video_path: video }, ["video_path"])),
  define("cut_create", "Create Auto Cut project", "Detect speech and save a reviewable plan that removes long pauses. Preserves the source. Defaults to natural pacing. This does not export a video or select semantic highlights.", schema({ video_path: video, ...knobs }, ["video_path"]), createAnnotations),
  define("cut_list", "List Auto Cut projects", "List saved Auto Cut projects to resume an existing edit.", emptySchema()),
  define("cut_show", "Show Auto Cut project", "Read a project's summary or its full source and settings.", schema({ project_id: project, full }, ["project_id"])),
  define("cut_plan", "Read Auto Cut plan", "Read exact keep ranges and cut metrics before rendering.", schema({ project_id: project }, ["project_id"])),
  define("cut_export_plan", "Suggest Auto Cut export", "Suggest an output path and estimate export size without creating any file.", schema({ project_id: project }, ["project_id"])),
  define("cut_set", "Adjust Auto Cut settings", "Change pacing or detection settings. If requires_redetect is true, call cut_redetect before rendering. Detection changes alone do not update the speech map.", schema({ project_id: project, ...knobs, auto_noise_floor: { type: "boolean" }, auto_floor_margin: { type: "boolean" }, full }, ["project_id"]), destructiveAnnotations),
  define("cut_redetect", "Redetect Auto Cut speech", "Re-run speech detection using the project's current settings and rebuild its plan.", schema({ project_id: project }, ["project_id"]), destructiveAnnotations),
  define("cut_render", "Export tightened video", "Render a saved Auto Cut plan into a separate MP4. Never replace the source or preview proxy. Only enable overwrite after explicit approval to replace the exact output.", schema({ project_id: project, output_path: { type: "string", minLength: 1 }, overwrite: { type: "boolean", default: false } }, ["project_id", "output_path"]), destructiveAnnotations),
  define("cut_delete", "Delete Auto Cut project", "Delete the specified saved project and its managed artifacts, not its source or exported videos. Only after the user explicitly asks to delete this project; never use as automatic cleanup.", schema({ project_id: project, confirm: { type: "boolean", const: true } }, ["project_id", "confirm"]), destructiveAnnotations),
];

function projectId(args) {
  const value = typeof args.project_id === "string" ? args.project_id.trim() : "";
  if (!value || value.startsWith("-")) throw new YapsToolError("invalid_input", "A project_id returned by Yaps is required.");
  return value;
}

export function cutSettingsArguments(args) {
  const result = [];
  for (const [name, spec] of Object.entries(knobs)) {
    const value = args[name];
    if (value === undefined) continue;
    if (spec.type === "boolean") {
      if (typeof value !== "boolean") throw new YapsToolError("invalid_input", `${name} must be a boolean.`);
      result.push(`--${value ? "" : "no-"}${name.replaceAll("_", "-")}`);
      continue;
    }
    const valid = spec.enum ? spec.enum.includes(value)
      : typeof value === "number" && Number.isFinite(value)
        && (spec.type !== "integer" || Number.isInteger(value)) && value >= spec.minimum && value <= spec.maximum;
    if (!valid) throw new YapsToolError("invalid_input", `Invalid ${name}.`);
    result.push(`--${name.replaceAll("_", "-")}`, String(value));
  }
  if (args.pause_budget_ms !== undefined && args.preset && args.preset !== "custom") {
    throw new YapsToolError("invalid_input", "pause_budget_ms requires custom pacing; omit preset or use custom.");
  }
  for (const name of ["auto_noise_floor", "auto_floor_margin"]) {
    if (args[name] !== undefined && typeof args[name] !== "boolean") throw new YapsToolError("invalid_input", `${name} must be a boolean.`);
    if (args[name] === true) result.push(`--${name.replaceAll("_", "-")}`);
  }
  return result;
}

export function createCutHandlers(overrides = {}) {
  const deps = { requireActiveAccount, runCli, requireExistingFile, requireWritableOutput, requireCreatedOutput, ...overrides };
  const rendering = new Set();
  async function run(args, label, timeoutMs) {
    const session = await deps.requireActiveAccount();
    if (!versionAtLeast(session.appVersion, MIN_CUT_VERSION)) {
      throw new YapsToolError("auto_cut_requires_update", `Auto Cut tools require Yaps ${MIN_CUT_VERSION} or newer. Update Yaps and retry.`);
    }
    return deps.runCli(session, ["cut", ...args], { label, ...(timeoutMs ? { timeoutMs } : {}) });
  }
  return {
    cut_presets: async () => success(await run(["presets"], "Auto Cut presets")),
    cut_verify: async args => {
      const path = await deps.requireExistingFile(args.video_path, { label: "video", extensions: VIDEO_EXTENSIONS });
      return success(await run(["verify", path], "Auto Cut source check"));
    },
    cut_create: async args => {
      const path = await deps.requireExistingFile(args.video_path, { label: "video", extensions: VIDEO_EXTENSIONS });
      const settings = { ...args };
      if (settings.preset === undefined && settings.pause_budget_ms === undefined) settings.preset = "natural";
      return success(await run(["create", path, ...cutSettingsArguments(settings)], "Auto Cut analysis", LONG_CLI_TIMEOUT_MS));
    },
    cut_list: async () => success(await run(["list"], "Auto Cut project listing")),
    cut_show: async args => success(await run(["show", projectId(args), ...(args.full === true ? ["--full"] : [])], "Auto Cut project")),
    cut_plan: async args => success(await run(["plan", projectId(args)], "Auto Cut plan")),
    cut_export_plan: async args => success(await run(["export-plan", projectId(args)], "Auto Cut export plan")),
    cut_set: async args => success(await run(["set", projectId(args), ...cutSettingsArguments(args), ...(args.full === true ? ["--full"] : [])], "Auto Cut settings")),
    cut_redetect: async args => success(await run(["redetect", projectId(args)], "Auto Cut speech detection", LONG_CLI_TIMEOUT_MS)),
    cut_render: async args => {
      const id = projectId(args);
      if (rendering.has(id)) throw new YapsToolError("render_in_progress", "This project is already rendering. Wait for that export to finish.");
      if (typeof args.output_path !== "string" || !args.output_path.trim()) throw new YapsToolError("invalid_input", "A separate .mp4 output_path is required.");
      rendering.add(id);
      try {
        const output = await deps.requireWritableOutput(args.output_path, { overwrite: args.overwrite === true, expectedExtension: ".mp4" });
        // The native renderer also rejects source/proxy aliases even with --overwrite.
        const result = await run(["render", id, "--output", output, ...(args.overwrite === true ? ["--overwrite"] : [])], "Auto Cut export", LONG_CLI_TIMEOUT_MS);
        await deps.requireCreatedOutput(output);
        return success({ ...result, output_path: output });
      } finally { rendering.delete(id); }
    },
    cut_delete: async args => {
      if (args.confirm !== true) throw new YapsToolError("confirmation_required", "Deleting this saved project requires the user's explicit request and confirm: true.");
      return success(await run(["delete", projectId(args)], "Auto Cut project deletion"));
    },
  };
}

export const handlers = createCutHandlers();
