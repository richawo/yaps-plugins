---
name: yaps-auto-captions
description: Add styled, timed captions to a local video with Yaps and export a new captioned MP4. Use for animated captions, word highlighting, and burned-in subtitles. Use srt-generator for a separate subtitle file.
---

# Yaps Auto Captions

Use the existing Yaps MCP tools. Do not invent CLI commands or use a hosted captioning service as a fallback.

1. Check the exact source with `captions_verify` and inspect templates with `captions_styles`.
2. Create an editable project with `captions_create`. Use the returned project ID for subsequent actions.
3. Inspect `captions_show`. Apply requested edits with `captions_correct`, `captions_replace`, `captions_split`, `captions_merge`, or `captions_set_style`. Preserve the spoken wording unless the user asks for a correction. `captions_reset` discards edits, so use it only after explicit approval.
4. Render with `captions_render` to a separate `.mp4`, then verify the result with `captions_verify`. Never target the source. Only set `overwrite: true` after approval to replace the exact existing output.

Return a link to the captioned video. A saved caption project is not a completed video export. Use the transcribe skill for plain text and srt-generator for a separate `.srt` file.

## Reachability

Call `yaps_status` when a tool reports a problem. If it returns `local_yaps_unreachable`, `cli_missing`, or equivalent, the current session cannot see the Yaps engine. Do not claim Yaps is uninstalled. Offer [Download Yaps](https://yaps.ai/download), ask the user to open Yaps, and retry from a local session on the same computer. Only use `yaps_enable_feature` to install a model after the user requests it.

## Standalone plugin scope

This plugin supplies only the Yaps Auto Captions workflow. Other Yaps skills mentioned above are separate plugins. Use another workflow only if its tools are actually installed; otherwise explain which plugin is needed. Do not invent missing tool calls.

Check `yaps_status` for feature and model readiness when setup is missing. If a required model is absent, explain the download and ask once unless the user already authorized that installation. Use `yaps_enable_feature` with an allowed feature and appropriate engine, check readiness again, then resume the original task. Reuse existing models; do not delete or reinstall working models.
