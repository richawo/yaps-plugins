# Yaps tools for your agent

Use a focused [Yaps skill](../skills/) for instructions, and an MCP connection
when your agent supports structured tools. Both use the same Yaps installation.

## Start here

1. [Install Yaps](https://www.yaps.ai/download) on the computer running the tools.
2. Open Yaps and sign in. Check your active free trial or Yaps Pro access.
3. Install Node.js 22 or newer, then add the configuration for your agent below.
4. Start a new agent session and ask: **Check Yaps, then extract audio from this video.**

The plugin is free. You do not need an API key. These local connections do not
reach a Yaps installation on another computer.

## Choose your agent

| Agent | Setup |
| :--- | :--- |
| OpenClaw | Install or update `yaps-all` from the Yaps marketplace. Version 1.1.0 adds MCP tools to the 14 skills. |
| Gemini CLI | Install the native extension using the command below. It includes all 14 skills and both MCP connections. |
| Hermes | Merge the `mcp_servers` entries from [hermes.json](hermes.json) into your Hermes `config.yaml`. JSON objects are valid YAML. Keep your other settings. |
| OpenCode 2 | Merge `mcp.servers` from [opencode.json](opencode.json) into your project's `opencode.json` or `opencode.jsonc`. Include the startup timeout for a first-time download. Run `opencode mcp list` to check the connection. |
| OpenCode 1 | Use [opencode-v1.json](opencode-v1.json). Version 1 puts server names directly under `mcp`; version 2 uses `mcp.servers`. Keep your other settings. |
| Agent Plugins 1.0 clients | [agent-plugins.mcp.json](agent-plugins.mcp.json) is the standard configuration included as `mcp.json` in the public Yaps repository. |
| Other MCP clients | Use the `mcpServers` entries in [bundle.mcp.json](bundle.mcp.json), adapting only the host's configuration format. |

OpenClaw installation:

```sh
openclaw plugins install yaps-all --marketplace richawo/yaps-plugins --force --accept-capabilities
openclaw plugins inspect yaps-all
```

Review the source before `--force`, which confirms the third-party marketplace.
`--accept-capabilities` accepts the bundle's declared skills and MCP tools.
Your agent's own runtime requirements still apply. For example, recent OpenClaw
versions require a newer Node.js than Yaps' Node.js 22 minimum.

Gemini CLI installation:

```sh
gemini extensions install https://github.com/richawo/yaps-plugins --ref main
gemini extensions list
gemini mcp list
gemini skills list
```

Review Gemini's install prompt, then start a new session. `extensions list`
should include **yaps**, `mcp list` should connect **yaps** and **yaps-memory**,
and `skills list` should show the 14 Yaps skills. A connected memory server still
needs Local MCP permission before it can read your vault. Update with
`gemini extensions update yaps` when you want a newer extension.

Hermes' built-in catalog submission is [under review](https://github.com/NousResearch/hermes-agent/pull/121897).
Use the configuration above now. The proposed catalog entry selects ten common
media tools and leaves private-vault access optional.

## What connects

- **yaps:** transcription, meeting notes, captions, subtitles, speech, translation,
  audio cleanup, image tools, video to audio, and dictation setup.
- **yaps-memory:** your private Yaps notes vault. Allow the **Local MCP** client in
  Yaps' Agent Access settings before using it. Write access remains a separate choice.
  Remove this server entry if you only want the media tools.

First startup downloads a pinned public Yaps runtime and its MCP SDK dependency
from GitHub and npm. It does not install feature models. When a task needs a model,
the agent asks before downloading it. Upgrade the configuration to change the
runtime pin; it does not silently follow the repository's latest commit.

Files are processed on the computer running Yaps. Requested results enter your
agent's context. The connectors do not request account tokens, borrow another
agent's vault identity, or grant vault access automatically.

## If setup stops

- **Yaps not found:** install and open Yaps on the same computer as the agent.
- **Account not ready:** sign in inside Yaps and check your trial or Yaps Pro access.
- **Memory denied:** check the Local MCP permission in Yaps. Do not copy another client's approval.
- **Old commands:** update Yaps. Headless sign-in needs `auth login` and `auth verify`
  in the installed CLI help. Skill commands use JSON stdin when `request` is available.
- **Remote agent:** install Yaps on that host through the supported setup path,
  or use the agent's local-computer execution. A local MCP server is not a public API.

[Privacy](https://www.yaps.ai/privacy) · [Support](mailto:support@yaps.ai)
