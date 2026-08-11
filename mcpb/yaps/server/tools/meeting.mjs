import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import {
  LONG_CLI_TIMEOUT_MS,
  VIDEO_EXTENSIONS,
  YapsToolError,
  createAnnotations,
  destructiveAnnotations,
  readOnlyAnnotations,
  requireActiveAccount,
  requireExistingFile,
  requireMeetingAiSupport,
  requireWritableOutput,
  runCli,
  success,
  tool,
} from "../yaps-runtime.mjs";

const MEETING_ID_PROPERTY = {
  type: "string",
  description: "Meeting id returned by meeting_transcribe (or a path to its meeting.json).",
};

const SEGMENT_ID_PROPERTY = {
  type: "string",
  description: "Segment id such as seg-3, from meeting_show.",
};

/** Tools that run the on-device meeting AI commands added in Yaps 2.3.848. */
const MEETING_AI_TOOLS = new Set([
  "meeting_summarize",
  "meeting_chapters",
  "meeting_ask",
  "meeting_speakers",
  "meeting_merge_speakers",
  "meeting_add_speaker",
]);

export const tools = [
  tool({
    name: "meeting_transcribe",
    title: "Transcribe meeting with speakers",
    description:
      "Transcribe a meeting, interview, podcast, or call recording into a speaker-labelled Yaps meeting project. Accepts audio directly and extracts the audio track from video first. Long recordings take minutes. Requires the Meeting feature (Sherpa engine cross-platform; MOSS on Apple Silicon for long meetings).",
    inputSchema: {
      type: "object",
      properties: {
        recording_path: { type: "string", description: "Absolute path to the meeting recording (audio or video)." },
        title: { type: "string", description: "Optional meeting title saved in Yaps." },
        engine: {
          type: "string",
          enum: ["auto", "sherpa", "moss"],
          default: "auto",
          description: "Use auto unless the user explicitly requests an installed engine.",
        },
        speakers: {
          type: "integer",
          minimum: 1,
          maximum: 20,
          description: "Optional expected speaker count. Used by Sherpa only; MOSS detects speakers automatically.",
        },
      },
      required: ["recording_path"],
      additionalProperties: false,
    },
    annotations: createAnnotations("Transcribe meeting with speakers"),
  }),
  tool({
    name: "meeting_show",
    title: "Show meeting transcript",
    description:
      "Show a Yaps meeting project: segment ids, timestamps, speaker labels, and text.",
    inputSchema: {
      type: "object",
      properties: { meeting_id: MEETING_ID_PROPERTY },
      required: ["meeting_id"],
      additionalProperties: false,
    },
    annotations: readOnlyAnnotations("Show meeting transcript"),
  }),
  tool({
    name: "meeting_speakers",
    title: "List meeting speakers",
    description:
      "List a meeting's speakers with how much each said and their first line. Needs Yaps 2.3.848 or newer.",
    inputSchema: {
      type: "object",
      properties: { meeting_id: MEETING_ID_PROPERTY },
      required: ["meeting_id"],
      additionalProperties: false,
    },
    annotations: readOnlyAnnotations("List meeting speakers"),
  }),
  tool({
    name: "meeting_summarize",
    title: "Summarize meeting",
    description:
      "Build the structured meeting recap (lede, key points, decisions, risks, action items with owners, topics, chapters) with the on-device chat model. A long meeting takes minutes; an existing recap is reused unless refresh is true. Needs Yaps 2.3.848 or newer.",
    inputSchema: {
      type: "object",
      properties: {
        meeting_id: MEETING_ID_PROPERTY,
        template: { type: "string", description: "Optional meeting template id. Defaults to general." },
        refresh: {
          type: "boolean",
          default: false,
          description: "Rebuild even when this meeting already has a recap.",
        },
      },
      required: ["meeting_id"],
      additionalProperties: false,
    },
    annotations: createAnnotations("Summarize meeting", { idempotent: true }),
  }),
  tool({
    name: "meeting_chapters",
    title: "Show meeting chapters",
    description:
      "Show the timestamped sections of a summarized meeting. Run meeting_summarize first. Needs Yaps 2.3.848 or newer.",
    inputSchema: {
      type: "object",
      properties: { meeting_id: MEETING_ID_PROPERTY },
      required: ["meeting_id"],
      additionalProperties: false,
    },
    annotations: readOnlyAnnotations("Show meeting chapters"),
  }),
  tool({
    name: "meeting_ask",
    title: "Ask about meetings",
    description:
      "Ask a question of one Yaps meeting, or of every meeting on this machine (scope all), answered by the on-device model with citations. Needs Yaps 2.3.848 or newer.",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", minLength: 1, description: "The question to ask." },
        meeting_id: { ...MEETING_ID_PROPERTY, description: "Meeting id to ask about. Required unless scope is all." },
        scope: {
          type: "string",
          enum: ["meeting", "all"],
          default: "meeting",
          description: "meeting asks one meeting; all searches every meeting on this machine.",
        },
      },
      required: ["question"],
      additionalProperties: false,
    },
    annotations: readOnlyAnnotations("Ask about meetings"),
  }),
  tool({
    name: "meeting_correct_segment",
    title: "Correct meeting segment",
    description:
      "Correct one meeting segment's text without changing its timestamps or speaker.",
    inputSchema: {
      type: "object",
      properties: {
        meeting_id: MEETING_ID_PROPERTY,
        segment_id: SEGMENT_ID_PROPERTY,
        text: { type: "string", minLength: 1, description: "Replacement text for the segment." },
      },
      required: ["meeting_id", "segment_id", "text"],
      additionalProperties: false,
    },
    annotations: destructiveAnnotations("Correct meeting segment"),
  }),
  tool({
    name: "meeting_assign_segment",
    title: "Reassign segment speaker",
    description:
      "Reassign one meeting segment to a different speaker (1-based speaker number from meeting_speakers or meeting_show).",
    inputSchema: {
      type: "object",
      properties: {
        meeting_id: MEETING_ID_PROPERTY,
        segment_id: SEGMENT_ID_PROPERTY,
        speaker: { type: "integer", minimum: 1, description: "1-based speaker number to assign the segment to." },
      },
      required: ["meeting_id", "segment_id", "speaker"],
      additionalProperties: false,
    },
    annotations: destructiveAnnotations("Reassign segment speaker"),
  }),
  tool({
    name: "meeting_rename_speaker",
    title: "Rename meeting speaker",
    description:
      "Rename a speaker everywhere in one meeting (1-based speaker number).",
    inputSchema: {
      type: "object",
      properties: {
        meeting_id: MEETING_ID_PROPERTY,
        speaker: { type: "integer", minimum: 1, description: "1-based speaker number to rename." },
        name: { type: "string", minLength: 1, description: "The speaker's name." },
      },
      required: ["meeting_id", "speaker", "name"],
      additionalProperties: false,
    },
    annotations: destructiveAnnotations("Rename meeting speaker"),
  }),
  tool({
    name: "meeting_add_speaker",
    title: "Add meeting speaker",
    description:
      "Add a speaker that diarization missed, so their lines can be reassigned to them with meeting_assign_segment. Needs Yaps 2.3.848 or newer.",
    inputSchema: {
      type: "object",
      properties: {
        meeting_id: MEETING_ID_PROPERTY,
        name: { type: "string", minLength: 1, description: "What to call the new speaker." },
      },
      required: ["meeting_id", "name"],
      additionalProperties: false,
    },
    annotations: createAnnotations("Add meeting speaker"),
  }),
  tool({
    name: "meeting_merge_speakers",
    title: "Merge meeting speakers",
    description:
      "Fold one or more speakers into another, rewriting every affected segment at once. This cannot be undone from here; only call it after the user explicitly confirms which speakers to merge. Needs Yaps 2.3.848 or newer.",
    inputSchema: {
      type: "object",
      properties: {
        meeting_id: MEETING_ID_PROPERTY,
        speakers: {
          type: "array",
          items: { type: "integer", minimum: 1 },
          minItems: 1,
          description: "1-based speaker numbers to absorb.",
        },
        into: { type: "integer", minimum: 1, description: "The 1-based speaker they all become." },
        name: { type: "string", description: "Optional name for the merged speaker. Omit to keep the target's current name." },
      },
      required: ["meeting_id", "speakers", "into"],
      additionalProperties: false,
    },
    annotations: destructiveAnnotations("Merge meeting speakers"),
  }),
  tool({
    name: "meeting_export",
    title: "Export meeting transcript",
    description:
      "Export the corrected speaker transcript of a meeting as a Markdown file. Refuses to replace an existing file.",
    inputSchema: {
      type: "object",
      properties: {
        meeting_id: MEETING_ID_PROPERTY,
        output_path: { type: "string", description: "Absolute destination path ending in .md." },
      },
      required: ["meeting_id", "output_path"],
      additionalProperties: false,
    },
    annotations: createAnnotations("Export meeting transcript"),
  }),
];

