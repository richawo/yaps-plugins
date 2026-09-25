# Yaps Auto Captions for Claude Code

Add captions to a video with Yaps. Review the words and timing, choose a style, then export. New users: install Yaps and sign in.

## Get started

1. [Download Yaps](https://www.yaps.ai/download?utm_source=claude-code&utm_medium=agent&utm_campaign=agent-plugins) on the computer running Claude Code. Open Yaps and sign in. New users need a Yaps account.
2. Use the latest Yaps desktop release. Node.js 22 or newer must be available. Normal macOS and Windows installs and official Linux deb/rpm installs are supported. Setapp and standalone AppImage account automation are not supported.
3. Install the plugin:

```sh
claude plugin marketplace add richawo/yaps-plugins
claude plugin install yaps-auto-captions@yaps
```

The plugin is free. Gated Yaps features require an active free trial or Yaps Pro. No user API key is needed. Approve any required model downloads before processing.

## Try it

- "Add readable captions to this video and save a new copy."
- "Preview the words and timing before exporting this captioned video."
- "Show the available caption styles for this product demo."

## Scope and privacy

This focused plugin exposes only its named workflow and the setup tools needed for it. Install Yaps Toolkit if you want the combined media and memory workflows.

These skills call only the plugin's declared local MCP servers. Those servers invoke the installed Yaps CLI internally. Users do not need to run terminal commands for their media tasks. They process selected files on that computer and preserve originals. Requested results can enter Claude's context. A remote Claude session cannot reach another computer's Yaps installation through this plugin. Cowork compatibility has not been verified.

## Account checks and network use

The plugin includes its local MCP runtime and dependencies, built from a reviewed source revision. No runtime package download is needed. Readable code, source provenance, checksums, and dependency licenses are included under `mcp/`. The declared local servers discover Yaps, check account readiness, and start the native CLI or vault connector for the requested operation. No remote MCP endpoint receives the user's files. Skills contain instructions only. Executable code is confined to the declared MCP servers; there are no hooks or shell fallbacks.

The installed Yaps app may contact Yaps account services to refresh its own sign-in and plan access. Application updates, approved model downloads, and limited usage or diagnostic metadata can also use the network. These workflows do not upload recordings, transcripts, note bodies, or source files to a cloud AI service for processing. Results requested by Claude follow Anthropic's own data handling.

## What is stored

Selected recordings and notes can contain personal information. Yaps reads them and saves requested outputs locally until the user removes them. Account and subscription records remain while the account is active; account-linked product events are retained for up to 90 days. Other operational records follow the retention limits and legal exceptions in the linked privacy policy.

## Review notes

The readable media bundle includes the MCP SDK and its Ajv schema validator. The raw.githubusercontent.com URL ending in `ajv/master/lib/refs/data.json#` is an embedded JSON Schema identifier, not a credential upload or a runtime download request. The bundle is intentionally unminified and exceeds the portal's per-file automatic inspection threshold. Its dependency versions and SHA-256 digests are recorded in `mcp/provenance.json`.

Yaps website URLs in discovery errors are installation help. Native process discovery uses local environment paths and OS process queries; it does not send those paths or environment values to those URLs. The installed app owns its existing sign-in and account checks. The plugin does not ask users to share another service's API key. All workflow execution starts through the declared local MCP servers.

If setup fails, open Yaps, check account access and feature readiness, then ask Claude to check Yaps status. A missing command requires a Yaps update. Do not work around a permission denial or overwrite an existing output.

## Support

[Contact Yaps support](https://www.yaps.ai/contact) for product or security questions, or email support@yaps.ai.

## Privacy policy

[Read the Yaps privacy policy](https://www.yaps.ai/privacy).

## Terms of service

[Read the Yaps terms](https://www.yaps.ai/terms).
