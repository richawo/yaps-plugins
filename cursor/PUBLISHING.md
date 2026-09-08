# Twelve focused Yaps Cursor plugins

Each repository contains one named skill and one MCP server. Users can install the workflows they need, as with the twelve Codex packages. All packages reuse one maintained runtime, the installed Yaps app, its account, and existing models. Installing several packages does not duplicate model downloads. Each enabled MCP server still runs its own small Node process.

## Publishing status

Checked 8 September 2026. All twelve public repositories are published. The directory accepted five submissions before returning "Too many plugin submissions in the last hour. Please try again later." Four have visible install links. Dictation was flagged for manual security review because its npx launch downloads executable code from a pinned GitHub archive. The reviewer found the inspected runtime legitimate, with appropriate skill boundaries and no install hooks or network exfiltration. Verification was requested for all five accepted submissions.

| Plugin repository | Cursor Directory |
| --- | --- |
| [Yaps Dictation](https://github.com/richawo/yaps-cursor-dictation) | [Manual review required](https://cursor.directory/plugins/yaps-dictation) |
| [Yaps Transcription](https://github.com/richawo/yaps-cursor-transcription) | [Live install link](https://cursor.directory/plugins/yaps-transcription) |
| [Yaps Meeting Notes](https://github.com/richawo/yaps-cursor-meeting-transcription) | [Live install link](https://cursor.directory/plugins/yaps-meeting-notes) |
| [Yaps Text to Speech](https://github.com/richawo/yaps-cursor-text-to-speech) | [Live install link](https://cursor.directory/plugins/yaps-text-to-speech) |
| [Yaps Background Removal](https://github.com/richawo/yaps-cursor-background-removal) | [Live install link](https://cursor.directory/plugins/yaps-background-removal) |
| [Yaps Audio Cleaner](https://github.com/richawo/yaps-cursor-audio-cleaner) | Ready; hourly submission limit |
| [Yaps Auto Captions](https://github.com/richawo/yaps-cursor-auto-captions) | Ready; hourly submission limit |
| [Yaps SRT Generator](https://github.com/richawo/yaps-cursor-srt-generator) | Ready; hourly submission limit |
| [Yaps Translation](https://github.com/richawo/yaps-cursor-translation) | Ready; hourly submission limit |
| [Yaps Video to Audio](https://github.com/richawo/yaps-cursor-video-to-audio) | Ready; hourly submission limit |
| [Yaps Auto Cut](https://github.com/richawo/yaps-cursor-video-clipping) | Ready; hourly submission limit |
| [Yaps Memory](https://github.com/richawo/yaps-cursor-memory) | Ready; hourly submission limit |

Keep the [combined Yaps listing](https://cursor.directory/plugins/yaps) available until all replacements are approved. Do not delete it. The machine-readable [submission state](submission-state.json) distinguishes accepted, public, and blocked entries. A missing listing URL means the form has not accepted that submission.

## Why separate repositories

Cursor supports several plugins in one repository, but the [Cursor Directory importer](https://github.com/cursor/community-plugins/blob/main/apps/cursor/src/lib/plugins/insert.ts) enforces one listing per GitHub repository. Separate repositories provide separate search names and workflow descriptions. This is a directory constraint, not a Cursor plugin format constraint.

The directory MCP button transfers server configuration only. Users must also add the skill when installing individual directory components. Repository plugin installation includes both. Each install payload retains a named `mcpServers` wrapper so different workflows do not collide under the fallback name `server`.

## Runtime publication

The current repositories pin runtime commit `189945737dce216c3d8112e86aa4da37786275df` using a codeload archive. Node.js 20+ and npm/npx are required. First startup needs GitHub and npm connectivity; no source checkout or Git installation is required.

The public npm artifact `yaps-cursor-runtime@0.3.0` is prepared to address the directory's distribution concern. It has not been published: npm authentication on the publishing machine needs renewal. Keep current install payloads on the working archive until the registry package has been published and anonymously installed successfully. Then use an exact version, regenerate all repositories, and update accepted listings to request a fresh review of the changed payload. Do not resubmit unchanged content to retry a security decision.

## Validation boundaries

The shared source suites passed 61 tests, covering runner diagnostics, finder behavior, tool profiles, configuration, and generated repositories. All twelve generated skills passed the skill validator. Direct macOS MCP initialization from the published archive passed for all twelve packages with no CLI path override. Eleven media readiness calls succeeded; Memory returned the expected Agent Access denial while Cursor read access remained disabled.

On installed Yaps 2.3.2421, direct MCP operations produced a WAV audio extraction, synthesized speech, a cleaned WAV, a transparent PNG from the public Yaps icon, a caption project, and a speaker-labelled transcript from synthetic media. Dictation readiness and Auto Cut presets also succeeded. Earlier direct Auto Cut tests completed a separate MP4 export and verification. These checks do not constitute broad output-quality evaluation.

Plain transcription and SRT generation stopped because the Subtitles feature is disabled on this machine, confirmed by the native CLI diagnostic. Translation reported `translation_no_engine_installed`. No feature settings, model downloads, or vault permissions were changed by these tests. These paths require follow-up after setup and are not counted as passes.

Windows session resolution previously passed on TX16PRO before this expansion. The new standalone packages have not been run on Windows. A live Cursor UI tool call remains unverified because the automation could read the app but could not activate its workspace picker. Direct MCP tests are not host UI tests. Grok Bot's local integration and marketplace listing remain unverified; Cursor Directory approval does not establish Grok distribution.

## Maintenance

Update the shared helper source and its matching Cursor snapshot together. Validate first, publish the runtime, then advance its immutable reference in [the catalog](standalone-plugins.json). Run:

```sh
node scripts/generate-cursor-standalone.mjs /path/to/the/twelve/checkouts
```

Review and commit each generated repository. Do not maintain twelve independent helper forks. Preserve the distinct plugin IDs, scope profiles, Cursor Memory client identity, and disabled auto-authorization. After the hourly quota resets, resume only entries with no accepted listing URL, and record each actual result.
