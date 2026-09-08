---
name: translation
description: Translate text, Markdown, plain-text files, or SRT subtitles with the local Yaps Accurate Translation engine. Use for private on-device translation. Do not use for live speech or generating a transcript from media.
---

# Yaps Translation

Use the existing Yaps MCP translation tools. Do not invent CLI commands, silently substitute model-written translation, or send the content to a hosted translator when Yaps fails.

- Use `translate_languages` to check installed engines and supported languages when needed.
- Use `translate_text` for text supplied in the conversation. Set `to` to the target language code and supply `from` only when the source language is known. Leave `engine: auto` unless the user requests a specific supported engine.
- Use `translate_file` for a local `.md`, `.txt`, or `.srt` file, with a separate destination. SRT translation preserves cue timestamps. Do not overwrite the source or existing translations.

Preserve meaning, names, and intended formatting. Return the translated text or a link to the new file and identify the target language. Report unsupported language pairs accurately.

## Reachability

Call `yaps_status` when a tool reports a problem. If it returns `local_yaps_unreachable`, `cli_missing`, or equivalent, the current session cannot see the Yaps engine. Do not claim Yaps is uninstalled. Offer [Download Yaps](https://yaps.ai/download), ask the user to open Yaps, and retry from a local session on the same computer. Only use `yaps_enable_feature` to install a model after the user requests it.
