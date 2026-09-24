# Yaps skills and plugins for AI agents

Local-first voice, transcription, media, translation, and memory tools for OpenClaw, Hermes, OpenCode, Goose, Claude Code, Codex, and other agents that support `SKILL.md`. The tools use the [Yaps](https://www.yaps.ai) desktop app.

Yaps processes selected files with the engine installed on the same computer as the agent's command runner. A remote agent cannot reach your desktop installation through these local skills. Text or files the agent reads can enter that agent's own context.

## Get started

1. [Download or open Yaps](https://www.yaps.ai/download) on the computer running the agent. Sign in inside Yaps and check your active free trial or Yaps Pro access. Yaps 2.3.124 or newer is needed for credential-safe account checks; Auto Cut needs 2.3.848 or newer.
2. Install one skill for the job you want. The portable skills need Node.js 22 or newer on the agent host. They discover the helper inside the installed Yaps app, so no separate Yaps CLI, API key, or `PATH` edit is needed.
3. Ask the agent to use Yaps for a specific task, such as "Transcribe this recording with Yaps". The skill checks the installed app, account, feature, and model before processing.

### OpenClaw and ClawHub

Install a focused skill from the [Yaps ClawHub publisher](https://clawhub.ai/yaps):

```sh
clawhub install @yaps/yaps-transcription
```

Replace `yaps-transcription` with another skill below. Install `@yaps/yaps` for the general Yaps skill. ClawHub also exposes these skills to Hermes as a community source.

To add the full catalog as one OpenClaw plugin bundle from the Yaps marketplace:

```sh
openclaw plugins install yaps-all --marketplace richawo/yaps-plugins --force
```

The bundle contains the same 14 standalone skills. Review the repository before using `--force`, which confirms a third-party marketplace source.

### Hermes Agent

Hermes can install from ClawHub or use this repository as a skill tap:

```sh
hermes skills tap add richawo/yaps-plugins
hermes skills install richawo/yaps-plugins/yaps-transcription
```

### OpenCode, Goose, and other skills.sh agents

The [`skills` CLI](https://skills.sh/docs/cli) discovers the `skills/` catalog in this repository and lets you choose your agent and scope:

```sh
npx skills add richawo/yaps-plugins --list
npx skills add richawo/yaps-plugins --skill yaps-transcription
```

Use `--skill '*'` to select the full catalog. The 14 standalone bundles are in [`skills/`](skills/); each includes its own runtime and does not depend on another Yaps skill.

## Portable skills

| Skill | Purpose |
| :--- | :--- |
| `yaps-memory` | Search, cite, and update your local Markdown vault. |
| `yaps-transcription` | Turn audio or video into a plain-text transcript. |
| `yaps-meeting-transcription` | Create editable speaker-labelled meeting records. |
| `yaps-srt-generator` | Generate timed SRT subtitles. |
| `yaps-auto-captions` | Correct, style, and render burned-in video captions. |
| `yaps-audio-cleaner` | Clean noise from speech recordings. |
| `yaps-text-to-speech` | Export narration or spoken audio. |
| `yaps-translation` | Translate text, Markdown, and SRT files. |
| `yaps-background-removal` | Make image cutouts and stickers. |
| `yaps-image-generate` | Generate an image from a prompt. |
| `yaps-video-to-audio` | Extract audio from video. |
| `yaps-dictation` | Set up or diagnose desktop voice typing. |
| `yaps-video-clipping` | Remove pauses through a reviewable Auto Cut project. |
| `yaps` | Use the installed Yaps CLI for another supported task. |

## Claude Code plugins

Add the marketplace once:

```sh
claude plugin marketplace add richawo/yaps-plugins
```

Then install any plugin:

```sh
claude plugin install yaps-memory@yaps
```

Or browse everything interactively with `/plugin`.

### The plugins

| Plugin | What it does |
| :--- | :--- |
| `yaps-memory` | Persistent private memory for Claude, stored as local Markdown you own. |
| `yaps-dictation` | Voice-type into Claude Code and other desktop apps through Yaps. |
| `yaps-transcription` | Transcribe audio and video files into clean text. |
| `yaps-meeting-transcription` | Transcribe meetings and interviews with timed speaker labels. |
| `yaps-srt-generator` | Generate timestamped SRT subtitles from video or audio. |
| `yaps-auto-captions` | Add editable, styled social-video captions and export a burned-in MP4. |
| `yaps-audio-cleaner` | Remove background noise, hiss, and static from speech recordings. |
| `yaps-background-removal` | Remove image backgrounds and export transparent PNGs. |
| `yaps-image-generate` | Generate a PNG from a prompt with a local image model. |
| `yaps-text-to-speech` | Turn text into spoken audio, narration, or voice-over files. |
| `yaps-translation` | Translate text, Markdown, and SRT files locally, without metered API tokens. |
| `yaps-video-to-audio` | Convert videos to MP3, WAV, or M4A audio files. |

Install any of them the same way, for example:

```sh
claude plugin install yaps-transcription@yaps
claude plugin install yaps-auto-captions@yaps
```

## Requirements and access

- The [Yaps desktop app](https://www.yaps.ai/download) installed on macOS or Windows (Linux via the official deb/rpm package). Yaps 2.3.124 or newer is required for credential-free account checks.
- A local-capable agent session. No separate Yaps CLI install, `PATH` edit, or API key is needed: each plugin or skill discovers the CLI bundled inside the installed Yaps app and verifies it with a bounded, read-only status check before use.
- A Yaps free trial or Yaps Pro for the gated features. The plugins detect your account state automatically and explain exactly what to do if something is missing.

## How it works

Each plugin ships a skill that teaches Claude when and how to run the corresponding Yaps workflow through the locally installed Yaps CLI. File access follows Claude Code's normal permission model: reading your input files and writing results is governed by the same approvals as any other tool use.

`yaps-memory` additionally ships an MCP server that connects Claude to your private local Markdown vault. It starts read-only; vault writes are opt-in under **Yaps → Settings → Agent Access**.

## Privacy

Processing happens on your device through the Yaps app. See the [Yaps privacy policy](https://www.yaps.ai/privacy) and [terms](https://www.yaps.ai/terms).

## Support

- Website: [yaps.ai](https://www.yaps.ai)
- Email: [support@yaps.ai](mailto:support@yaps.ai)
- Issues: [github.com/richawo/yaps-plugins/issues](https://github.com/richawo/yaps-plugins/issues)

## License

MIT. See [LICENSE](LICENSE).
