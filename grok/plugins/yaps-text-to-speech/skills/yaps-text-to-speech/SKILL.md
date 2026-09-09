---
name: yaps-text-to-speech
description: Read text or a text file aloud as a local WAV through the existing Yaps MCP speech tools. Use for text-to-speech, narration, voice-over, or speaking English or other supported languages with a Yaps voice. Do not use for transcribing media or live dictation.
---

# Yaps Read-aloud

Use the existing Yaps MCP tools. Do not invent shell commands, PATH edits, or a second CLI.

## Tools

- `yaps_status` : call first when any other Yaps tool reports a problem.
- `tts_voices` : list installed reading engines and voice ids before synthesizing.
- `text_to_speech` : synthesize text or a text file to a local WAV (or raw PCM only if requested). Prefer `text_file` for long or multiline text. Pass `language` for non-English text so Supertonic is used.
- `yaps_enable_feature` : only after the user explicitly asks to install a reading voice.

## Reachability

This plugin is local-only and requires the installed Yaps desktop app. If tools return `local_yaps_unreachable`, `cli_missing`, or equivalent, the current Grok session cannot see the Yaps engine on this computer. Do not claim Yaps is uninstalled. Offer [Download Yaps](https://yaps.ai/download), ask the user to open the app on this machine, and retry from a local Grok session.

## Boundaries

- Do not silently send the text to an unrelated hosted speech service.
- Preserve the user's text; do not rewrite the script unless requested.
- Never replace an existing output file without explicit approval.
- Use the transcribe or dictation skills for speech-to-text.

## Standalone plugin scope

This plugin supplies only the Yaps Text to Speech workflow. Other Yaps skills mentioned above are separate plugins. Use another workflow only if its tools are actually installed; otherwise explain which plugin is needed. Do not invent missing tool calls.

Check `yaps_status` for feature and model readiness when setup is missing. If a required model is absent, explain the download and ask once unless the user already authorized that installation. Use `yaps_enable_feature` with an allowed feature and appropriate engine, check readiness again, then resume the original task. Reuse existing models; do not delete or reinstall working models.
