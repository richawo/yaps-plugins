# Yaps plugins for Grok Build

Twelve purpose-specific plugins, each containing one skill and one local stdio MCP server. They reuse the existing Yaps desktop app and the shared runtime. The catalog supports source subdirectories, so these plugins can have separate marketplace entries without twelve extra repositories.

Generate packages with:

```sh
node scripts/generate-grok-standalone.mjs
```

The runtime is pinned to `yaps-cursor-runtime@0.3.1`. Its Grok Memory launcher uses the generic `local-mcp` identity and leaves automatic authorization disabled. Existing Cursor packages remain on their previously verified runtime reference.

Submit each `grok/plugins/<id>` folder as a separate remote-source entry to [xAI's marketplace](https://github.com/xai-org/plugin-marketplace). Pin the complete public source commit SHA, set its `source.path`, and regenerate the upstream component index. xAI requires one catalog entry per pull request.

Each package documents setup, permissions, network behavior, ownership, and validation limits. Direct MCP checks do not establish a live Grok host tool call, fresh Windows validation, or marketplace acceptance. Source is maintained by Richard Awoyemi under the existing `richawo` account; submissions must explain that ownership because xAI prefers organization-owned sources.
