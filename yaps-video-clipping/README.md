# Yaps Auto Cut for Claude Code

Remove long pauses from a talking-head video with Yaps Auto Cut. Review the cut plan, adjust the pacing, and export a separate MP4. Install Yaps and sign in.

## Get started

1. [Download Yaps](https://www.yaps.ai/download?utm_source=claude-code&utm_medium=agent&utm_campaign=agent-plugins) on the computer running Claude Code. Open Yaps and sign in. New users need a Yaps account.
2. Use Yaps 2.3.848 or newer for Auto Cut. Node.js 22 or newer must be available. Normal macOS and Windows installs and official Linux deb/rpm installs are supported. Setapp and standalone AppImage account automation are not supported.
3. Install the plugin:

```sh
claude plugin marketplace add richawo/yaps-plugins
claude plugin install yaps-video-clipping@yaps
```

The plugin is free. Gated Yaps features require an active free trial or Yaps Pro. No user API key is needed. Approve any required model downloads before processing. Auto Cut has no model download of its own.

## Try it

- "Review the long pauses in this video before making any cuts."
- "Use natural pacing to tighten this product demo and save a new MP4."
- "Make this cut more relaxed, then export a separate version."

## Scope and privacy

Auto Cut removes pauses from an existing video. It does not generate new video, select semantic highlights, or rearrange scenes.

These skills invoke the installed Yaps CLI through a bundled adapter. They process selected files on that computer and preserve originals. Requested results can enter Claude's context. A remote Claude session cannot reach another computer's Yaps installation through this plugin. Cowork compatibility has not been verified.

If setup fails, open Yaps, check account access and feature readiness, then ask Claude to check Yaps status. A missing command requires a Yaps update. Do not work around a permission denial or overwrite an existing output.

[Privacy policy](https://www.yaps.ai/privacy) | [Terms](https://www.yaps.ai/terms) | [Product or security support](mailto:support@yaps.ai)
