---
name: audio-cleaner
description: Remove noise, hiss, and static from an existing speech recording with Yaps Audio Cleaner. Use for voice, podcast, and interview cleanup. Do not use for separating music stems or changing spoken words.
---

# Yaps Audio Cleaner

Use the existing Yaps MCP tools. Do not invent CLI commands or upload audio to a hosted cleaner.

Use `audio_clean` with the exact local `audio_path` and a separate `.wav` output. Default to `quality: recommended`; choose `quick` for speed or `maximum` only when the user values extra processing over latency. Maximum can take longer than the recording itself. Keep `overwrite` false unless the user explicitly approves replacing that exact output.

Return the cleaned file. Describe it as noise reduction, not guaranteed recovery of inaudible speech. Preserve the source and do not trim or rewrite the spoken content.

## Reachability

Call `yaps_status` when a tool reports a problem. If it returns `local_yaps_unreachable`, `cli_missing`, or equivalent, the current session cannot see the Yaps engine. Do not claim Yaps is uninstalled. Offer [Download Yaps](https://yaps.ai/download), ask the user to open Yaps, and retry from a local session on the same computer. Only use `yaps_enable_feature` to install a model after the user requests it.
