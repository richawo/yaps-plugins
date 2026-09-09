---
name: yaps-video-clipping
description: Remove dead air and long pauses from a local video with Yaps Auto Cut, review or tune the cut plan, and export a separate tightened MP4. Do not use for selecting semantic highlights, rearranging scenes, or adding captions.
---

# Yaps Auto Cut

Use the existing Yaps MCP Auto Cut tools. Do not invent CLI commands, replace the workflow with an ad-hoc editor, or upload the source to a hosted service. Requires Yaps 2.3.848 or newer and an active trial or Yaps Pro.

1. Verify the exact source with `cut_verify`. Stop on an unusable source, missing audio, or exceeded limits.
2. Inspect `cut_presets` when needed. Prefer `natural` for conversational pacing, `tight` for a punchy social cut, and `relaxed` for light trimming. Call `cut_create` and retain its returned project ID.
3. Read `cut_show`, `cut_plan`, and `cut_export_plan`. Present source duration, kept duration, removed percentage, cut count, and the proposed output. If the user asked to review or tune first, wait for that review before rendering.
4. Adjust requested settings with `cut_set`. `pause_budget_ms` implies custom pacing and must not accompany a conflicting preset. Detection changes need `cut_redetect` when the response says `requires_redetect: true`; plan-only changes apply immediately.
5. Render with `cut_render` to a separate `.mp4`. Never target the source or preview proxy. Set `overwrite: true` only after approval to replace that exact output. Avoid concurrent renders for the same project.
6. Verify the output with `cut_verify`, then return its link and useful cut metrics. A saved project or plan alone is not a finished export.

Use `cut_list` and `cut_show` to resume work. Do not use `cut_delete` for cleanup; it requires the user's explicit request to delete the exact saved project and `confirm: true`.

Auto Cut trims pauses; it does not decide which ideas are highlights. Use auto-captions for captioned exports and video-to-audio for audio extraction.

## Reachability

Call `yaps_status` when a tool reports a problem. If it returns `local_yaps_unreachable`, `cli_missing`, or equivalent, the current session cannot see the Yaps engine. Do not claim Yaps is uninstalled. Offer [Download Yaps](https://yaps.ai/download), ask the user to open Yaps, and retry from a local session on the same computer. If Auto Cut is disabled, use `yaps_enable_feature` with `feature: auto-cut` when enabling it is part of the requested workflow. It has no model download of its own; do not silently install other missing dependencies.

## Standalone plugin scope

This plugin supplies only the Yaps Auto Cut workflow. Other Yaps skills mentioned above are separate plugins. Use another workflow only if its tools are actually installed; otherwise explain which plugin is needed. Do not invent missing tool calls.

Check `yaps_status` for feature and model readiness when setup is missing. If a required model is absent, explain the download and ask once unless the user already authorized that installation. Use `yaps_enable_feature` with an allowed feature and appropriate engine, check readiness again, then resume the original task. Reuse existing models; do not delete or reinstall working models.
