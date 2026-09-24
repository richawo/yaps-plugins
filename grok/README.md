# Yaps plugins for Grok Build

## One plugin: `grok/yaps`

**Supercharge Grok with powerful local AI tools.** [`grok/yaps`](yaps/) is the single all-in-one Yaps plugin for the xAI marketplace: twelve skills, one local MCP server for every media workflow (48 tools), and the private-vault Memory connector. It is the entry to submit and promote.

Generate it with:

```sh
node scripts/generate-grok-bundle.mjs
```

Both servers run from one pinned public commit of this repository through `npx`, so the Memory launcher's Grok identity ships without waiting on an npm release. Bump `RUNTIME_COMMIT` only to a pushed, reachable commit, regenerate, push, then bump the marketplace `sha`.

## Twelve focused plugins (superseded)

Twelve purpose-specific plugins, each containing one skill and one local stdio MCP server. They reuse the existing Yaps desktop app and the shared runtime. The catalog supports source subdirectories, so these plugins can have separate marketplace entries without twelve extra repositories.

Generate packages with:

```sh
node scripts/generate-grok-standalone.mjs
```

Media workflows use the published `yaps-cursor-runtime@0.3.0`. Memory uses `yaps-cursor-runtime@0.3.1`, whose publication requires npm approval before its marketplace PR can be marked ready. Its Grok Memory launcher uses the generic `local-mcp` identity and leaves automatic authorization disabled. Existing Cursor packages remain on their previously verified runtime reference.

Submit each `grok/plugins/<id>` folder as a separate remote-source entry to [xAI's marketplace](https://github.com/xai-org/plugin-marketplace). Pin the complete public source commit SHA, set its `source.path`, and regenerate the upstream component index. xAI requires one catalog entry per pull request.

Each package documents setup, permissions, network behavior, ownership, and validation limits. Direct MCP checks do not establish a live Grok host tool call, fresh Windows validation, or marketplace acceptance. Source is maintained by Richard Awoyemi under the existing `richawo` account; submissions must explain that ownership because xAI prefers organization-owned sources.

See [submission links and remaining work](PUBLISHING.md), [validation evidence](VALIDATION.md), and [machine-readable review state](submission-state.json).
