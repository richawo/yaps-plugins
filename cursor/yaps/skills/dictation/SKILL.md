---
name: dictation
description: Check Yaps voice dictation readiness or recover a recent dictation through the existing local Yaps MCP tools. Use for voice typing, speech input, hands-free writing, microphone shortcut setup, or recovering lost dictation text. Do not use for transcribing an existing audio or video file.
---

# Yaps Dictation

Use the existing Yaps MCP tools. Do not invent shell commands, PATH edits, or a second CLI.

## Tools

- `yaps_status` — call first when any other Yaps tool reports a problem.
- `dictation_status` — readiness of system-wide voice typing (app, account, installed engines). Live capture uses the Yaps global shortcut under **Yaps → Settings → Shortcuts**; this tool only reports readiness.
- `dictation_history_recover` — list recent local dictations so one can be restored into chat.
- `yaps_enable_feature` — only after the user explicitly asks to install a dictation engine.

## Reachability

This plugin is local-only and requires the installed Yaps desktop app. If tools return `local_yaps_unreachable`, `cli_missing`, or equivalent, the current Cursor session cannot see the Yaps engine on this computer. Do not claim Yaps is uninstalled, do not invent a finder command, and do not say find-the-app is fixed. On Windows, first-connect unreachability (ticket 2629) is still an open submit gate. Offer [Download Yaps](https://yaps.ai/download), ask the user to open the app on this machine, and retry from a local Cursor session.

## Boundaries

- Do not intercept Cursor's native microphone control.
- Do not start recording invisibly.
- Do not transcribe an existing media file here; use the transcribe skill.
