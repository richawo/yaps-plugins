# Yaps plugins for Claude Code

Local-first voice, transcription, media, translation, and memory tools for [Claude Code](https://code.claude.com), powered by the [Yaps](https://www.yaps.ai) desktop app.

Everything runs on your computer. Your audio, video, notes, and documents are processed by the Yaps engine installed on your machine, not uploaded to a cloud service by these plugins.

## Install

Add the marketplace once:

```sh
claude plugin marketplace add richawo/yaps-plugins
```

Then install any plugin:

```sh
claude plugin install yaps-memory@yaps
```

Or browse everything interactively with `/plugin`.

## The plugins

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
| `yaps-text-to-speech` | Turn text into spoken audio, narration, or voice-over files. |
| `yaps-translation` | Translate text, Markdown, and SRT files locally, without metered API tokens. |
| `yaps-video-to-audio` | Convert videos to MP3, WAV, or M4A audio files. |

Install any of them the same way, for example:

```sh
claude plugin install yaps-transcription@yaps
claude plugin install yaps-auto-captions@yaps
```

## Requirements

- The [Yaps desktop app](https://www.yaps.ai/download) installed on macOS or Windows (Linux via the official deb/rpm package). Yaps 2.3.124 or newer is required for credential-free account checks.
- Claude Code. No separate CLI install, no `PATH` edits, and no API keys: each plugin discovers the CLI bundled inside your installed Yaps app and verifies it with a bounded, read-only status check before use.
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