function requireMeetingId(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new YapsToolError("invalid_input", "meeting_id is required.");
  }
  return value.trim();
}

function requireSegmentId(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new YapsToolError("invalid_input", "segment_id is required.");
  }
  return value.trim();
}

async function requireMeetingSession(toolName) {
  const session = await requireActiveAccount();
  if (MEETING_AI_TOOLS.has(toolName)) await requireMeetingAiSupport(session);
  return session;
}

async function meetingTranscribe(args) {
  const source = await requireExistingFile(args.recording_path, { label: "recording" });
  const engine = args.engine || "auto";
  if (!["auto", "sherpa", "moss"].includes(engine)) {
    throw new YapsToolError("invalid_input", "engine must be auto, sherpa, or moss.");
  }
  if (args.speakers !== undefined
    && (!Number.isInteger(args.speakers) || args.speakers < 1 || args.speakers > 20)) {
    throw new YapsToolError("invalid_input", "speakers must be an integer from 1 to 20.");
  }
  if (engine === "moss" && args.speakers !== undefined) {
    throw new YapsToolError("invalid_input", "MOSS detects speakers automatically; omit speakers or use the sherpa engine.");
  }
  const session = await requireActiveAccount();
  const temporaryDirectory = VIDEO_EXTENSIONS.has(extname(source).toLowerCase())
    ? await mkdtemp(join(tmpdir(), "yaps-mcpb-meeting-"))
    : undefined;
  try {
    let recording = source;
    if (temporaryDirectory) {
      recording = join(temporaryDirectory, "meeting-audio.wav");
      await runCli(session, [
        "media", "extract-audio", source, "--format", "wav", "--output", recording,
      ], { timeoutMs: LONG_CLI_TIMEOUT_MS, label: "audio extraction" });
    }
    const command = ["meeting", "transcribe", recording, "--engine", engine];
    if (typeof args.title === "string" && args.title.trim()) command.push("--title", args.title.trim());
    if (args.speakers !== undefined) command.push("--speakers", String(args.speakers));
    const result = await runCli(session, command, {
      timeoutMs: LONG_CLI_TIMEOUT_MS,
      label: "meeting transcription",
    });
    return success({ ...result, source_path: source });
  } finally {
    if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

export const handlers = {
  meeting_transcribe: meetingTranscribe,

  meeting_show: async (args) => {
    const session = await requireMeetingSession("meeting_show");
    return success(await runCli(session, ["meeting", "show", requireMeetingId(args.meeting_id)], {
      label: "meeting read",
    }));
  },

  meeting_speakers: async (args) => {
    const session = await requireMeetingSession("meeting_speakers");
    return success(await runCli(session, ["meeting", "speakers", requireMeetingId(args.meeting_id)], {
      label: "speaker listing",
    }));
  },

  meeting_summarize: async (args) => {
    const session = await requireMeetingSession("meeting_summarize");
    const command = ["meeting", "summarize", requireMeetingId(args.meeting_id)];
    if (typeof args.template === "string" && args.template.trim()) {
      command.push("--template", args.template.trim());
    }
    if (args.refresh === true) command.push("--refresh");
    return success(await runCli(session, command, {
      timeoutMs: LONG_CLI_TIMEOUT_MS,
      label: "meeting summary",
    }));
  },

  meeting_chapters: async (args) => {
    const session = await requireMeetingSession("meeting_chapters");
    return success(await runCli(session, ["meeting", "chapters", requireMeetingId(args.meeting_id)], {
      label: "chapter listing",
    }));
  },

  meeting_ask: async (args) => {
    if (typeof args.question !== "string" || !args.question.trim()) {
      throw new YapsToolError("invalid_input", "question is required.");
    }
    const scope = args.scope || "meeting";
    if (!["meeting", "all"].includes(scope)) {
      throw new YapsToolError("invalid_input", "scope must be meeting or all.");
    }
    if (scope === "meeting" && (typeof args.meeting_id !== "string" || !args.meeting_id.trim())) {
      throw new YapsToolError("invalid_input", "meeting_id is required unless scope is all.");
    }
    const session = await requireMeetingSession("meeting_ask");
    const command = ["meeting", "ask", args.question.trim(), "--scope", scope];
    if (scope === "meeting") command.push("--meeting", args.meeting_id.trim());
    return success(await runCli(session, command, {
      timeoutMs: LONG_CLI_TIMEOUT_MS,
      label: "meeting question",
    }));
  },

  meeting_correct_segment: async (args) => {
    if (typeof args.text !== "string" || !args.text.trim()) {
      throw new YapsToolError("invalid_input", "text is required.");
    }
    const session = await requireMeetingSession("meeting_correct_segment");
    return success(await runCli(session, [
      "meeting", "correct", requireMeetingId(args.meeting_id),
      "--segment", requireSegmentId(args.segment_id),
      "--text", args.text,
    ], { label: "segment correction" }));
  },

  meeting_assign_segment: async (args) => {
    if (!Number.isInteger(args.speaker) || args.speaker < 1) {
      throw new YapsToolError("invalid_input", "speaker must be a 1-based speaker number.");
    }
    const session = await requireMeetingSession("meeting_assign_segment");
    return success(await runCli(session, [
      "meeting", "assign", requireMeetingId(args.meeting_id),
      "--segment", requireSegmentId(args.segment_id),
      "--speaker", String(args.speaker),
    ], { label: "segment reassignment" }));
  },

  meeting_rename_speaker: async (args) => {
    if (!Number.isInteger(args.speaker) || args.speaker < 1) {
      throw new YapsToolError("invalid_input", "speaker must be a 1-based speaker number.");
    }
    if (typeof args.name !== "string" || !args.name.trim()) {
      throw new YapsToolError("invalid_input", "name is required.");
    }
    const session = await requireMeetingSession("meeting_rename_speaker");
    return success(await runCli(session, [
      "meeting", "rename-speaker", requireMeetingId(args.meeting_id),
      "--speaker", String(args.speaker),
      "--name", args.name.trim(),
    ], { label: "speaker rename" }));
  },

  meeting_add_speaker: async (args) => {
    if (typeof args.name !== "string" || !args.name.trim()) {
      throw new YapsToolError("invalid_input", "name is required.");
    }
    const session = await requireMeetingSession("meeting_add_speaker");
    return success(await runCli(session, [
      "meeting", "add-speaker", requireMeetingId(args.meeting_id),
      "--name", args.name.trim(),
    ], { label: "speaker addition" }));
  },

  meeting_merge_speakers: async (args) => {
    if (!Array.isArray(args.speakers) || args.speakers.length === 0
      || args.speakers.some((value) => !Number.isInteger(value) || value < 1)) {
      throw new YapsToolError("invalid_input", "speakers must be a non-empty array of 1-based speaker numbers.");
    }
    if (!Number.isInteger(args.into) || args.into < 1) {
      throw new YapsToolError("invalid_input", "into must be a 1-based speaker number.");
    }
    const session = await requireMeetingSession("meeting_merge_speakers");
    const command = [
      "meeting", "merge-speakers", requireMeetingId(args.meeting_id),
      "--speakers", args.speakers.join(","),
      "--into", String(args.into),
    ];
    if (typeof args.name === "string" && args.name.trim()) command.push("--name", args.name.trim());
    return success(await runCli(session, command, { label: "speaker merge" }));
  },

  meeting_export: async (args) => {
    const output = await requireWritableOutput(args.output_path, { expectedExtension: ".md" });
    const session = await requireMeetingSession("meeting_export");
    return success(await runCli(session, [
      "meeting", "export", requireMeetingId(args.meeting_id),
      "--output", output,
    ], { label: "meeting export" }));
  },
};
