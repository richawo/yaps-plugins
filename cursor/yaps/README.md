# Yaps for Cursor

Local Cursor / Grok Bot plugin wrapper around the existing Yaps MCP helper in this repo (`mcpb/yaps/server/index.mjs`). Host metadata and skills only. It does not add a second MCP server or a new CLI.

## Status

This plugin is **not submitted** to [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish) or [cursor.directory](https://cursor.directory). The repo catalog entry under `.cursor-plugin/marketplace.json` is for local checkout only.

First-connect on Windows (`local_yaps_unreachable`, ticket 2629) is still the marketplace submit gate. This wrapper does not change finder logic and does not claim that find-the-app is fixed.

## Requirements

- The [Yaps desktop app](https://www.yaps.ai/download) installed on this computer (macOS, Windows, or the official Linux package). Yaps 2.3.124 or newer is required for credential-free account checks.
- A local Cursor session on the same machine. Cloud or remote agents cannot reach the installed app.
- Node.js 18+ to launch the existing helper. From a git checkout, run `npm install` in `mcpb/yaps` so `@modelcontextprotocol/sdk` is available to that server.

Leave `YAPS_CLI_BINARY` unset so the existing discovery finds the installed app (same as Codex CASE2).

## Local install

From this repository:

1. In Cursor, add a local plugin pointing at `cursor/yaps/` (or add this repo as a local marketplace; the plugin source is `cursor/yaps`).
2. Restart Cursor or reload the window so skills and the `yaps` MCP server load.
3. Open Yaps on this machine, then call `yaps_status`.

If the tools report `local_yaps_unreachable`, the session cannot see the Yaps engine yet. Open Yaps and retry locally. Do not treat that as a missing plugin or a broken listing.

## What it reuses

`scripts/launch.mjs` only sets `YAPS_PLUGIN_HOST=cursor` plus plugin id/version/transport, then imports `mcpb/yaps/server/index.mjs`. Tools stay the ones that helper already exposes: dictation, transcription, speech/read-aloud, notes/meeting, and status.

Skills (`dictation`, `notes`, `transcribe`, `read-aloud`) tell the agent to use those tools. They do not invent commands.

## Privacy

Processing stays on the user's device through the Yaps app. See the [Yaps privacy policy](https://www.yaps.ai/privacy) and [terms](https://www.yaps.ai/terms).

## License

MIT. See the repository [LICENSE](../../LICENSE).
