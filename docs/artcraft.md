# Artcraft integration

The installed Crafting Apps provide local stdio MCP servers; these are distinct from the generative Artcraft studio service.

Verified November 5, 2026 on the AI workstation; re-verified November 7, 2026 on the Ubuntu 26.04 development machine, where the apps ship as distro packages in `/usr/bin` rather than `~/.local/bin`:

| App | Version | MCP tools | Intended use |
| --- | --- | --- | --- |
| PhotoCraft | 0.18.0 / 0.21.0 | 26 | Raster art and texture editing |
| VectorCraft | 0.19.0 / 0.22.0 | 33 | Seals, symbols and UI artwork |
| SolidCraft | 0.29.0 / 0.30.1 | 20 / 21 | Parametric 3D props and geometry |
| TextureCraft | 0.4.0 | 22 | PBR texture authoring, mesh-map baking |

Entries `artcraft_photocraft`, `artcraft_vectorcraft`, `artcraft_solidcraft` were added to the user's Codex configuration. Existing entries were preserved. PhotoCraft and VectorCraft can read this project and write its `art` directory. SolidCraft is confined to `art`. TextureCraft reads the project and writes `art`. No credentials are required for the tested local servers.

`scripts/check-artcraft.py` resolves each `*-cli` binary through `PATH` before falling back to known install locations, so it runs unchanged on both machines, and reports an app as not installed instead of aborting.

Run `python3 scripts/check-artcraft.py` to repeat the initialize/tools-list probes. The current chat can use the stdio MCP protocol directly even if its tool list has not refreshed. New MCP tool registration may require reloading the client.

`python3 scripts/artcraft-seal.py` opens the original SVG, saves an editable VectorCraft document, exports PNG and copies the export into the game. This pipeline was actually executed successfully. Other production asset transformations remain untested. These connections do not establish generative-image or rigged-character generation capability.

## TextureCraft and the existing asset ceiling

TextureCraft reads the bundled models, but the CC0 KayKit and Quaternius meshes are palette-atlas assets and are not paintable. `texturecraft-cli info` reports the UV layout:

| Mesh | UV overlap | Zero-area UV triangles |
| --- | --- | --- |
| `dungeon/.../barrel_small_stack.gltf.glb` | 472% | 73 |
| `adventurer/.../Knight.glb` | 373% | 917 |

Overlap above 100% means faces share the same texels, so a paint stroke changes several unrelated places at once. All 203 dungeon props also share one 1024x1024 `dungeon_texture`, leaving no room for per-prop detail. The project sets no `normalMap`, `roughnessMap`, `metalnessMap` or `aoMap` anywhere, so every surface has a single uniform material response.

New geometry does not have this problem: TextureCraft generates an automatic unwrap for meshes that arrive without UVs.

Verified content pipeline (executed November 7, 2026):

1. SolidCraft builds parametric geometry and exports OBJ. SolidCraft has no GLB writer and its CAD kernel emits no UVs.
2. TextureCraft `mesh_import` reads the OBJ and auto-unwraps it. The test box produced 6 charts at 0.00001% overlap with no zero-area triangles.
3. TextureCraft `bake` traces mesh maps (ambient occlusion, curvature, normal) on the GPU.
4. TextureCraft `mesh_export` with `format: glb` writes embedded textures. The test output carried `NORMAL`, `POSITION` and `TEXCOORD_0` plus `baseColorTexture` and `metallicRoughnessTexture`, which `GLTFLoader` reads directly.

SolidCraft is a CAD kernel, so this path suits hard-surface props, architecture and equipment. It does not produce organic creature or character meshes, and no tested app in this set replaces the rigged CC0 character packs.

## November 10 asset-production setup

Blender 5.2.4 LTS, bundled Rigify and MCP for Blender 2.2.7 are installed on the bmoser desktop. Loopback bridge inspection and a DeepSeek Codex-profile inspection succeeded. The reviewed [asset-production workflow](asset-production-pipeline.md) supersedes blanket weld/purge/transform instructions. Meshy is optional and deferred; SolidCraft remains for hard-surface parts. This setup does not imply that creatures have been remodeled.
