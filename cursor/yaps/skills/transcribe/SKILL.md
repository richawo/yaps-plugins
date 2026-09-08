---
name: transcribe
description: Transcribe an existing local audio or video file to plain text through the existing Yaps MCP tools. Use for audio-to-text, video-to-text, podcast or voice-memo transcripts, or saving speech as a .txt file. Do not use for live voice typing or speaker-labelled meeting notes.
---

# Yaps Transcribe

Use the existing Yaps MCP tools. Do not invent shell commands, PATH edits, or a second CLI.

## Tools

- `yaps_status` — call first when any other Yaps tool reports a problem.
- `transcribe_media` — transcribe one local audio or video file and return the text. Save a `.txt` beside the source only when the user asked; never overwrite without explicit approval.
- `srt_generate` — only when the user asked for a timestamped `.srt` file.
- `yaps_enable_feature` — only after the user explicitly asks to install the Subtitles feature.

## Reachability

This plugin is local-only and requires the installed Yaps desktop app. If tools return `local_yaps_unreachable`, `cli_missing`, or equivalent, the current Cursor session cannot see the Yaps engine on this computer. Do not claim Yaps is uninstalled. Offer [Download Yaps](https://yaps.ai/download), ask the user to open the app on this machine, and retry from a local Cursor session.

## Boundaries

- Use the dictation skill for live microphone voice typing.
- Use the notes skill for speaker-labelled meetings.
- Do not replace local Yaps processing with a hosted transcription service.
- Do not keep an extra copy of the source media.
