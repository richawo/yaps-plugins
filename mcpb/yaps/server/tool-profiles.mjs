import { YapsToolError } from "./yaps-runtime.mjs";

// Standalone marketplace packages share this runtime. Each profile advertises
// and accepts only its workflow, plus the setup tools that workflow needs.
export const TOOL_PROFILES = {
  dictation: { prefixes: ["dictation_"], features: ["dictation", "cleanup"] },
  transcription: { names: ["transcribe_media"], features: ["subtitles"] },
  meeting: { prefixes: ["meeting_"], features: ["meeting"] },
  speech: { names: ["text_to_speech", "tts_voices"], features: ["reading"] },
  "background-removal": { names: ["image_remove_background"], features: ["background-removal"] },
  "audio-cleaner": { names: ["audio_clean"], features: ["audio-cleaner"] },
  captions: { prefixes: ["captions_"], features: ["auto-captions"] },
  srt: { names: ["srt_generate"], features: ["subtitles"] },
  translation: { prefixes: ["translate_"], features: ["translation"] },
  "video-to-audio": { names: ["video_extract_audio"], features: [] },
  cut: { prefixes: ["cut_"], features: ["auto-cut"] },
};

export function buildToolRegistry(modules, profileName = "") {
  const profile = profileName ? TOOL_PROFILES[profileName] : undefined;
  if (profileName && !profile) throw new Error(`Unknown Yaps tool profile: ${profileName}`);
  const tools = [];
  const handlers = new Map();
  for (const module of modules) {
    for (let definition of module.tools) {
      const name = definition.name;
      if (profile && name !== "yaps_status" &&
          !(name === "yaps_enable_feature" && profile.features.length) &&
          !profile.names?.includes(name) && !profile.prefixes?.some(prefix => name.startsWith(prefix))) continue;
      let handler = module.handlers[name];
      if (profile && name === "yaps_enable_feature") {
        definition = structuredClone(definition);
        definition.inputSchema.properties.feature.enum = [...profile.features];
        const enable = handler;
        handler = async args => {
          if (!profile.features.includes(args.feature)) {
            throw new YapsToolError("invalid_input", `This plugin can enable only: ${profile.features.join(", ")}.`);
          }
          return enable(args);
        };
      }
      tools.push(definition);
      handlers.set(name, handler);
    }
  }
  return { tools, handlers };
}
