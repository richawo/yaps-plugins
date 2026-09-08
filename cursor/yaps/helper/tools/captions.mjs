import {
  LONG_CLI_TIMEOUT_MS,
  YapsToolError,
  createAnnotations,
  destructiveAnnotations,
  emptySchema,
  readOnlyAnnotations,
  requireActiveAccount,
  requireExistingFile,
  requireWritableOutput,
  runCli,
  success,
  tool,
} from "../yaps-runtime.mjs";

const PROJECT_ID_PROPERTY = {
  type: "string",
  description: "Caption project id returned by captions_create (or a path to its project file).",
};

const SEGMENT_ID_PROPERTY = {
  type: "string",
  description: "Caption segment id such as caption-001, from captions_show.",
};

const FULL_PROPERTY = {
  type: "boolean",
  default: false,
  description: "Return the full updated project instead of a summary.",
};

export const tools = [
  tool({
    name: "captions_styles",
    title: "List caption styles",
    description:
      "List the Yaps Auto Captions templates (id, name, words per group, animation). bold-highlight is the default template.",
    inputSchema: emptySchema(),
    annotations: readOnlyAnnotations("List caption styles"),
  }),
  tool({
    name: "captions_create",
    title: "Create caption project",
    description:
      "Transcribe a video and build an editable Yaps caption project. Returns the project id used by the other captions tools. Requires the Auto Captions feature plus FFmpeg with libass for rendering.",
    inputSchema: {
      type: "object",
      properties: {
        video_path: { type: "string", description: "Absolute path to the video file." },
        style: {
          type: "string",
          description: "Caption template id from captions_styles. Defaults to bold-highlight.",
        },
        max_words: {
          type: "integer",
          minimum: 1,
          maximum: 12,
          description: "Words per caption group. Omit to follow the template default.",
        },
        language: {
          type: "string",
          description: "Optional ISO-639-1 language spoken in this video. Omit to auto-detect.",
        },
      },
      required: ["video_path"],
      additionalProperties: false,
    },
    annotations: createAnnotations("Create caption project"),
  }),
  tool({
    name: "captions_show",
    title: "Show caption project",
    description:
      "Show a Yaps caption project: segment ids, timings, and text (summary by default, full project on request).",
    inputSchema: {
      type: "object",
      properties: {
        project_id: PROJECT_ID_PROPERTY,
        full: { type: "boolean", default: false, description: "Return the whole project instead of a summary." },
      },
      required: ["project_id"],
      additionalProperties: false,
    },
    annotations: readOnlyAnnotations("Show caption project"),
  }),
  tool({
    name: "captions_correct",
    title: "Correct caption text",
    description:
      "Correct one caption segment's text in a Yaps caption project without changing its timing window.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: PROJECT_ID_PROPERTY,
        segment_id: SEGMENT_ID_PROPERTY,
        text: { type: "string", minLength: 1, description: "Replacement text for the segment." },
        full: FULL_PROPERTY,
      },
      required: ["project_id", "segment_id", "text"],
      additionalProperties: false,
    },
    annotations: destructiveAnnotations("Correct caption text"),
  }),
  tool({
    name: "captions_replace",
    title: "Find and replace in captions",
    description:
      "Find and replace text across every caption in a Yaps caption project.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: PROJECT_ID_PROPERTY,
        find: { type: "string", minLength: 1, description: "Text to find." },
        replace_with: { type: "string", description: "Replacement text." },
        case_sensitive: { type: "boolean", default: false, description: "Match case exactly." },
        full: FULL_PROPERTY,
      },
      required: ["project_id", "find", "replace_with"],
      additionalProperties: false,
    },
    annotations: destructiveAnnotations("Find and replace in captions"),
  }),
  tool({
    name: "captions_split",
    title: "Split a caption",
    description:
      "Split one caption segment into two at a timestamp (in seconds) inside its window.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: PROJECT_ID_PROPERTY,
        segment_id: SEGMENT_ID_PROPERTY,
        at_seconds: { type: "number", exclusiveMinimum: 0, description: "Timestamp in seconds to split at." },
        full: FULL_PROPERTY,
      },
      required: ["project_id", "segment_id", "at_seconds"],
      additionalProperties: false,
    },
    annotations: destructiveAnnotations("Split a caption"),
  }),
  tool({
    name: "captions_merge",
    title: "Merge captions",
    description:
      "Merge one caption segment into its previous or next neighbour.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: PROJECT_ID_PROPERTY,
        segment_id: SEGMENT_ID_PROPERTY,
        direction: {
          type: "string",
          enum: ["previous", "next"],
          description: "Which neighbour to merge into.",
        },
        full: FULL_PROPERTY,
      },
      required: ["project_id", "segment_id", "direction"],
      additionalProperties: false,
    },
    annotations: destructiveAnnotations("Merge captions"),
  }),
  tool({
    name: "captions_set_style",
    title: "Change caption style",
    description:
      "Change the caption template used by a Yaps caption project. Edited text is kept.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: PROJECT_ID_PROPERTY,
        style: { type: "string", minLength: 1, description: "Caption template id from captions_styles." },
        full: FULL_PROPERTY,
      },
      required: ["project_id", "style"],
      additionalProperties: false,
    },
    annotations: destructiveAnnotations("Change caption style"),
  }),
  tool({
    name: "captions_reset",
    title: "Reset caption project",
    description:
      "Rebuild every caption in a project from the original transcript, discarding all corrections, splits, and merges. Only call this after the user explicitly confirms losing their edits.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: PROJECT_ID_PROPERTY,
        full: FULL_PROPERTY,
      },
      required: ["project_id"],
      additionalProperties: false,
    },
    annotations: destructiveAnnotations("Reset caption project"),
  }),
  tool({
    name: "captions_render",
    title: "Render captioned video",
    description:
      "Burn the project's captions into a new MP4. Long videos take minutes. The output must not be the source video; suggest '<name> (Captioned).mp4'. Requires FFmpeg with libass.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: PROJECT_ID_PROPERTY,
        output_path: { type: "string", description: "Absolute destination path ending in .mp4." },
        overwrite: {
          type: "boolean",
          default: false,
          description: "Replace an existing output file. Only set true after the user explicitly approves overwriting it.",
        },
      },
      required: ["project_id", "output_path"],
      additionalProperties: false,
    },
    annotations: destructiveAnnotations("Render captioned video"),
  }),
  tool({
    name: "captions_verify",
    title: "Verify video for captions",
    description:
      "Probe a video and report whether Yaps Auto Captions can process it (duration, audio stream, container facts).",
    inputSchema: {
      type: "object",
      properties: {
        video_path: { type: "string", description: "Absolute path to the video file." },
      },
      required: ["video_path"],
      additionalProperties: false,
    },
    annotations: readOnlyAnnotations("Verify video for captions"),
  }),
];

