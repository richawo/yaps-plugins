import assert from "node:assert/strict";
import test from "node:test";
import { buildToolRegistry, TOOL_PROFILES } from "../helper/tool-profiles.mjs";

const modules = await Promise.all(["status", "dictation", "transcription", "captions", "media", "speech", "translation", "meeting", "cut"].map(name => import(`../helper/tools/${name}.mjs`)));
const expected = {
  dictation: ["dictation_history_recover", "dictation_status"],
  transcription: ["transcribe_media"],
  meeting: ["meeting_transcribe", "meeting_show", "meeting_speakers", "meeting_summarize", "meeting_chapters", "meeting_ask", "meeting_correct_segment", "meeting_assign_segment", "meeting_rename_speaker", "meeting_add_speaker", "meeting_merge_speakers", "meeting_export"],
  speech: ["text_to_speech", "tts_voices"],
  "background-removal": ["image_remove_background"],
  "audio-cleaner": ["audio_clean"],
  captions: ["captions_styles", "captions_create", "captions_show", "captions_correct", "captions_replace", "captions_split", "captions_merge", "captions_set_style", "captions_reset", "captions_render", "captions_verify"],
  srt: ["srt_generate"], translation: ["translate_text", "translate_file", "translate_languages"],
  "video-to-audio": ["video_extract_audio"],
  cut: ["cut_presets", "cut_verify", "cut_create", "cut_list", "cut_show", "cut_plan", "cut_export_plan", "cut_set", "cut_redetect", "cut_render", "cut_delete"],
};

test("each standalone profile exposes exactly its workflow and applicable setup", () => {
  for (const [profile, names] of Object.entries(expected)) {
    const registry = buildToolRegistry(modules, profile);
    const setup = TOOL_PROFILES[profile].features.length ? ["yaps_status", "yaps_enable_feature"] : ["yaps_status"];
    const allowed = [...names, ...setup].sort();
    assert.deepEqual(registry.tools.map(tool => tool.name).sort(), allowed, profile);
    assert.deepEqual([...registry.handlers.keys()].sort(), allowed, profile);
  }
});

test("profile rejects unrelated model downloads even when callers ignore its schema", async () => {
  let calls = 0;
  const fake = [{ tools: [{ name: "yaps_enable_feature", inputSchema: { properties: { feature: { enum: ["dictation", "background-removal"] } } } }], handlers: { yaps_enable_feature: async () => { calls++; return { ok: true }; } } }];
  const registry = buildToolRegistry(fake, "background-removal");
  assert.deepEqual(registry.tools[0].inputSchema.properties.feature.enum, ["background-removal"]);
  await assert.rejects(registry.handlers.get("yaps_enable_feature")({ feature: "dictation" }), { code: "invalid_input" });
  assert.equal(calls, 0);
  assert.deepEqual(await registry.handlers.get("yaps_enable_feature")({ feature: "background-removal" }), { ok: true });
  assert.equal(calls, 1);
  assert.deepEqual(fake[0].tools[0].inputSchema.properties.feature.enum, ["dictation", "background-removal"]);
});

test("unknown profiles fail closed and the existing bundle retains all tools", () => {
  assert.throws(() => buildToolRegistry(modules, "typo"), /Unknown Yaps tool profile/);
  assert.equal(buildToolRegistry(modules).tools.length, 48);
});
