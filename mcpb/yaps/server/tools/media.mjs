import { join, parse } from "node:path";
import {
  LONG_CLI_TIMEOUT_MS,
  VIDEO_EXTENSIONS,
  YapsToolError,
  createAnnotations,
  destructiveAnnotations,
  requireActiveAccount,
  requireCreatedOutput,
  requireExistingFile,
  requireWritableOutput,
  runCli,
  success,
  tool,
} from "../yaps-runtime.mjs";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".bmp"]);
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const LOW_MASK_COVERAGE = 0.005;

export const tools = [
  tool({
    name: "audio_clean",
    title: "Clean audio recording",
    description:
      "Remove background noise, hiss, and static from a speech recording with the local Yaps Audio Cleaner, writing a new cleaned WAV. Accepts anything FFmpeg decodes (WAV, MP3, M4A, FLAC, OGG, and more). The recommended quality won a blind listening test; maximum can take several times the recording's duration. Requires the Audio Cleaner feature.",
    inputSchema: {
      type: "object",
      properties: {
        audio_path: { type: "string", description: "Absolute path to the speech recording." },
        quality: {
          type: "string",
          enum: ["quick", "recommended", "maximum"],
          default: "recommended",
          description: "Cleaning quality. Use recommended unless the user asks otherwise.",
        },
        output_path: {
          type: "string",
          description: "Optional absolute .wav destination. Omit to let Yaps pick a safe name beside the source.",
        },
        overwrite: {
          type: "boolean",
          default: false,
          description: "Replace an existing output file. Only set true after the user explicitly approves overwriting it.",
        },
      },
      required: ["audio_path"],
      additionalProperties: false,
    },
    annotations: destructiveAnnotations("Clean audio recording"),
  }),
  tool({
    name: "image_remove_background",
    title: "Remove image background",
    description:
      "Cut the subject out of a JPG, PNG, WebP, or BMP photo into a transparent PNG, or composite it onto a solid colour, with the local Yaps vision model. Requires the Background Removal feature (about 413 MB).",
    inputSchema: {
      type: "object",
      properties: {
        image_path: { type: "string", description: "Absolute path to the image (JPG, JPEG, PNG, WebP, or BMP)." },
        output_path: {
          type: "string",
          description: "Optional absolute destination ending in .png. Defaults beside the source as '<name> Background Removed.png'.",
        },
        mode: {
          type: "string",
          enum: ["transparent", "color"],
          default: "transparent",
          description: "transparent keeps a see-through background; color composites onto a solid colour.",
        },
        color: {
          type: "string",
          pattern: "^#[0-9a-fA-F]{6}$",
          description: "Solid background colour as #RRGGBB when mode is color.",
        },
      },
      required: ["image_path"],
      additionalProperties: false,
    },
    annotations: createAnnotations("Remove image background"),
  }),
  tool({
    name: "video_extract_audio",
    title: "Extract audio from video",
    description:
      "Extract a video's audio track to MP3, WAV, or M4A with deterministic local media conversion (no AI generation). Useful on its own or as the first step before transcribe_media, meeting_transcribe, or audio_clean. Requires FFmpeg.",
    inputSchema: {
      type: "object",
      properties: {
        video_path: { type: "string", description: "Absolute path to the source video." },
        format: {
          type: "string",
          enum: ["mp3", "wav", "m4a"],
          default: "mp3",
          description: "Audio output format.",
        },
        output_path: {
          type: "string",
          description: "Optional absolute destination. Defaults beside the source as '<name> Audio.<format>'.",
        },
      },
      required: ["video_path"],
      additionalProperties: false,
    },
    annotations: createAnnotations("Extract audio from video"),
  }),
];

async function audioClean(args) {
  const source = await requireExistingFile(args.audio_path, { label: "audio recording" });
  const quality = args.quality || "recommended";
  if (!["quick", "recommended", "maximum"].includes(quality)) {
    throw new YapsToolError("invalid_input", "quality must be quick, recommended, or maximum.");
  }
  const overwrite = args.overwrite === true;
  const command = ["audio", "clean", source, "--quality", quality];
  if (typeof args.output_path === "string" && args.output_path.trim()) {
    const output = await requireWritableOutput(args.output_path.trim(), {
      overwrite,
      expectedExtension: ".wav",
    });
    command.push("--output", output);
  }
  if (overwrite) command.push("--overwrite");
  const session = await requireActiveAccount();
  const result = await runCli(session, command, {
    timeoutMs: LONG_CLI_TIMEOUT_MS,
    label: "audio cleaning",
  });
  return success(result);
}

async function imageRemoveBackground(args) {
  const source = await requireExistingFile(args.image_path, {
    label: "image",
    extensions: IMAGE_EXTENSIONS,
  });
  const mode = args.mode || "transparent";
  if (!["transparent", "color"].includes(mode)) {
    throw new YapsToolError("invalid_input", "mode must be transparent or color.");
  }
  const parsed = parse(source);
  const output = await requireWritableOutput(
    args.output_path || join(parsed.dir, `${parsed.name} Background Removed.png`),
    { expectedExtension: ".png" },
  );
  const command = ["media", "remove-background", source, "--output", output, "--mode", mode];
  if (mode === "color") {
    const color = typeof args.color === "string" ? args.color.trim() : "";
    if (color && !HEX_COLOR_PATTERN.test(color)) {
      throw new YapsToolError("invalid_input", "color must be a #RRGGBB value such as #f2a65a.");
    }
    if (color) command.push("--color", color);
  }
  const session = await requireActiveAccount();
  const result = await runCli(session, command, {
    timeoutMs: LONG_CLI_TIMEOUT_MS,
    label: "background removal",
  });
  await requireCreatedOutput(output);
  const coverage = typeof result.mask_coverage === "number" ? result.mask_coverage : null;
  return success({
    ...result,
    ...(coverage !== null && coverage < LOW_MASK_COVERAGE
      ? {
        warning:
          "The model found no clear subject in this image (very low mask coverage). Review the output before using it.",
      }
      : {}),
  });
}

async function videoExtractAudio(args) {
  const source = await requireExistingFile(args.video_path, {
    label: "video file",
    extensions: VIDEO_EXTENSIONS,
  });
  const format = args.format || "mp3";
  if (!["mp3", "wav", "m4a"].includes(format)) {
    throw new YapsToolError("invalid_input", "format must be mp3, wav, or m4a.");
  }
  const parsed = parse(source);
  const output = await requireWritableOutput(
    args.output_path || join(parsed.dir, `${parsed.name} Audio.${format}`),
    { expectedExtension: `.${format}` },
  );
  const session = await requireActiveAccount();
  const result = await runCli(session, [
    "media", "extract-audio", source, "--format", format, "--output", output,
  ], { timeoutMs: LONG_CLI_TIMEOUT_MS, label: "audio extraction" });
  await requireCreatedOutput(output);
  return success(result);
}

export const handlers = {
  audio_clean: audioClean,
  image_remove_background: imageRemoveBackground,
  video_extract_audio: videoExtractAudio,
};
