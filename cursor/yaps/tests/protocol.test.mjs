import assert from "node:assert/strict";
import test from "node:test";
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skip = process.platform !== "darwin" ? "fixture uses macOS app metadata; Windows candidate tests run separately" : false;

test("both packaged launchers speak MCP; Auto Cut executes and Memory retains native policy errors", { skip, timeout: 15000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), "yaps-plugin-protocol-"));
  const clients = [];
  try {
    const contents = join(root, "Yaps.app/Contents");
    const binaries = join(contents, "MacOS");
    await mkdir(binaries, { recursive: true });
    await writeFile(join(contents, "Info.plist"), '<plist><dict><key>CFBundleIdentifier</key><string>com.yaps.app</string><key>CFBundleShortVersionString</key><string>2.3.2129</string></dict></plist>');
    const cli = join(binaries, "yaps_cli");
    await writeFile(cli, `#!${process.execPath}\nconst args=process.argv.slice(2); console.log(JSON.stringify(args.includes('auth') ? {authenticated:true,status:'active'} : args.includes('cut') ? {presets:[{id:'natural'}]} : {settings_path:'/fixture/settings.json',settings_exists:true,auth_store_path:'/fixture/auth',models_dir:'/fixture/models'}));\n`);
    await chmod(cli, 0o755);
    const native = join(binaries, "yaps_mcp");
    await writeFile(native, `#!${process.execPath}\nconst readline=require('node:readline');const fs=require('node:fs');fs.writeFileSync(process.env.QA_MARKER,JSON.stringify({client:process.env.YAPS_MCP_CLIENT_ID,autoRead:process.env.YAPS_MCP_AUTO_AUTHORIZE_READ}));readline.createInterface({input:process.stdin}).on('line',line=>{const m=JSON.parse(line);if(m.id===undefined)return;let result;if(m.method==='initialize')result={protocolVersion:'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'fixture-native',version:'1'}};else if(m.method==='tools/list')result={tools:[{name:'vault_status',description:'Fixture vault status',inputSchema:{type:'object',properties:{}}}]};else if(m.method==='tools/call')result={isError:true,content:[{type:'text',text:'Agent read denied by Yaps Agent Access policy.'}]};else result={};process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:m.id,result})+'\\n');});\n`);
    await chmod(native, 0o755);
    const config = JSON.parse(await readFile(join(pluginRoot, "mcp.json"), "utf8"));
    for (const [name, entry] of Object.entries(config.mcpServers)) {
      const client = new Client({ name: "yaps-plugin-test", version: "1" });
      clients.push(client);
      // Keep fixture tests offline. Published archive installation is checked
      // separately with npx from an unrelated working directory.
      const script = name === "yaps" ? "launch.mjs" : "launch-memory.mjs";
      const transport = new StdioClientTransport({ command: process.execPath, args: [join(pluginRoot, "scripts", script)], cwd: root,
        env: { ...process.env, ...entry.env, YAPS_CLI_BINARY: cli, QA_MARKER: join(root, "native-env.json") }, stderr: "pipe" });
      transport.stderr?.on("data", () => {});
      await client.connect(transport);
      const listed = await client.listTools();
      if (name === "yaps") {
        const names = new Set(listed.tools.map(tool => tool.name));
        for (const tool of ["image_remove_background", "transcribe_media", "cut_create", "cut_render", "cut_delete", "audio_clean", "srt_generate", "translate_file"]) assert.ok(names.has(tool), tool);
        const result = await client.callTool({ name: "cut_presets", arguments: {} });
        assert.equal(result.isError, undefined);
        assert.equal(result.structuredContent.presets[0].id, "natural");
      } else {
        assert.deepEqual(listed.tools.map(tool => tool.name), ["vault_status"]);
        const denied = await client.callTool({ name: "vault_status", arguments: {} });
        assert.equal(denied.isError, true);
        assert.match(denied.content[0].text, /Agent read denied/);
        assert.deepEqual(JSON.parse(await readFile(join(root, "native-env.json"), "utf8")), { client: "cursor", autoRead: "0" });
      }
    }
  } finally {
    for (const client of clients) await client.close();
    await rm(root, { recursive: true, force: true });
  }
});
