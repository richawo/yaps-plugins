import { homedir, tmpdir } from "node:os";
import { join, parse } from "node:path";
import {
  LONG_CLI_TIMEOUT_MS,
  YapsToolError,
  createAnnotations,
  emptySchema,
  featureById,
  pathExists,
  readOnlyAnnotations,
  requireActiveAccount,
  requireCreatedOutput,
  requireExistingFile,
  requireWritableOutput,
  runCli,
  success,
  tool,
} from "../yaps-runtime.mjs";

const SUPERTONIC_TAG_PATTERN = /^supertonic:\d:[a-z]{2}(?:-[A-Za-z]{2})?$/;

export const tools = [
  tool({
    name: "text_to_speech",
    title: "Synthesize speech",
    description:
      "Convert text (or a text file) into a local WAV or raw PCM speech file with an installed Yaps voice engine: Kokoro (English), Chatterbox (expressive English, Apple Silicon), or Supertonic (24 European languages). For non-English text pass language so the multilingual Supertonic voice is used. Requires a Reading voice installed via yaps_enable_feature.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to speak. Provide exactly one of text or text_file." },
        text_file: {
          type: "string",
          description: "Absolute path to a text file to speak. Prefer this for long text.",
        },
        mode: {
          type: "string",
          enum: ["auto", "kokoro", "chatterbox", "supertonic"],
          description: "Voice engine. Omit or auto to follow the app's configured voice.",
        },
        voice: {
          type: "string",
          description: "Engine-specific voice id. Supertonic accepts a speaker id 0-9 or a full supertonic:<sid>:<lang> tag.",
        },
        language: {
          type: "string",
          description: "ISO language code for non-English speech (for example de, es, fr). Routes synthesis to the Supertonic engine.",
        },
        output_path: {
          type: "string",
          description: "Optional absolute destination. Defaults to a new 'Yaps Speech <timestamp>.wav' in the Downloads folder.",
        },
        format: {
          type: "string",
          enum: ["wav", "pcm"],
          default: "wav",
          description: "Output format.",
        },
      },
      additionalProperties: false,
    },
    annotations: createAnnotations("Synthesize speech"),
  }),
  tool({
    name: "tts_voices",
    title: "List Yaps voices",
    description:
      "List the Yaps reading voice engines with install state and model ids, so the right mode can be chosen for text_to_speech.",
    inputSchema: emptySchema(),
    annotations: readOnlyAnnotations("List Yaps voices"),
  }),
];

function supertonicVoiceTag(voice, language) {
  const trimmedVoice = typeof voice === "string" ? voice.trim() : "";
  if (SUPERTONIC_TAG_PATTERN.test(trimmedVoice)) return trimmedVoice;
  const speaker = /^\d$/.test(trimmedVoice) ? trimmedVoice : "0";
  return `supertonic:${speaker}:${language}`;
}

async function defaultSpeechOutput(extension) {
  const downloads = join(homedir(), "Downloads");
  const directory = await pathExists(downloads) ? downloads : tmpdir();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return join(directory, `Yaps Speech ${stamp}${extension}`);
}

async function textToSpeech(args) {
  const hasText = typeof args.text === "string" && args.text.trim().length > 0;
  const hasTextFile = typeof args.text_file === "string" && args.text_file.trim().length > 0;
  if (hasText === hasTextFile) {
    throw new YapsToolError("invalid_input", "Provide exactly one of text or text_file.");
  }
  const format = args.format || "wav";
  if (!["wav", "pcm"].includes(format)) {
    throw new YapsToolError("invalid_input", "format must be wav or pcm.");
  }
  const language = typeof args.language === "string" ? args.language.trim().toLowerCase() : "";
  let mode = typeof args.mode === "string" && args.mode.trim() ? args.mode.trim() : undefined;
  let voice = typeof args.voice === "string" && args.voice.trim() ? args.voice.trim() : undefined;
  if (language && language !== "en") {
    // Supertonic's voice tag is the only way to select a non-default language;
    // Kokoro and Chatterbox silently drop characters they cannot pronounce.
    if (mode && mode !== "supertonic" && mode !== "auto") {
      throw new YapsToolError(
        "invalid_input",
        `Non-English speech uses the Supertonic engine; mode ${mode} cannot speak ${language}. Omit mode or set it to supertonic.`,
      );
    }
    mode = "supertonic";
    voice = supertonicVoiceTag(voice, language);
  }

  const extension = format === "pcm" ? ".pcm" : ".wav";
  const output = await requireWritableOutput(
    args.output_path || await defaultSpeechOutput(extension),
    { expectedExtension: extension },
  );

  const command = ["speech", "synthesize", "--format", format, "--output", output];
  if (hasText) command.push("--text", args.text);
  if (hasTextFile) {
    command.push("--text-file", await requireExistingFile(args.text_file, { label: "text file" }));
  }
  if (mode) command.push("--mode", mode);
  if (voice) command.push("--voice", voice);

  const session = await requireActiveAccount();
  const result = await runCli(session, command, {
    timeoutMs: LONG_CLI_TIMEOUT_MS,
    label: "speech synthesis",
  });
  await requireCreatedOutput(output);
  return success(result);
}

async function ttsVoices() {
  const session = await requireActiveAccount();
  const inventory = await runCli(session, ["features", "list"], { label: "voice listing" });
  const reading = featureById(inventory, "reading");
  if (!reading) {
    throw new YapsToolError(
      "feature_unavailable",
      "The installed Yaps app did not report its reading voices. Update Yaps from https://yaps.ai/download and retry.",
    );
  }
  return success({
    enabled: reading.enabled,
    active_mode: reading.active_mode || null,
    voices: reading.modes,
    install_hint:
      "Install a voice with yaps_enable_feature (feature reading, mode_or_engine kokoro | chatterbox | supertonic) after the user explicitly asks.",
  });
}

export const handlers = {
  text_to_speech: textToSpeech,
  tts_voices: ttsVoices,
};
