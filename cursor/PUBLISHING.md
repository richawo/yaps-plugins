# Twelve focused Yaps Cursor plugins

Each repository contains one named skill and one MCP server. Users can install the workflows they need, as with the twelve Codex packages. All packages reuse one maintained runtime, the installed Yaps app, its account, and existing models. Installing several packages does not duplicate model downloads. Each enabled MCP server still runs its own small Node process.

## Publishing status

Checked 9 September 2026 at 00:07 UK time (8 September at 23:07 UTC). All twelve public repositories are published. Nine separate directory listings now have visible install links. This batch accepted the npm runtime update for Dictation and four new listings: Audio Cleaner, Auto Captions, SRT Generator, and Translation. All five passed the directory's security scan and display the exact npm runtime and their distinct server names in the install links. Dictation's earlier manual-review block has cleared. Separate verification requests are recorded for all nine accepted listings; these requests do not establish a verified badge.

Three new listings remain: Video to Audio, Auto Cut, and Memory. Four existing listings still use the original pinned GitHub archive and need npm install-payload updates: Transcription, Meeting Notes, Text to Speech, and Background Removal. The latest batch used five scan requests. Wait until after 00:10 UTC on 9 September before the next batch. A repository update does not automatically update the directory install payload.

| Plugin repository | Cursor Directory |
| --- | --- |
| [Yaps Dictation](https://github.com/richawo/yaps-cursor-dictation) | [Live install link](https://cursor.directory/plugins/yaps-dictation) |
| [Yaps Transcription](https://github.com/richawo/yaps-cursor-transcription) | [Live install link](https://cursor.directory/plugins/yaps-transcription) |
| [Yaps Meeting Notes](https://github.com/richawo/yaps-cursor-meeting-transcription) | [Live install link](https://cursor.directory/plugins/yaps-meeting-notes) |
| [Yaps Text to Speech](https://github.com/richawo/yaps-cursor-text-to-speech) | [Live install link](https://cursor.directory/plugins/yaps-text-to-speech) |
| [Yaps Background Removal](https://github.com/richawo/yaps-cursor-background-removal) | [Live install link](https://cursor.directory/plugins/yaps-background-removal) |
| [Yaps Audio Cleaner](https://github.com/richawo/yaps-cursor-audio-cleaner) | [Live install link](https://cursor.directory/plugins/yaps-audio-cleaner) |
| [Yaps Auto Captions](https://github.com/richawo/yaps-cursor-auto-captions) | [Live install link](https://cursor.directory/plugins/yaps-auto-captions) |
| [Yaps SRT Generator](https://github.com/richawo/yaps-cursor-srt-generator) | [Live install link](https://cursor.directory/plugins/yaps-srt-generator) |
| [Yaps Translation](https://github.com/richawo/yaps-cursor-translation) | [Live install link](https://cursor.directory/plugins/yaps-translation) |
| [Yaps Video to Audio](https://github.com/richawo/yaps-cursor-video-to-audio) | Ready; hourly submission limit |
| [Yaps Auto Cut](https://github.com/richawo/yaps-cursor-video-clipping) | Ready; hourly submission limit |
| [Yaps Memory](https://github.com/richawo/yaps-cursor-memory) | Ready; hourly submission limit |

Keep the [combined Yaps listing](https://cursor.directory/plugins/yaps) available until all replacements are approved. Do not delete it. The machine-readable [submission state](submission-state.json) distinguishes accepted, public, and blocked entries. A missing listing URL means the form has not accepted that submission.

## Why separate repositories

Cursor supports several plugins in one repository, but the [Cursor Directory importer](https://github.com/cursor/community-plugins/blob/main/apps/cursor/src/lib/plugins/insert.ts) enforces one listing per GitHub repository. Separate repositories provide separate search names and workflow descriptions. This is a directory constraint, not a Cursor plugin format constraint.

The directory MCP button transfers server configuration only. Users must also add the skill when installing individual directory components. Repository plugin installation includes both. Each install payload retains a named `mcpServers` wrapper so different workflows do not collide under the fallback name `server`.

## Runtime publication

The public npm package [yaps-cursor-runtime@0.3.0](https://www.npmjs.com/package/yaps-cursor-runtime/v/0.3.0) is published. Anonymous registry metadata and the downloaded artifact matched the prepared SHA-512 integrity recorded in the submission state. All twelve repositories now use plugin version `0.1.1` and pin this exact npm version. The published package source is commit `abaffd3b1d8911fa8faafa85a176f5781c688d33`. Node.js 20+ and npm/npx are required; first startup needs npm connectivity. No source checkout or Git installation is required.

The npm release addressed the distribution concern raised on Dictation, and its updated listing has cleared the security scan. Five directory payloads now use npm; four accepted payloads still use the working archive. Submit the three missing listings next, then update the four remaining archive payloads using their current `directory-component.json`. Do not resubmit unchanged content to retry a security decision.

## Validation boundaries

The shared source suites passed 61 tests, covering runner diagnostics, finder behavior, tool profiles, configuration, and generated repositories. All twelve generated skills passed the skill validator. The npm reference and configuration changes passed 23 Cursor tests. A fresh cache with empty npm user/global configuration anonymously installed the published npm package, and direct macOS MCP initialization passed for all twelve packages with no CLI path override. Tool counts and workflow scopes matched the expected profiles. Eleven media readiness calls succeeded; Memory returned the expected Agent Access denial while Cursor read access remained disabled. This verifies package startup and permission preservation, not successful vault access.

On installed Yaps 2.3.2421, direct MCP operations produced a WAV audio extraction, synthesized speech, a cleaned WAV, a transparent PNG from the public Yaps icon, a caption project, a rendered and verified captioned MP4, and a speaker-labelled transcript with a Markdown export from synthetic media. Dictation readiness and Auto Cut presets also succeeded. Earlier direct Auto Cut tests completed a separate MP4 export and verification. These checks do not constitute broad output-quality evaluation.

Plain transcription and SRT generation stopped because the Subtitles feature is disabled on this machine, confirmed by the native CLI diagnostic. Translation reported `translation_no_engine_installed`. No feature settings, model downloads, or vault permissions were changed by these tests. These paths require follow-up after setup and are not counted as passes.

Windows session resolution previously passed on TX16PRO before this expansion. The new standalone packages have not been run on Windows. A live Cursor UI tool call remains unverified because the automation could read the app but could not activate its workspace picker. Direct MCP tests are not host UI tests. Grok Bot's local integration and marketplace listing remain unverified; Cursor Directory approval does not establish Grok distribution.

## Maintenance

Update the shared helper source and its matching Cursor snapshot together. Validate first, publish the runtime, then advance its immutable reference in [the catalog](standalone-plugins.json). Run:

```sh
node scripts/generate-cursor-standalone.mjs /path/to/the/twelve/checkouts
```

Review and commit each generated repository. Do not maintain twelve independent helper forks. Preserve the distinct plugin IDs, scope profiles, Cursor Memory client identity, and disabled auto-authorization. The directory shares a five-per-hour scan quota across new submissions and changes to install payloads. After it resets, update existing listings in place or submit entries with no accepted listing URL, and record each actual result. Stop on a quota response and wait for the next window; never create duplicate listings or bypass review.
