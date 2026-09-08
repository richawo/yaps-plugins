# Yaps for Cursor and Grok

One `yaps` plugin with twelve workflow skills and two local MCP connectors. The media connector handles dictation, transcription, speech, translation, captions, background removal, audio cleaning, audio extraction, and Auto Cut. The memory connector exposes the native Yaps vault tools and their Agent Access controls.

## Listing and validation

The existing [Cursor Directory listing](https://cursor.directory/plugins/yaps) was accepted for security scanning. Directory acceptance is separate from public approval or submission to cursor.com/marketplace/publish. Keep updates on this single listing.

Windows session resolution passed on TX16PRO, selecting the running portable sidecar with account ready before this workflow expansion. Live Cursor/Grok tool execution remains untested. Local package and protocol tests do not establish Windows or host UI execution.

On macOS, both packaged launchers completed direct MCP connections to the installed app. The media connector advertised 48 tools and the native connector advertised 28, including 25 vault tools. A disposable synthetic video passed Auto Cut creation, plan inspection/export, tuning, rendering, output verification, and project deletion. No private notes were retrieved or access settings changed in this check.

Both connectors also passed direct MCP initialization when installed by `npx` from the published immutable GitHub archive and launched from an unrelated folder, without using a repository checkout. Auto Cut presets executed through that installed package. This remains a direct macOS MCP test, not a Cursor/Grok host UI test.

## Requirements and setup

- Install [Yaps desktop](https://yaps.ai/download) on the same computer as the local Cursor or Grok session. Cloud and remote agents cannot reach that installation.
- Use Yaps 2.3.848 or newer for Auto Cut and meeting AI. The lower 2.3.124 floor only verifies credential-free account checks, not support for every tool. Tools reuse the desktop account and its active trial or Yaps Pro access.
- Install Node.js 20+, including npm/npx. The directory MCP configuration uses `npx` to fetch this repository at an immutable commit and install the runtime dependencies. It works from any working directory and does not require a repository checkout or Git. First launch requires internet access to GitHub and npm; media and vault processing still use the local Yaps app.
- Add `cursor/yaps` as one local plugin, or add the repository marketplace. Reload the host so its skills and both MCP connectors load.
- For Memory, enable **Cursor** in **Yaps → Settings → Agent Access**. Read and write access are separate. The plugin preserves disabled permissions and never impersonates Codex or Claude to auto-authorize itself.

Leave `YAPS_CLI_BINARY` unset for automatic discovery. Memory first looks beside the selected CLI for `yaps_mcp`, so a running portable app can supply both helpers. Explicit connector/install-directory overrides remain authoritative.

## Skills

| Skill | Workflow |
| --- | --- |
| dictation | Dictation readiness and history recovery; live recording uses Yaps shortcuts |
| transcribe | Plain-text audio/video transcription |
| notes | Speaker-labelled meeting projects, recaps, chapters, and grounded questions |
| read-aloud | Text-to-speech and local audio output |
| background-removal | Image cutouts and transparent PNGs |
| audio-cleaner | Speech noise reduction |
| auto-captions | Editable captions and rendered MP4s |
| srt-generator | Separate timestamped subtitle files |
| translation | Local text, document, and subtitle translation |
| video-to-audio | MP3, WAV, or M4A audio extraction |
| video-clipping | Auto Cut analysis, plan review, tuning, and export |
| memory | Scoped retrieval and requested changes in the local Markdown vault |

The `yaps` MCP entry runs `yaps-plugin-media`, which launches `scripts/launch.mjs`. `yaps-memory` runs `yaps-plugin-memory`, which launches `scripts/launch-memory.mjs` and hands the protocol to the installed native vault connector. These are components of one plugin, not separate products or listings. The media helper snapshot stays identical to `mcpb/yaps/server`.

The directory's individual MCP install buttons transfer configuration only, so do not replace these commands with relative script paths. For local development, run `npm ci` or `bun install --frozen-lockfile` in `cursor/yaps` and launch the scripts directly. Runtime code changes require publishing a new commit containing the root npm package, then advancing the immutable archive URL in `mcp.json` and refreshing the existing listing.

If a tool reports `local_yaps_unreachable` or `cli_missing`, the current session cannot see the Yaps engine. Open Yaps and retry locally. Do not treat that as proof Yaps is uninstalled. A missing Memory connector does not block media tools. Use `yaps_status` for media readiness and `vault_status` for the vault connection.

## Privacy and outputs

Local files are processed through the installed app. Memory enforces Yaps Agent Access. Skills require explicit intent for note mutations and destructive actions, preserve source media, and request separate export destinations. Feature model downloads occur only when requested. See the [privacy policy](https://www.yaps.ai/privacy) and [terms](https://www.yaps.ai/terms).

MIT. See the repository root LICENSE.
