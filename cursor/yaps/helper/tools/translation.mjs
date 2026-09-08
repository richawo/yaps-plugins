import { join, parse } from "node:path";
import {
  DEFAULT_CLI_TIMEOUT_MS,
  LONG_CLI_TIMEOUT_MS,
  YapsToolError,
  createAnnotations,
  emptySchema,
  readOnlyAnnotations,
  requireActiveAccount,
  requireCreatedOutput,
  requireExistingFile,
  requireWritableOutput,
  runCli,
  success,
  tool,
} from "../yaps-runtime.mjs";

const TRANSLATABLE_EXTENSIONS = new Set([".md", ".txt", ".srt"]);
const ENGINES = ["auto", "gemmax2", "translategemma"];

const ENGINE_PROPERTY = {
  type: "string",
  enum: ENGINES,
  default: "auto",
  description: "Translation engine. auto follows Yaps' own routing between the installed engines.",
};

export const tools = [
  tool({
    name: "translate_text",
    title: "Translate text locally",
    description:
      "Translate text with the on-device Yaps Accurate Translation engine - private, offline, and without a hosted translation API. Requires an installed translation engine (Standard covers 28 languages, Extended 53). Never fall back to translating in-model when this tool reports an error.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", minLength: 1, description: "Text to translate." },
        to: { type: "string", minLength: 2, description: "Target language code such as fr, de, or pt-BR." },
        from: {
          type: "string",
          minLength: 2,
          description: "Optional source language code. Omit to auto-detect.",
        },
        engine: ENGINE_PROPERTY,
      },
      required: ["text", "to"],
      additionalProperties: false,
    },
    annotations: readOnlyAnnotations("Translate text locally"),
  }),
  tool({
    name: "translate_file",
    title: "Translate file locally",
    description:
      "Translate a Markdown, plain-text, or SRT subtitle file on-device with Yaps, writing a new file and preserving the source. SRT files are translated cue by cue with timestamps preserved.",
    inputSchema: {
      type: "object",
      properties: {
        input_path: { type: "string", description: "Absolute path to a .md, .txt, or .srt file." },
        to: { type: "string", minLength: 2, description: "Target language code such as fr, de, or pt-BR." },
        from: {
          type: "string",
          minLength: 2,
          description: "Optional source language code. Omit to auto-detect.",
        },
        engine: ENGINE_PROPERTY,
        output_path: {
          type: "string",
          description: "Optional absolute destination. Defaults beside the input as '<name>.<language>.<extension>'.",
        },
      },
      required: ["input_path", "to"],
      additionalProperties: false,
    },
    annotations: createAnnotations("Translate file locally"),
  }),
  tool({
    name: "translate_languages",
    title: "List translation languages",
    description:
      "List the installed Yaps translation engines and the language pairs each supports. The first run after install can be slow while multi-gigabyte engine files are verified.",
    inputSchema: emptySchema(),
    annotations: readOnlyAnnotations("List translation languages"),
  }),
];

function languageCode(value, label) {
  if (typeof value !== "string" || value.trim().length < 2) {
    throw new YapsToolError("invalid_input", `${label} must be a language code such as fr, de, or pt-BR.`);
  }
  return value.trim();
}

function engineFlag(engine) {
  if (engine === undefined) return [];
  if (!ENGINES.includes(engine)) {
    throw new YapsToolError("invalid_input", "engine must be auto, gemmax2, or translategemma.");
  }
  return engine === "auto" ? [] : ["--engine", engine];
}

async function translateText(args) {
  if (typeof args.text !== "string" || !args.text.trim()) {
    throw new YapsToolError("invalid_input", "text is required.");
  }
  const command = ["translate", "--text", args.text, "--to", languageCode(args.to, "to")];
  if (args.from !== undefined) command.push("--from", languageCode(args.from, "from"));
  command.push(...engineFlag(args.engine));
  const session = await requireActiveAccount();
  return success(await runCli(session, command, {
    timeoutMs: DEFAULT_CLI_TIMEOUT_MS,
    label: "translation",
  }));
}

async function translateFile(args) {
  const source = await requireExistingFile(args.input_path, {
    label: "input file",
    extensions: TRANSLATABLE_EXTENSIONS,
  });
  const to = languageCode(args.to, "to");
  const parsed = parse(source);
  const output = await requireWritableOutput(
    args.output_path || join(parsed.dir, `${parsed.name}.${to}${parsed.ext}`),
  );
  const command = ["translate", source, "--to", to, "--output", output];
  if (args.from !== undefined) command.push("--from", languageCode(args.from, "from"));
  command.push(...engineFlag(args.engine));
  const session = await requireActiveAccount();
  const result = await runCli(session, command, {
    timeoutMs: LONG_CLI_TIMEOUT_MS,
    label: "file translation",
  });
  await requireCreatedOutput(output);
  return success(result);
}

async function translateLanguages() {
  const session = await requireActiveAccount();
  return success(await runCli(session, ["translate", "--list-languages"], {
    timeoutMs: LONG_CLI_TIMEOUT_MS,
    label: "language listing",
  }));
}

export const handlers = {
  translate_text: translateText,
  translate_file: translateFile,
  translate_languages: translateLanguages,
};
