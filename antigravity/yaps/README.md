# Yaps for Antigravity

Turn recordings into transcripts, captions, and subtitles. Create speech,
translate text, clean audio, edit images, extract audio from video, and shorten
pauses with Auto Cut. Fourteen focused and general skills also include optional
private Markdown memory.

## Get started

1. [Download Yaps](https://www.yaps.ai/download) on the computer running
   Antigravity. Open Yaps and sign in. New users need a Yaps account.
2. Use Node.js 22 or newer. Yaps 2.3.848 or newer is required for Auto Cut.
3. Install the plugin with Antigravity CLI:

```sh
git clone --depth 1 https://github.com/richawo/yaps-plugins.git yaps-plugins
agy plugin validate ./yaps-plugins/antigravity/yaps
agy plugin install ./yaps-plugins/antigravity/yaps
agy plugin list
```

Review the source and any installation prompt. Start a new session afterward.
The plugin is free. Gated Yaps features require an active free trial or Yaps Pro.
No user API key is needed. Approve required model downloads before they start.

## Try one task

- "Transcribe this product demo and save a separate text file."
- "Create subtitles for this interview, then translate them into French."
- "Review the long pauses in this video and export a tighter copy."

## Optional private memory

The plugin includes the `yaps` media server and the `yaps-memory` server.
Allow **Local MCP** in Yaps' Agent Access settings before reading private notes.
Write access is a separate choice. Remove `yaps-memory` from the installed
plugin's `mcp_config.json` if you only want media tools. Do not bypass a denial
with another client's identity or the CLI.

## Requirements and privacy

- Standard macOS and Windows Yaps installs and official Linux deb/rpm installs
  are supported by the shared adapter. Setapp and standalone AppImage account
  automation are not supported.
- Files are processed on the computer running Yaps. Requested results can enter
  Antigravity's context. A remote session cannot reach another computer's Yaps
  installation through this local plugin.
- First MCP startup downloads a pinned Yaps JavaScript package from GitHub and
  its dependencies from npm. Feature models are separate, approved downloads.
- Keep original files and choose new output paths. Available engines, languages,
  and commands depend on the installed Yaps version and models.

## Installation status

Antigravity CLI 1.2.11 validated and installed all 14 skills and both MCP server
definitions in an isolated macOS profile. This establishes native installation.
It does not establish model-driven media execution, Windows host testing, or
placement in Google's curated plugin catalog.

Antigravity's current custom-plugin route is direct installation. Its bundled
catalog contains Google-curated plugins. See the
[official plugin guide](https://antigravity.google/docs/plugins/).

## Publisher and discovery

Yaps AI maintains this MIT-licensed integration. Categories: Media, Productivity,
and Knowledge. Keywords: transcription, subtitles, captions, speech, translation,
audio cleanup, image editing, Auto Cut, dictation, and private memory.

[Privacy](https://www.yaps.ai/privacy) | [Support](mailto:support@yaps.ai) |
[All Yaps integrations](https://github.com/richawo/yaps-plugins)