function requireProjectId(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new YapsToolError("invalid_input", "project_id is required.");
  }
  return value.trim();
}

function requireSegmentId(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new YapsToolError("invalid_input", "segment_id is required.");
  }
  return value.trim();
}

function fullFlag(args) {
  return args.full === true ? ["--full"] : [];
}

async function run(args, options) {
  const session = await requireActiveAccount();
  return runCli(session, args, options);
}

export const handlers = {
  captions_styles: async () => success(await run(["captions", "styles"], { label: "caption style listing" })),

  captions_create: async (args) => {
    const video = await requireExistingFile(args.video_path, { label: "video file" });
    const command = ["captions", "create", video];
    if (typeof args.style === "string" && args.style.trim()) command.push("--style", args.style.trim());
    if (Number.isInteger(args.max_words)) command.push("--max-words", String(args.max_words));
    if (typeof args.language === "string" && args.language.trim()) command.push("--language", args.language.trim());
    return success(await run(command, { timeoutMs: LONG_CLI_TIMEOUT_MS, label: "caption project creation" }));
  },

  captions_show: async (args) => success(await run(
    ["captions", "show", requireProjectId(args.project_id), ...fullFlag(args)],
    { label: "caption project read" },
  )),

  captions_correct: async (args) => {
    if (typeof args.text !== "string" || !args.text.trim()) {
      throw new YapsToolError("invalid_input", "text is required.");
    }
    return success(await run([
      "captions", "correct", requireProjectId(args.project_id),
      "--segment", requireSegmentId(args.segment_id),
      "--text", args.text,
      ...fullFlag(args),
    ], { label: "caption correction" }));
  },

  captions_replace: async (args) => {
    if (typeof args.find !== "string" || !args.find) {
      throw new YapsToolError("invalid_input", "find is required.");
    }
    if (typeof args.replace_with !== "string") {
      throw new YapsToolError("invalid_input", "replace_with is required (an empty string deletes the match).");
    }
    return success(await run([
      "captions", "replace", requireProjectId(args.project_id),
      "--find", args.find,
      "--with", args.replace_with,
      ...(args.case_sensitive === true ? ["--case-sensitive"] : []),
      ...fullFlag(args),
    ], { label: "caption replace" }));
  },

  captions_split: async (args) => {
    if (typeof args.at_seconds !== "number" || !Number.isFinite(args.at_seconds) || args.at_seconds <= 0) {
      throw new YapsToolError("invalid_input", "at_seconds must be a positive number of seconds.");
    }
    return success(await run([
      "captions", "split", requireProjectId(args.project_id),
      "--segment", requireSegmentId(args.segment_id),
      "--at", String(args.at_seconds),
      ...fullFlag(args),
    ], { label: "caption split" }));
  },

  captions_merge: async (args) => {
    if (!["previous", "next"].includes(args.direction)) {
      throw new YapsToolError("invalid_input", "direction must be previous or next.");
    }
    return success(await run([
      "captions", "merge", requireProjectId(args.project_id),
      "--segment", requireSegmentId(args.segment_id),
      "--direction", args.direction,
      ...fullFlag(args),
    ], { label: "caption merge" }));
  },

  captions_set_style: async (args) => {
    if (typeof args.style !== "string" || !args.style.trim()) {
      throw new YapsToolError("invalid_input", "style is required.");
    }
    return success(await run([
      "captions", "style", requireProjectId(args.project_id),
      "--style", args.style.trim(),
      ...fullFlag(args),
    ], { label: "caption style change" }));
  },

  captions_reset: async (args) => success(await run(
    ["captions", "reset", requireProjectId(args.project_id), ...fullFlag(args)],
    { label: "caption reset" },
  )),

  captions_render: async (args) => {
    const overwrite = args.overwrite === true;
    const output = await requireWritableOutput(args.output_path, {
      overwrite,
      expectedExtension: ".mp4",
    });
    return success(await run([
      "captions", "render", requireProjectId(args.project_id),
      "--output", output,
      ...(overwrite ? ["--overwrite"] : []),
    ], { timeoutMs: LONG_CLI_TIMEOUT_MS, label: "caption render" }));
  },

  captions_verify: async (args) => {
    const video = await requireExistingFile(args.video_path, { label: "video file" });
    return success(await run(["captions", "verify", video], { label: "video verification" }));
  },
};
