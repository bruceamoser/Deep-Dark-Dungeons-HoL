# Registering the Craft MCP servers in VS Code

The Craft apps expose stdio MCP servers. They are **not** registered by default.

Registering them costs tool slots that VS Code shares across every MCP server and
built-in tool. A model accepts at most 128 tools; anything beyond that is silently
dropped and VS Code shows "The model only supports 128 tools, N tools were not
provided to the model". Registering all four apps added 102 tools and pushed the
total past the limit, so the configuration below is opt-in and lists only the two
servers that 3D work actually needs.

| Server | Tools | Register when |
| --- | --- | --- |
| `solidcraft` | 21 | Authoring parametric props and geometry |
| `texturecraft` | 22 | Authoring PBR textures and baking mesh maps |
| `photocraft` | 26 | Raster texture editing (add only when needed) |
| `vectorcraft` | 33 | Seals, symbols and UI artwork (add only when needed) |

SolidCraft and TextureCraft together add 43 tools. If the warning returns, drop
back to one server, or drive the CLIs directly - `scripts/check-artcraft.py` already
does that and needs no registration at all.

## Opt in

Copy this into `.vscode/mcp.json` in the repository root, then reload the window.

```json
{
  "servers": {
    "artcraft-solidcraft": {
      "type": "stdio",
      "command": "/usr/bin/solidcraft-cli",
      "args": ["mcp", "--headless", "--allow-path", "${workspaceFolder}/art"]
    },
    "artcraft-texturecraft": {
      "type": "stdio",
      "command": "/usr/bin/texturecraft-cli",
      "args": ["mcp", "--read-root", "${workspaceFolder}", "--write-root", "${workspaceFolder}/art"]
    }
  }
}
```

Keep this file out of version control if your machine installs the apps elsewhere;
paths differ between the AI workstation (`~/.local/bin`) and this one (`/usr/bin`).

## Without registration

Every capability is reachable over stdio, which is what the tooling scripts use:

```bash
python3 scripts/check-artcraft.py                       # initialize + tools/list on all four
texturecraft-cli info <mesh>                            # texture sets, triangles, UV report
texturecraft-cli batch script.json                      # run a command script
solidcraft-cli run design.json --out prop.obj           # parametric geometry
```
