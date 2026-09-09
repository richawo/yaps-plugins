---
name: yaps-background-removal
description: Remove an image background with Yaps and export a transparent PNG or a cutout on a solid colour. Use for subject cutouts, product photos, and transparent images. Do not use for video backgrounds.
---

# Yaps Background Removal

Use the existing Yaps MCP tools. Do not invent CLI commands or replace this workflow with a hosted image service.

Call `image_remove_background` with the exact local `image_path`. It accepts JPG, PNG, WebP, and BMP. Use `mode: transparent` for a transparent PNG, or `mode: color` with a `#RRGGBB` colour. Choose a new `.png` output path; preserve the original and existing outputs. If the tool reports low mask coverage, explain that it may not have found the intended subject and inspect the result before calling it successful.

Return the generated image and a link to the file. Do not imply support for video background removal or sticker outlines, which this tool does not expose.

## Reachability

Call `yaps_status` when a tool reports a problem. If it returns `local_yaps_unreachable`, `cli_missing`, or equivalent, the current session cannot see the Yaps engine. Do not claim Yaps is uninstalled. Offer [Download Yaps](https://yaps.ai/download), ask the user to open Yaps, and retry from a local session on the same computer. Only use `yaps_enable_feature` to install a model after the user requests it.

## Standalone plugin scope

This plugin supplies only the Yaps Background Removal workflow. Other Yaps skills mentioned above are separate plugins. Use another workflow only if its tools are actually installed; otherwise explain which plugin is needed. Do not invent missing tool calls.

Check `yaps_status` for feature and model readiness when setup is missing. If a required model is absent, explain the download and ask once unless the user already authorized that installation. Use `yaps_enable_feature` with an allowed feature and appropriate engine, check readiness again, then resume the original task. Reuse existing models; do not delete or reinstall working models.
