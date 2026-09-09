# Grok package validation, 9 September 2026

The marketplace source pin is `84b97889aa96ab3aef57b0a36bf6150dce9babbe`. Validation uses xAI marketplace tooling from `57606128c511b20a03f92aca18d9ee96d0a4fab0`.

## Completed checks

- All twelve skill folders pass the skill validator. The upstream xAI component extractor finds exactly one skill and one stdio MCP server in each Grok package, with version `0.1.0`.
- The shared runtime's 24 Cursor package tests pass, including Grok Memory identity selection, disabled automatic authorization, scoped feature setup, and rejection of tools or model downloads outside the selected profile.
- All eleven media packages install `yaps-cursor-runtime@0.3.0` using a fresh npm cache and empty npm user/global configuration. Their actual Grok MCP configurations initialize on macOS without an explicit CLI path override, expose the expected tool counts, and return ready account/connection status.
- The prepared local `yaps-cursor-runtime@0.3.1` tarball initializes Memory's native connector with 28 tools. A `vault_status` call preserves the expected Agent Access denial with generic `local-mcp` identity. No note bodies were read, and no access policy was changed.
- Each submitted marketplace PR independently runs `generate-plugin-index.py`, `validate-catalog.py`, and `generate-plugin-index.py --check`. An additional comparison rejects changes to any existing catalog entry or generated component record.

| Workflow | Tools discovered | Readiness result |
| --- | ---: | --- |
| Dictation | 4 | Ready |
| Transcription | 3 | Ready |
| Meeting Notes | 14 | Ready |
| Text to Speech | 4 | Ready |
| Background Removal | 3 | Ready |
| Audio Cleaner | 3 | Ready |
| Auto Captions | 13 | Ready |
| SRT Generator | 3 | Ready |
| Translation | 5 | Ready |
| Video to Audio | 2 | Ready |
| Auto Cut | 13 | Ready |
| Memory, local prepared tarball | 28 | Expected Agent Access denial |

Ready here describes session and account resolution. It does not prove that every feature model is installed or that its requested operation succeeds. Earlier direct macOS operation results and setup failures remain documented in [Cursor validation boundaries](../cursor/PUBLISHING.md#validation-boundaries).

## Publication and host limits

The eleven media configurations use the already published npm `0.3.0` artifact. Memory's `0.3.1` publication is still blocked on npm passkey approval; its local-tarball check is not an anonymous registry-install test. Keep its marketplace PR in draft until publication and registry verification succeed.

The new packages have no fresh Windows run, no live Grok host tool call, and no fresh model download test for every workflow. A read-only search in the Grok Bot desktop marketplace showed no Yaps entry. That application did not expose a local plugin import action in the inspected controls, so no live host execution is claimed.

xAI's external-contributor catalog workflow requires a maintainer to approve running it. Local validation and completed security scans do not substitute for that workflow, code-owner review, merging, or marketplace publication. This submission targets the linked Grok Build catalog; automatic distribution to every Grok product has not been established.
