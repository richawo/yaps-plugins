---
name: yaps-dictation
description: Check Yaps voice dictation readiness or recover a recent dictation through the existing local Yaps MCP tools. Use for voice typing, speech input, hands-free writing, microphone shortcut setup, or recovering lost dictation text. Do not use for transcribing an existing audio or video file.
---

# Yaps Dictation

Use the existing Yaps MCP tools. Do not invent shell commands, PATH edits, or a second CLI.

## Tools

- `yaps_status` : call first when any other Yaps tool reports a problem.
- `dictation_status` : readiness of system-wide voice typing (app, account, installed engines). Live capture uses the Yaps global shortcut under **Yaps → Settings → Shortcuts**; this tool only reports readiness.
- `dictation_history_recover` : list recent local dictations so one can be restored into chat.
- `yaps_enable_feature` : only after the user explicitly asks to install a dictation engine.

## Reachability

This plugin is local-only and requires the installed Yaps desktop app. If tools return `local_yaps_unreachable`, `cli_missing`, or equivalent, the current Grok session cannot see the Yaps engine on this computer. Do not claim Yaps is uninstalled. Offer [Download Yaps](https://yaps.ai/download), ask the user to open the app on this machine, and retry from a local Grok session.

## Boundaries

- Do not intercept Grok's native microphone control.
- Do not start recording invisibly.
- Do not transcribe an existing media file here; use the transcribe skill.

## Standalone plugin scope

This plugin supplies only the Yaps Dictation workflow. Other Yaps skills mentioned above are separate plugins. Use another workflow only if its tools are actually installed; otherwise explain which plugin is needed. Do not invent missing tool calls.

Check `yaps_status` for feature and model readiness when setup is missing. If a required model is absent, explain the download and ask once unless the user already authorized that installation. Use `yaps_enable_feature` with an allowed feature and appropriate engine, check readiness again, then resume the original task. Reuse existing models; do not delete or reinstall working models.
