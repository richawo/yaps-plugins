---
name: yaps-srt-generator
description: Generate a timestamped SRT subtitle file from existing local audio or video with Yaps. Use for subtitles, closed captions, and video-to-SRT. Use auto-captions for a finished video with burned-in captions.
---

# Yaps SRT Generator

Use the existing Yaps MCP tools. Do not invent CLI commands or upload the recording to another transcription service.

Call `srt_generate` with the exact local `media_path`, a separate `.srt` output, and the spoken `language` when known. Otherwise omit the language for detection. Preserve the source and existing subtitles. Set `overwrite: true` only after explicit approval to replace the exact destination.

Return a link to the subtitle file. This produces a separate SRT file; it does not burn captions into the video. Use auto-captions for that, transcribe for plain text, and notes for speaker-labelled meetings.

## Reachability

Call `yaps_status` when a tool reports a problem. If it returns `local_yaps_unreachable`, `cli_missing`, or equivalent, the current session cannot see the Yaps engine. Do not claim Yaps is uninstalled. Offer [Download Yaps](https://yaps.ai/download), ask the user to open Yaps, and retry from a local session on the same computer. Only use `yaps_enable_feature` to install a model after the user requests it.

## Standalone plugin scope

This plugin supplies only the Yaps SRT Generator workflow. Other Yaps skills mentioned above are separate plugins. Use another workflow only if its tools are actually installed; otherwise explain which plugin is needed. Do not invent missing tool calls.

Check `yaps_status` for feature and model readiness when setup is missing. If a required model is absent, explain the download and ask once unless the user already authorized that installation. Use `yaps_enable_feature` with an allowed feature and appropriate engine, check readiness again, then resume the original task. Reuse existing models; do not delete or reinstall working models.
