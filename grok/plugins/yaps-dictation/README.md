# Yaps Dictation for Grok Build

Check voice typing readiness and recover recent dictations with local Yaps. Uses your existing dictation models and desktop shortcuts.

One purpose-specific plugin with one skill and one local MCP server. Install only the Yaps workflows you need. The twelve plugins share the same maintained runtime and existing desktop models.

## Setup

1. Install [Yaps desktop](https://yaps.ai/download) on the same computer and sign in with active desktop access.
2. Install Node.js 20+ with npm/npx. The MCP configuration installs the exact package `yaps-cursor-runtime@0.3.0` from npm. No Git checkout or separate CLI installation is needed.
3. Install this plugin in a Grok Build environment that can start local stdio MCP processes on that computer. A cloud-only session cannot reach a desktop engine on another machine.
4. Call yaps_status to check feature and model readiness. Missing feature models can be installed after your agreement; existing models and your Yaps account are reused.

Yaps 2.3.124 is only the credential-free account-check minimum. Individual tools can require a newer desktop version. No API key is required.

## Execution, network, and permissions

The plugin starts a local stdio MCP process using an exact npm package version. npm contacts registry.npmjs.org to download that package and its JavaScript dependencies. The package has no installation lifecycle scripts and does not fetch or run arbitrary shell scripts or native binaries. Its source is readable in this repository; the package name retains Cursor for compatibility with the shared runtime.

The wrapper calls the already installed Yaps CLI or native MCP helper. It does not directly upload media or vault contents. Tool results, including requested text or notes, are returned to the calling Grok host and are subject to that host's data handling. Only request files and notes that the user intends to share with that host.

The existing desktop app can contact yaps-api.richardawoyemi.workers.dev for account refresh, model assets, and its diagnostic service. Asset redirects and endpoints depend on the installed desktop release; older releases can use huggingface.co and GitHub release assets. These are desktop operations, not a hosted MCP endpoint. Model setup requires authorization unless already granted. Existing desktop diagnostics may report operation outcomes under Yaps' privacy settings; this wrapper has no independent telemetry uploader. See [Yaps privacy](https://yaps.ai/privacy).

Credentials stay in the existing desktop account store. The plugin asks for no API keys, tokens, or credential files. File access is limited by the installed helper, operating system permissions, the requested workflow, and, for Memory, Yaps Agent Access. It provides no generic shell-execution tool or lifecycle hooks. Preserve input media and export to a separate output path.

## Validation and distribution

The shared runtime has direct macOS MCP and selected media-export coverage. The Grok manifest is checked with the xAI catalog extractor. Live Grok host tool execution, a fresh Windows run of this package, and fresh model downloads for every workflow are not established by those checks. Marketplace submission is subject to xAI review and does not itself mean acceptance or availability in every Grok product.

## Ownership and maintenance

Richard Awoyemi maintains the Yaps plugin source under the existing richawo GitHub account. This is the same public source used by the published Yaps Cursor packages; it is not a separate third-party implementation. Source and skills use the MIT license included here. Desktop models retain their own licenses.

Generated from the central workflow catalog and skills by scripts/generate-grok-standalone.mjs. Keep the Grok manifest and runtime version pinned together, validate, publish the source commit, then update the marketplace SHA and generated index.

[Yaps](https://yaps.ai) · [Privacy](https://yaps.ai/privacy) · [Terms](https://yaps.ai/terms)
