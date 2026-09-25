# Install Yaps in Cline

Connect Cline to the Yaps app on the same computer. Use it to transcribe a
recording, create subtitles, clean speech audio, translate text, extract audio,
or work with images and video.

## Before you start

1. Install [Yaps](https://www.yaps.ai/download?utm_source=cline&utm_medium=agent&utm_campaign=agent-plugins).
2. Open Yaps and sign in. Gated features need an active free trial or Yaps Pro.
3. Install Node.js 22 or newer on the computer running Cline's tools.

The integration is free. It reuses the desktop Yaps account. No Yaps API key,
separate connection token, or manual PATH change is required. Use the standard
Yaps app; the Setapp edition does not yet support this account connection.

## Add the media server

Use [integrations/cline.json](integrations/cline.json) from this repository.
It contains one `mcpServers.yaps` entry with an immutable runtime pin.

- **Cline CLI:** merge that entry into
  `~/.cline/data/settings/cline_mcp_settings.json`. If Cline is running with
  `--config <directory>`, use `<directory>/data/settings/cline_mcp_settings.json`.
  If it also uses `--data-dir <directory>`, that takes precedence: use
  `<directory>/settings/cline_mcp_settings.json` instead.
  Create the parent directories and file if needed. A file named `mcp.json`
  is not loaded by Cline CLI 3.0.65.
- **Cline in an editor:** open **MCP Servers**, choose **Configure**, then
  **Configure MCP Servers**. Merge the entry into the settings file Cline opens.

Keep every existing server and unrelated setting. If a `yaps` entry already
exists, compare it and ask before replacing a different configuration. Use
Cline's configuration UI to reload, or start a new Cline session.

The supplied settings keep `autoApprove` empty. Review tool calls in Cline.
The timeout is 1,800 seconds, allowing longer media jobs to finish. First startup
downloads the pinned runtime from GitHub and its dependencies from npm.

## Check the connection

1. Confirm that Cline shows **yaps** as connected and lists its tools.
2. Ask Cline: **Check whether Yaps is ready.** It should use `yaps_status`.
3. Pick an audio or video file and a new output path. Ask Cline to transcribe it
   with `transcribe_media`, or extract audio with `video_extract_audio`.

Only report success after the tool succeeds and its output exists. Keep the
original file. Never replace an existing output without a separate decision.

Use Yaps 2.3.124 or newer for credential-safe account checks. Individual features
can require a newer app version. The tool's readiness result and installed
command help are authoritative. When a model is missing, explain its download
and ask before installing it. Do not start a trial, checkout, model download,
or unrelated task just to prove the connection works.

## Optional skills and private memory

Install a focused skill when you want reusable workflow instructions:

```sh
npx skills add richawo/yaps-plugins --skill yaps-transcription --agent cline
```

Replace `yaps-transcription` with a skill from the [catalog](README.md#portable-skills).
The media configuration does not add the private-vault server. If the user wants
that connection, follow [the memory setup](integrations/README.md#what-connects).
Grant **Local MCP** access in Yaps and choose read or write permissions there.
Never reuse another agent's identity or permissions.

## If setup stops

- **Yaps not found:** install and open Yaps on the computer executing the tools.
- **Account not active:** finish sign-in and check trial or Yaps Pro access in Yaps.
- **Server disconnected:** check Node.js and restart Cline. First use needs access
  to GitHub and npm; later tool calls use the installed local engine.
- **Feature unavailable:** inspect its readiness result and update Yaps if needed.
- **Remote Cline:** this local connection cannot reach a different computer's Yaps app.

Files are processed on the computer running Yaps. Requested results can enter
Cline's model context. This setup does not turn the local app into a hosted API.

[Privacy](https://www.yaps.ai/privacy) · [Support](mailto:support@yaps.ai)
