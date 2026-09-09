# Yaps Grok marketplace submissions

Checked 2026-09-09T02:11:33.377065+00:00. Twelve separate pull requests are open in the xAI Grok Build marketplace: eleven submitted for review and one Memory draft. None is merged or an accepted marketplace listing.

Each PR adds exactly one purpose-specific plugin, with one skill and one named local MCP server. All source entries pin `84b97889aa96ab3aef57b0a36bf6150dce9babbe` and a distinct `grok/plugins/<id>` directory in the existing repository. No extra source repositories were required.

| Workflow | Pull request | State |
| --- | --- | --- |
| Yaps Dictation | [#626](https://github.com/xai-org/plugin-marketplace/pull/626) | Submitted for review |
| Yaps Transcription | [#627](https://github.com/xai-org/plugin-marketplace/pull/627) | Submitted for review |
| Yaps Meeting Notes | [#628](https://github.com/xai-org/plugin-marketplace/pull/628) | Submitted for review |
| Yaps Text to Speech | [#629](https://github.com/xai-org/plugin-marketplace/pull/629) | Submitted for review |
| Yaps Background Removal | [#630](https://github.com/xai-org/plugin-marketplace/pull/630) | Submitted for review |
| Yaps Audio Cleaner | [#631](https://github.com/xai-org/plugin-marketplace/pull/631) | Submitted for review |
| Yaps Auto Captions | [#632](https://github.com/xai-org/plugin-marketplace/pull/632) | Submitted for review |
| Yaps SRT Generator | [#633](https://github.com/xai-org/plugin-marketplace/pull/633) | Submitted for review |
| Yaps Translation | [#634](https://github.com/xai-org/plugin-marketplace/pull/634) | Submitted for review |
| Yaps Video to Audio | [#635](https://github.com/xai-org/plugin-marketplace/pull/635) | Submitted for review |
| Yaps Auto Cut | [#636](https://github.com/xai-org/plugin-marketplace/pull/636) | Submitted for review |
| Yaps Memory | [#637](https://github.com/xai-org/plugin-marketplace/pull/637) | Draft: npm approval pending |

## What remains

The eleven media plugins reuse published `yaps-cursor-runtime@0.3.0`. Memory needs the prepared `0.3.1` runtime release to preserve the generic local MCP identity. Two npm approval requests expired without publication. Do not reuse those expired links or claim the release is published. Start one fresh npm publish when Richard is available to approve the passkey prompt, keep the publisher running, verify anonymous registry integrity and installation, then mark the Memory PR ready.

xAI must approve the external-contributor catalog workflow, review ownership and behavior, and merge each PR. The local upstream generator and validator pass on all twelve PRs. Reported security checks are recorded separately in [submission-state.json](submission-state.json); their success is not marketplace acceptance. The PRs explain why official Yaps source currently lives under the established personal `richawo` maintainer account rather than a separate organization.

Live Grok host execution, fresh Windows testing, and downloads for every feature remain unverified. A search in the Grok Bot desktop marketplace did not show Yaps. This submission targets the linked Grok Build catalog, and does not establish automatic availability in every Grok product. See [validation details](VALIDATION.md).

## Follow-up

Update each existing PR in place if review requests changes. Keep each PR scoped to its own entry and generated component record. If sequential merges create conflicts among the remaining PRs, incorporate upstream changes safely and regenerate the index. Never force-push or create duplicate submissions.
