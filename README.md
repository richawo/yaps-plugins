# Yaps skills and plugins for AI agents

Voice, transcription, media, translation, and memory tools for your AI agent. Choose one focused skill or install the full set of 14. The tools use the [Yaps](https://www.yaps.ai) app on your computer.

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

Add Yaps as a skill source, then install the tool you need:

```sh
hermes skills tap add richawo/yaps-plugins
hermes skills install richawo/yaps-plugins/yaps-transcription
```

Start a new Hermes session and ask:

> Use Yaps to transcribe this recording. Save the transcript beside the audio file.

Replace `yaps-transcription` with any skill in the catalog below. Use `yaps`
for the general skill. Hermes keeps its normal install confirmation and
security scan. See [Hermes skills](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills)
for updating or removing a skill.

### OpenCode, Goose, Pi, and more agents

The [`skills` CLI](https://skills.sh/docs/cli) installs the same complete bundles
for each supported agent. Run this inside the project where you use your agent:

```sh
npx skills add richawo/yaps-plugins --skill yaps-transcription --agent opencode
```

Replace `opencode` with the value for your agent:

| Agent | `--agent` value |
| :--- | :--- |
| OpenCode | `opencode` |
| Goose | `goose` |
| Pi | `pi` |
| Hermes Agent | `hermes-agent` |
| OpenClaw | `openclaw` |
| Gemini CLI | `gemini-cli` |
| Cline | `cline` |
| Kilo Code | `kilo` |
| Qwen Code | `qwen-code` |
| Mistral Vibe | `mistral-vibe` |
| Amp | `amp` |
| GitHub Copilot | `github-copilot` |
| Cursor | `cursor` |
| Claude Code | `claude-code` |
| Codex | `codex` |

To install all 14 skills, replace `--skill yaps-transcription` with `--skill '*'`.
Add `--global` to make them available across projects.
To browse before installing, run `npx skills add richawo/yaps-plugins --list`.

**Verified on 24 September 2026:** all 14 skills installed into fresh project
folders for every agent above using `skills@1.7.0`. All installed files matched
the published catalog and the runtime modules loaded. Hermes 0.21.5 also
installed all 14 through its own CLI and security scanner.

These checks cover installation and package loading. They do not establish
end-to-end task success in every agent or approval in each agent's own marketplace.
Each [standalone skill](skills/) includes its runtime and can work independently.

### Cursor Marketplace and Grok Bot

The separate [Yaps Cursor and Grok Bot plugin](https://github.com/richawo/yaps-plugin)
contains the same focused skills plus MCP tools. Follow that repository's setup
guide for local-computer execution. A public plugin repository is available;
a searchable marketplace listing has not yet been verified.

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

Each skill teaches your agent when and how to run a Yaps workflow through the locally installed Yaps CLI. File access follows your agent's normal permissions for reading inputs and writing results.

`yaps-memory` additionally ships an MCP server that connects Claude to your private local Markdown vault. It starts read-only; vault writes are opt-in under **Yaps → Settings → Agent Access**.

## Privacy

Processing happens on your device through the Yaps app. See the [Yaps privacy policy](https://www.yaps.ai/privacy) and [terms](https://www.yaps.ai/terms).

## Support

- Website: [yaps.ai](https://www.yaps.ai)
- Email: [support@yaps.ai](mailto:support@yaps.ai)
- Issues: [github.com/richawo/yaps-plugins/issues](https://github.com/richawo/yaps-plugins/issues)

## License

MIT. See [LICENSE](LICENSE).
