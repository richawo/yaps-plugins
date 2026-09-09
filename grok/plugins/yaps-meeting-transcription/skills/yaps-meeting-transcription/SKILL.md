---
name: yaps-meeting-transcription
description: Create and review speaker-labelled meeting notes through the existing local Yaps MCP tools. Use for meeting or interview transcription, who-spoke-when transcripts, recaps, chapters, grounded Q&A, speaker edits, or exporting a meeting to Markdown.
---

# Yaps Notes

Use the existing Yaps MCP meeting tools. Do not invent shell commands, PATH edits, or a second CLI.

## Tools

- `yaps_status` : call first when any other Yaps tool reports a problem.
- `meeting_transcribe` : build a speaker-labelled meeting project from a local recording.
- `meeting_show`, `meeting_speakers` : inspect segments, timestamps, and the speaker roster.
- `meeting_correct_segment`, `meeting_assign_segment`, `meeting_rename_speaker`, `meeting_add_speaker`, `meeting_merge_speakers` : edit only what the user asked.
- `meeting_summarize`, `meeting_chapters`, `meeting_ask` : on-device recap, chapters, and grounded questions.
- `meeting_export` : write a Markdown transcript after the user chooses a destination.
- `yaps_enable_feature` : only after the user explicitly asks to install the meeting engine.

## Reachability

This plugin is local-only and requires the installed Yaps desktop app. If tools return `local_yaps_unreachable`, `cli_missing`, or equivalent, the current Grok session cannot see the Yaps engine on this computer. Do not claim Yaps is uninstalled. Offer [Download Yaps](https://yaps.ai/download), ask the user to open the app on this machine, and retry from a local Grok session.

## Boundaries

- Confirm the user may transcribe the participants; Yaps does not supply consent.
- Do not upload the recording to a hosted service as a fallback.
- Do not promise perfect speaker identity.
- Use the transcribe skill for a plain single-speaker transcript.

## Standalone plugin scope

This plugin supplies only the Yaps Meeting Notes workflow. Other Yaps skills mentioned above are separate plugins. Use another workflow only if its tools are actually installed; otherwise explain which plugin is needed. Do not invent missing tool calls.

Check `yaps_status` for feature and model readiness when setup is missing. If a required model is absent, explain the download and ask once unless the user already authorized that installation. Use `yaps_enable_feature` with an allowed feature and appropriate engine, check readiness again, then resume the original task. Reuse existing models; do not delete or reinstall working models.
