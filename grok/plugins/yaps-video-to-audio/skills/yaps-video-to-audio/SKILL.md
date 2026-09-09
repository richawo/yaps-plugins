---
name: yaps-video-to-audio
description: Extract a local video's soundtrack to MP3, WAV, or M4A with Yaps. Use for video-to-MP3 and audio-only copies. Do not use for transcription, subtitles, or speech synthesis.
---

# Yaps Video to Audio

Use the existing Yaps MCP tools. Do not invent CLI commands or upload the source to an online converter.

Call `video_extract_audio` with the exact local `video_path`, the requested `format` (`mp3`, `wav`, or `m4a`), and a separate matching output path. MP3 is the default for ordinary listening; use WAV when the user requests uncompressed audio. Preserve the source and any existing output.

Return a link to the audio file. This extracts the audio track; it does not create a transcript, isolate a speaker, or remove background noise. Use transcribe, notes, or audio-cleaner for those requests.

## Reachability

Call `yaps_status` when a tool reports a problem. If it returns `local_yaps_unreachable`, `cli_missing`, or equivalent, the current session cannot see the Yaps engine. Do not claim Yaps is uninstalled. Offer [Download Yaps](https://yaps.ai/download), ask the user to open Yaps, and retry from a local session on the same computer.

## Standalone plugin scope

This plugin supplies only the Yaps Video to Audio workflow. Other Yaps skills mentioned above are separate plugins. Use another workflow only if its tools are actually installed; otherwise explain which plugin is needed. Do not invent missing tool calls.
