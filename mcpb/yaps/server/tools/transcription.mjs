import { mkdtemp, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, parse } from "node:path";
import {
  LONG_CLI_TIMEOUT_MS,
  YapsToolError,
  destructiveAnnotations,
  pathExists,
  requireActiveAccount,
  requireCreatedOutput,
  requireExistingFile,
  requireWritableOutput,
  runCli,
  success,
  tool,
} from "../yaps-runtime.mjs";

export const tools = [
  tool({
    name: "transcribe_media",
    title: "Transcribe audio or video",
    description:
      "Transcribe an audio or video file to plain text with the local Yaps engine and return the transcript in chat. Optionally save the transcript beside the source as '<name> Transcript.txt'. Requires the Yaps Subtitles feature (install with yaps_enable_feature); video containers also need FFmpeg.",
    inputSchema: {
      type: "object",
      properties: {
        media_path: { type: "string", description: "Absolute path to the audio or video file." },
        save_to_file: {
          type: "boolean",
          default: false,
          description: "Save the transcript to a .txt file as well as returning it in chat.",
        },
        output_path: {
          type: "string",
          description: "Optional absolute .txt destination when save_to_file is true. Defaults beside the source as '<name> Transcript.txt'.",
        },
        language: {
          type: "string",
          description: "Optional ISO-639-1 language spoken in this file (for example en, hi). Omit to auto-detect.",
        },
        force: {
          type: "boolean",
          default: false,
          description: "Replace an existing transcript file. Only set true after the user explicitly approves overwriting it.",
        },
      },
      required: ["media_path"],
      additionalProperties: false,
    },
    annotations: destructiveAnnotations("Transcribe audio or video"),
  }),
  tool({
    name: "srt_generate",
    title: "Generate SRT subtitles",
    description:
      "Generate a timestamped .srt subtitle file from a video or audio file with the local Yaps engine. Defaults beside the source as '<name> Subtitles.srt'. Requires the Yaps Subtitles feature; video containers also need FFmpeg.",
    inputSchema: {
      type: "object",
      properties: {
        media_path: { type: "string", description: "Absolute path to the audio or video file." },
        output_path: {
          type: "string",
          description: "Optional absolute destination ending in .srt. Defaults beside the source as '<name> Subtitles.srt'.",
        },
        language: {
          type: "string",
          description: "Optional ISO-639-1 language spoken in this file. Omit to auto-detect.",
        },
        overwrite: {
          type: "boolean",
          default: false,
          description: "Replace an existing subtitle file. Only set true after the user explicitly approves overwriting it.",
        },
      },
      required: ["media_path"],
      additionalProperties: false,
    },
    annotations: destructiveAnnotations("Generate SRT subtitles"),
  }),
];

function srtPreview(transcriptText) {
  if (typeof transcriptText !== "string" || !transcriptText.trim()) return undefined;
  const lines = transcriptText.trim().split(/\r?\n/);
  return {
    first_line: lines[0],
    last_line: lines[lines.length - 1],
  };
}

async function transcribeMedia(args) {
  const source = await requireExistingFile(args.media_path, { label: "media file" });
  const saveToFile = args.save_to_file === true;
  let output;
  if (saveToFile) {
    const parsed = parse(source);
    output = await requireWritableOutput(
      args.output_path || join(parsed.dir, `${parsed.name} Transcript.txt`),
      { overwrite: args.force === true, expectedExtension: ".txt" },
    );
  } else if (args.output_path) {
    throw new YapsToolError("invalid_input", "output_path is only used when save_to_file is true.");
  }

  const session = await requireActiveAccount();
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "yaps-mcpb-transcript-"));
  try {
    const temporarySrt = join(temporaryDirectory, "transcript.srt");
    const command = ["srt", "generate", source, "--output", temporarySrt];
    if (typeof args.language === "string" && args.language.trim()) {
      command.push("--language", args.language.trim());
    }
    const result = await runCli(session, command, {
      timeoutMs: LONG_CLI_TIMEOUT_MS,
      label: "transcription",
    });
    const transcript = typeof result.transcript === "string" ? result.transcript.trim() : "";
    if (!transcript) {
      throw new YapsToolError("no_speech", "Yaps found no speech in this file.");
    }
    if (output) {
      if (args.force === true && await pathExists(output)) await unlink(output);
      await writeFile(output, `${transcript}\n`, "utf8");
    }
    return success({
      transcript,
      engine: result.engine,
      duration_secs: result.duration_secs,
      word_count: result.word_count,
      ...(output ? { output_path: output } : {}),
    });
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function srtGenerate(args) {
  const source = await requireExistingFile(args.media_path, { label: "media file" });
  const parsed = parse(source);
  const overwrite = args.overwrite === true;
  const output = await requireWritableOutput(
    args.output_path || join(parsed.dir, `${parsed.name} Subtitles.srt`),
    { overwrite, expectedExtension: ".srt" },
  );
  const session = await requireActiveAccount();
  // The CLI has no overwrite flag for srt generate, so an explicitly approved
  // overwrite removes the stale file just before the run.
  if (overwrite && await pathExists(output)) await unlink(output);
  const command = ["srt", "generate", source, "--output", output];
  if (typeof args.language === "string" && args.language.trim()) {
    command.push("--language", args.language.trim());
  }
  const result = await runCli(session, command, {
    timeoutMs: LONG_CLI_TIMEOUT_MS,
    label: "subtitle generation",
  });
  await requireCreatedOutput(output);
  return success({ ...result, preview: srtPreview(result.transcript) });
}

export const handlers = {
  transcribe_media: transcribeMedia,
  srt_generate: srtGenerate,
};
