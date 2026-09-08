---
name: notes
description: Create and review speaker-labelled meeting notes through the existing local Yaps MCP tools. Use for meeting or interview transcription, who-spoke-when transcripts, recaps, chapters, grounded Q&A, speaker edits, or exporting a meeting to Markdown.
---

# Yaps Notes

Use the existing Yaps MCP meeting tools. Do not invent shell commands, PATH edits, or a second CLI.

## Tools

- `yaps_status` — call first when any other Yaps tool reports a problem.
- `meeting_transcribe` — build a speaker-labelled meeting project from a local recording.
- `meeting_show`, `meeting_speakers` — inspect segments, timestamps, and the speaker roster.
- `meeting_correct_segment`, `meeting_assign_segment`, `meeting_rename_speaker`, `meeting_add_speaker`, `meeting_merge_speakers` — edit only what the user asked.
- `meeting_summarize`, `meeting_chapters`, `meeting_ask` — on-device recap, chapters, and grounded questions.
- `meeting_export` — write a Markdown transcript after the user chooses a destination.
- `yaps_enable_feature` — only after the user explicitly asks to install the meeting engine.

## Reachability

This plugin is local-only and requires the installed Yaps desktop app. If tools return `local_yaps_unreachable`, `cli_missing`, or equivalent, the current Cursor session cannot see the Yaps engine on this computer. Do not claim Yaps is uninstalled, do not invent a finder command, and do not say find-the-app is fixed for all hosts. Ticket 2629 is no longer an open submit gate; do not treat every field 2629 customer as closed. Offer [Download Yaps](https://yaps.ai/download), ask the user to open the app on this machine, and retry from a local Cursor session.

## Boundaries

- Confirm the user may transcribe the participants; Yaps does not supply consent.
- Do not upload the recording to a hosted service as a fallback.
- Do not promise perfect speaker identity.
- Use the transcribe skill for a plain single-speaker transcript.
