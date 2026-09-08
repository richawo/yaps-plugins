import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCutHandlers, cutSettingsArguments, tools } from "../helper/tools/cut.mjs";

function fixture(overrides = {}) {
  const calls = [];
  const handlers = createCutHandlers({
    requireActiveAccount: async () => ({ path: "/fixture/yaps_cli", appVersion: "2.3.2129" }),
    runCli: async (_session, args, options) => { calls.push({ args, options }); return { ok: true, requires_redetect: args[1] === "set" }; },
    ...overrides,
  });
  return { handlers, calls };
}

test("Auto Cut exposes every native operation with matching handlers", () => {
  const { handlers } = fixture();
  assert.equal(tools.length, 11);
  assert.deepEqual(tools.map(t => t.name).sort(), Object.keys(handlers).sort());
  assert.equal(tools.find(t => t.name === "cut_delete").annotations.destructiveHint, true);
  assert.equal(tools.find(t => t.name === "cut_plan").annotations.readOnlyHint, true);
});

test("Auto Cut maps review and editing calls to the exact native verbs", async () => {
  const { handlers, calls } = fixture();
  for (const name of ["presets", "list", "show", "plan", "export_plan", "redetect"]) {
    await handlers[`cut_${name}`]({ project_id: "autocut-123", full: true });
  }
  const changed = await handlers.cut_set({ project_id: "autocut-123", speech_threshold: 0.4, normalize_loudness: false, refine_boundaries: true, auto_noise_floor: true });
  assert.equal(changed.structuredContent.requires_redetect, true);
  assert.deepEqual(calls.map(c => c.args), [
    ["cut", "presets"], ["cut", "list"], ["cut", "show", "autocut-123", "--full"],
    ["cut", "plan", "autocut-123"], ["cut", "export-plan", "autocut-123"],
    ["cut", "redetect", "autocut-123"],
    ["cut", "set", "autocut-123", "--speech-threshold", "0.4", "--no-normalize-loudness", "--refine-boundaries", "--auto-noise-floor"],
  ]);
});

test("Auto Cut refuses unsupported versions and unconfirmed deletion before execution", async () => {
  const old = fixture({ requireActiveAccount: async () => ({ appVersion: "2.3.847" }) });
  await assert.rejects(old.handlers.cut_presets({}), { code: "auto_cut_requires_update" });
  assert.equal(old.calls.length, 0);
  const { handlers, calls } = fixture();
  await assert.rejects(handlers.cut_delete({ project_id: "autocut-123" }), { code: "confirmation_required" });
  await assert.rejects(handlers.cut_show({ project_id: "--help" }), { code: "invalid_input" });
  assert.equal(calls.length, 0);
  await handlers.cut_delete({ project_id: "autocut-123", confirm: true });
  assert.deepEqual(calls[0].args, ["cut", "delete", "autocut-123"]);
});

test("Auto Cut validates knobs and preserves native custom-preset semantics", () => {
  assert.deepEqual(cutSettingsArguments({ pause_budget_ms: 200, noise_floor_db: -50 }), ["--pause-budget-ms", "200", "--noise-floor-db", "-50"]);
  for (const args of [{ preset: "tight", pause_budget_ms: 200 }, { speech_threshold: NaN }, { lead_in_ms: -1 }, { normalize_loudness: "false" }]) {
    assert.throws(() => cutSettingsArguments(args), { code: "invalid_input" });
  }
});

test("Auto Cut preserves paths with spaces and defaults new projects to natural", async () => {
  const root = await mkdtemp(join(tmpdir(), "yaps-cut-contract-"));
  try {
    const source = join(root, "a video.mp4");
    await writeFile(source, "source");
    const { handlers, calls } = fixture();
    await handlers.cut_create({ video_path: source });
    assert.deepEqual(calls[0].args, ["cut", "create", source, "--preset", "natural"]);
    await handlers.cut_create({ video_path: source, pause_budget_ms: 200 });
    assert.deepEqual(calls[1].args, ["cut", "create", source, "--pause-budget-ms", "200"]);
    assert.equal(await readFile(source, "utf8"), "source");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("Auto Cut refuses existing outputs and checks the actual rendered file", async () => {
  const root = await mkdtemp(join(tmpdir(), "yaps-cut-output-"));
  try {
    const output = join(root, "video (Cut).mp4");
    await writeFile(output, "keep me");
    const { handlers, calls } = fixture();
    await assert.rejects(handlers.cut_render({ project_id: "autocut-123", output_path: output }), { code: "output_exists" });
    assert.equal(calls.length, 0);
    assert.equal(await readFile(output, "utf8"), "keep me");
    await assert.rejects(handlers.cut_render({ project_id: "autocut-123", output_path: join(root, "missing.mp4") }), { code: "output_missing" });
    assert.deepEqual(calls[0].args, ["cut", "render", "autocut-123", "--output", join(root, "missing.mp4")]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("Auto Cut serializes renders and releases the guard after a failed export", async () => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const { handlers } = fixture({ requireWritableOutput: async () => pending, requireCreatedOutput: async () => {} });
  const args = { project_id: "autocut-123", output_path: "/tmp/result.mp4" };
  const first = handlers.cut_render(args);
  await assert.rejects(handlers.cut_render(args), { code: "render_in_progress" });
  release("/tmp/result.mp4");
  await first;
  await handlers.cut_render(args);
});
