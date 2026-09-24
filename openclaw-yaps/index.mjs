import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

// The manifest loads the portable skill catalog. No native tool registration is needed.
export default definePluginEntry({
  id: "yaps",
  name: "Yaps",
  description: "Yaps local desktop skill catalog",
  register() {},
});
