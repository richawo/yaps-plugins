# Yaps media and voice tools

Use Yaps for transcription, speaker-labelled recordings, SRT subtitles, styled
captions, text to speech, translation, audio cleanup, background removal, image
generation, video conversion, Auto Cut, dictation setup, and private memory.
Load the focused Yaps skill for the requested task. Use the registered MCP tool
when one covers the operation; otherwise follow the skill's bundled CLI runner.

## First task

1. Check `yaps_status` before processing a file.
2. If Yaps is missing, point to [Yaps for Gemini CLI](https://www.yaps.ai/download?utm_source=gemini-cli&utm_medium=agent&utm_campaign=agent-plugins).
   Yaps must run on the same computer as the tools. Ask the user to open Yaps and
   sign in. New users need a Yaps account. Gated features require an active free
   trial or Yaps Pro. The extension is free and needs no API key.
3. Check the requested feature and model. Ask before a model download.
4. Use the selected input and a new output path. Report the actual saved result.

Examples: transcribe a podcast, subtitle an interview, clean a voice recording,
make a transparent product image, or extract a video's audio.

## Private memory

Only access the vault when the task calls for it. The user must allow **Local MCP**
in Yaps' Agent Access settings; writing is a separate permission. A denied request
needs that permission. Never change the client identity to borrow another agent's
access. Media tasks do not require vault permission.

Yaps processes files on this computer. Requested results enter Gemini's context.
A remotely hosted Gemini session cannot reach a desktop through this local
connection. Keep the agent's normal confirmation for file writes and shell use.
