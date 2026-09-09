---
name: yaps-transcription
description: Transcribe an existing local audio or video file to plain text through the existing Yaps MCP tools. Use for audio-to-text, video-to-text, podcast or voice-memo transcripts, or saving speech as a .txt file. Do not use for live voice typing or speaker-labelled meeting notes.
---

# Yaps Transcribe

Use the existing Yaps MCP tools. Do not invent shell commands, PATH edits, or a second CLI.

## Tools

- `yaps_status` : call first when any other Yaps tool reports a problem.
- `transcribe_media` : transcribe one local audio or video file and return the text. Save a `.txt` beside the source only when the user asked; never overwrite without explicit approval.
- `yaps_enable_feature` : only after the user explicitly asks to install the Subtitles feature.

## Reachability

This plugin is local-only and requires the installed Yaps desktop app. If tools return `local_yaps_unreachable`, `cli_missing`, or equivalent, the current Grok session cannot see the Yaps engine on this computer. Do not claim Yaps is uninstalled. Offer [Download Yaps](https://yaps.ai/download), ask the user to open the app on this machine, and retry from a local Grok session.

## Boundaries

- Use the dictation skill for live microphone voice typing.
- Use the notes skill for speaker-labelled meetings.
- Do not replace local Yaps processing with a hosted transcription service.
- Do not keep an extra copy of the source media.

## Standalone plugin scope

This plugin supplies only the Yaps Transcription workflow. Other Yaps skills mentioned above are separate plugins. Use another workflow only if its tools are actually installed; otherwise explain which plugin is needed. Do not invent missing tool calls.

Check `yaps_status` for feature and model readiness when setup is missing. If a required model is absent, explain the download and ask once unless the user already authorized that installation. Use `yaps_enable_feature` with an allowed feature and appropriate engine, check readiness again, then resume the original task. Reuse existing models; do not delete or reinstall working models.
