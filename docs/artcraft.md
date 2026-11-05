# Artcraft integration

The installed Crafting Apps provide local stdio MCP servers; these are distinct from the generative Artcraft studio service.

Verified November 5, 2026:

| App | Version | MCP tools | Intended use |
| --- | --- | --- | --- |
| PhotoCraft | 0.18.0 | 26 | Raster art and texture editing |
| VectorCraft | 0.19.0 | 33 | Seals, symbols and UI artwork |
| SolidCraft | 0.29.0 | 20 | Parametric 3D props and geometry |

Entries `artcraft_photocraft`, `artcraft_vectorcraft`, `artcraft_solidcraft` were added to the user's Codex configuration. Existing entries were preserved. PhotoCraft and VectorCraft can read this project and write its `art` directory. SolidCraft is confined to `art`. No credentials are required for the tested local servers.

Run `python3 scripts/check-artcraft.py` to repeat the initialize/tools-list probes. The current chat can use the stdio MCP protocol directly even if its tool list has not refreshed. New MCP tool registration may require reloading the client.

`python3 scripts/artcraft-seal.py` opens the original SVG, saves an editable VectorCraft document, exports PNG and copies the export into the game. This pipeline was actually executed successfully. Other production asset transformations remain untested. These connections do not establish generative-image or rigged-character generation capability.
