# Yaps Toolkit for Claude Code

Transcribe recordings, create subtitles and captions, translate, clean audio, remove backgrounds, and trim video pauses with Yaps. Includes optional private memory. Install Yaps and sign in.

## Get started

1. [Download Yaps](https://www.yaps.ai/download?utm_source=claude-code&utm_medium=agent&utm_campaign=agent-plugins) on the computer running Claude Code. Open Yaps and sign in. New users need a Yaps account.
2. Use Yaps 2.3.848 or newer for Auto Cut. Node.js 22 or newer must be available. Normal macOS and Windows installs and official Linux deb/rpm installs are supported. Setapp and standalone AppImage account automation are not supported.
3. Install the plugin:

```sh
claude plugin marketplace add richawo/yaps-plugins
claude plugin install yaps-toolkit@yaps
```

The plugin is free. Gated Yaps features require an active free trial or Yaps Pro. No user API key is needed. Approve any required model downloads before processing. Auto Cut has no model download of its own.

## Try it

- "Transcribe this product demo and save a text file."
- "Create an SRT file, then translate it into French while preserving the timing."
- "Review the long pauses in this video and export a tighter copy."

## Scope and privacy

This directory edition includes 11 focused workflows. It does not expose image generation, speech synthesis, the general-purpose Yaps skill, or the full media MCP server. The full Yaps toolkit remains available in the separate `yaps-all` package.

Private memory uses the host's local command permissions. It does not automatically enroll an MCP client or grant vault access. Only read requested notes, and make changes when the user asks. Never use CLI access to bypass an existing MCP denial.

These skills invoke the installed Yaps CLI through a bundled adapter. They process selected files on that computer and preserve originals. Requested results can enter Claude's context. A remote Claude session cannot reach another computer's Yaps installation through this plugin. Cowork compatibility has not been verified.

## Account checks and network use

The bundled JavaScript adapter discovers and starts the installed Yaps CLI. Only an explicit allowlist of operating-system paths, locale settings, and Yaps runtime paths is passed to child processes. Unrelated credentials, loader flags, and other hosts' MCP consent are excluded. Installation help directs the user to the download link in this README. That link is not an upload destination. The adapter has no HTTP client and reports sanitized account readiness.

The installed Yaps app may contact Yaps account services to refresh its own sign-in and plan access. Application updates, approved model downloads, and limited usage or diagnostic metadata can also use the network. These workflows do not upload recordings, transcripts, note bodies, or source files to a cloud AI service for processing. Results requested by Claude follow Anthropic's own data handling.

## What is stored

Selected recordings and notes can contain personal information. Yaps reads them and saves requested outputs locally until the user removes them. Account and subscription records remain while the account is active; account-linked product events are retained for up to 90 days. Other operational records follow the retention limits and legal exceptions in the linked privacy policy.

If setup fails, open Yaps, check account access and feature readiness, then ask Claude to check Yaps status. A missing command requires a Yaps update. Do not work around a permission denial or overwrite an existing output.

## Support

[Contact Yaps support](https://www.yaps.ai/contact) for product or security questions, or email support@yaps.ai.

## Privacy policy

[Read the Yaps privacy policy](https://www.yaps.ai/privacy).

## Terms of service

[Read the Yaps terms](https://www.yaps.ai/terms).
