# Yaps Image Generate for Claude, ChatGPT Desktop, and Codex

This local-first plugin must be able to reach the Yaps engine installed on the
user's computer. In Claude, use Claude Code or the Claude desktop app on the
computer where Yaps is installed. If you are using ChatGPT web or a cloud
session, [download or open ChatGPT desktop](https://chatgpt.com/download/) and
retry in a local-capable Work or Codex session. You can also access this
feature directly in the Yaps application. The workflow checks actual Yaps
reachability instead of relying on a user-agent guess or assuming that Yaps is
uninstalled.

Yaps Image Generate turns a short prompt into a PNG with the local FLUX.2
[klein] 4B model supplied by Yaps desktop. Optional sticker export also uses
the Background Removal model already in Yaps.

The plugin and [Yaps 2.3.124 or newer](https://yaps.ai/download) can be
installed in either order. Image generation needs Apple Silicon with 16 GB or
more. Yaps no longer has a free tier: this feature requires either an active
free trial or Yaps Pro. Trial eligibility and the current offer are confirmed
inside Yaps.

After account access is active, the plugin uses the CLI already packaged inside
Yaps; no separate CLI install or Agent Access permission is required. Enable
Image generation under Yaps Features when prompted. The first image loads the
~4.3 GB model; later images in the same session stay warm.

The plugin processes only the prompt the user supplies and does not upload it
to a hosted image API. For removing a photo's background, use Yaps Background
Remover instead.

See the [Yaps privacy policy](https://www.yaps.ai/privacy), [terms](https://www.yaps.ai/terms), or contact [support@yaps.ai](mailto:support@yaps.ai).
