# Game-ready creature production

## Prepared November 10, 2026

The core path is **existing/licensed/free base → Blender inspection/adaptation → rig/animation preservation or repair → GLB → actual game validation**. A coherent reference turnaround (front, side and back) informs the work. A cloud-generated base is an optional branch, not a requirement. Meshy is a cloud service, not a local modeling application; Bruce clarified he has no account and may not need it. No Meshy account, paid plan, separate server or generation was created.

On the bmoser desktop:

- Blender **5.2.4 LTS**, official archive SHA-256 `2fd14c50987426897ba60237ee996edf2b4151f4b1a72a460ca20be58c1d2d86`, extracted under `~/.local/opt/blender-5.2.4-linux-x64`; `~/.local/bin/blender` points to it. Original download stays in Downloads, outside Git.
- **Rigify** is bundled and enabled. Blender's Python, Geometry Nodes, mesh/weight tools and glTF exporter are available without extra packages.
- **MCP for Blender 2.2.7** installed in an isolated uv tool environment; matching add-on installed/enabled in Blender 5.2. Codex registers `mcp_servers.blender` on loopback port 9876. Telemetry disabled for this integration. Optional cloud providers disabled in the isolated workspace.
- Existing SolidCraft remains available for props/equipment. No Unity installation or engine migration is needed to prepare GLBs; Unity remains an optional future import utility if a specific asset requires it. TextureCraft was not found on this desktop's PATH; it is not required for this initial Blender pipeline.
- Repo skill: `.agents/skills/fld-game-assets/SKILL.md`. Source models/runtime GLBs are not altered by setup.

Launch a new isolated workspace from the repo root:

```sh
DISABLE_TELEMETRY=true blender --factory-startup --python scripts/toolchain/start_blender.py
```

This intentionally starts a new scene. Do not run scene-clearing/import scripts inside an unrelated personal Blender window. The setup enabled the add-ons in user preferences; it did not replace a startup scene. A fresh Codex session/restart may be needed to load its new MCP registration. The current session can use the installed bridge through the MCP probe CLI.

## DeepSeek worker alongside GPT

The GPT default and ChatGPT sign-in are preserved. A legacy `[profiles.deepseek]` entry was migrated to **`~/.codex/deepseek.config.toml`**, as required by this Codex version. Its scoped model catalog is `~/.codex/model-catalogs/deepseek.json`, sourced from DeepSeek's integration docs. It does not replace the GPT catalog globally. Official API model ID **`deepseek-flash`** currently routes to V4.1 Flash; do not invent a `deepseek-v4.1-flash` identifier.

The user saved a key using the installed `fld-credentials set deepseek` command. Owner-only credential file: `~/.config/four-lanterns-tools/credentials/deepseek.key`. A command-backed provider auth helper reads it internally; no key value is in this repo or TOML. Never run its `print` mode in chat tools: that mode is only for Codex's authentication subprocess. Use `status` for diagnostics. Configuration backup is local under `~/.codex/config.toml.before-asset-toolchain-*`.

```sh
# Interactive DeepSeek Codex session; does not change GPT defaults:
codex --profile deepseek
# A bounded worker can instead use codex exec --profile deepseek.
# Use a separate workspace and the permissions appropriate to that job.
```

Live authentication, a Codex response and a read-only Blender MCP scene query all passed. The scene query returned three objects; only `get_scene_info` was allowed/preapproved in that worker test. The initial attempt encountered the default MCP approval gate, so the final test explicitly allowed that one read-only tool without enabling scene writes. Its per-tool policy is now registered; other tools retain their existing approval behavior.

DeepSeek is verified as a **separate Codex CLI/profile worker**, not a newly added option in this running chat's built-in collaboration tool. No claim is made that the desktop's mixed-provider model picker was tested or that GPT subagents can directly select it here. Do not patch the desktop app or redirect OpenAI model names to DeepSeek. Reloading integrations/configuration and choosing a profile are distinct from replacing this chat's model.

GPT remains the design/integration reviewer. DeepSeek can handle bounded inventory checks, validator output, repetitive scripts and export bookkeeping. Numerical scripts should be checked deterministically; higher-tier models are not automatically reliable anatomical judges. Model calls have API usage costs, so avoid sending the full project/harness repeatedly for tiny arithmetic or deterministic checks.

## Review of the supplied blueprint

The **hybrid workflow is useful**, but its mechanical rules need these corrections:

| Supplied rule                                     | Project procedure                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mandatory Merge by Distance                       | Inspect duplicate positions first. Weld only a deliberate mesh/region at a scale-aware tolerance. Coincident vertices can encode UV seams, split normals, clothing layers and separate parts.                                                                                                                          |
| Delete faces hidden under clothing using raycasts | Produce candidates only. Occlusion in one pose/view does not prove a surface is expendable during animation, equipment changes or alternate outfits. Remove only confirmed permanent coverage on an editable copy.                                                                                                     |
| Quad decimation to 5,000–12,000 faces             | Decimation is not quad retopology. Count exported triangles and vertices after UV/material splits. Choose an asset-specific budget and preserve joint loops, silhouette, weights, UVs and morphs. Start pilot budgets around 12,000 triangles when practical; measure rather than force every creature to that number. |
| Place joints from bounding-box ratios             | Bounds provide scale and an initial guess only. Fit anatomical landmarks, grip/foot points and bone orientations, then test deformation across required clips. Tails, wings and nonhumanoids need appropriate rigs.                                                                                                    |
| Normalize weights / auto-rig in under 60 seconds  | Weight sums do not prove useful deformation. Check unweighted vertices, influence count, collapsing joints and actual clips. No promised universal rigging time; Mixamo's auto-rigger is humanoid-only and is optional.                                                                                                |
| Snap every object's origin to lowest Z            | Establish a grounded character/export root without moving individual bone/mesh origins arbitrarily. Preserve pivots and bind relationships. Blender is Z-up; exported glTF is Y-up. Floating creatures need an intentional hover baseline.                                                                             |
| Globally apply location/rotation/scale            | Never do this blindly to skinned meshes/armatures or animated objects. Apply rest-space cleanup before binding when possible; preserve and validate bind matrices, parenting, root motion and animation on existing rigs. Correct negative scale deliberately, not by a global loop.                                   |
| Collection names include a Textures collection    | Use meaningful collections for mesh/rig/props; textures are image/material datablocks, not Blender objects that belong in a collection. Name those datablocks and record texture files instead.                                                                                                                        |
| Non-manifold geometry always needs repair         | Report it with context. Cloth, mouths and intentional open surfaces need not be watertight. Only fix demonstrated rendering/deformation/export problems.                                                                                                                                                               |
| Raw cloud GLB is a ready T/A-pose                 | Request and verify a neutral pose. Check separated fingers/limbs, topology, UVs, licensing, skeleton/animations and silhouette before ingest acceptance.                                                                                                                                                               |

The pasted document is **Markdown with malformed nested fences**, not valid YAML. Keep prose/steps in Markdown, executable code in correctly labeled fences, and job manifests in separate valid JSON/YAML. Model roles are workflow choices, not demonstrated benchmark results.

## Inspection and round-trip tools

These scripts run in isolated Blender background processes and write only a report or new test export. They never repair the source asset.

```sh
blender --background --factory-startup \
  --python scripts/toolchain/validate_asset.py -- \
  public/assets/creatures/Wolf.glb test-results/asset-toolchain/wolf-inspection.json

blender --background --factory-startup \
  --python scripts/toolchain/roundtrip_smoke.py -- \
  public/assets/creatures/Wolf.glb test-results/asset-toolchain
```

The inspector reports triangles, vertices, UVs, zero-area faces, loose vertices, boundaries/nonmanifold edges, transforms, bone counts, weights, morphs and actions. Its findings are not automatic failure labels. Skinning counts are imported metadata, not a visual deformation test. Bounds are evaluated at the imported pose, not every animation frame.

The round-trip smoke test checks that bone counts, action counts, skinned-mesh counts and loaded texture counts survive import/export/reimport. It is structural evidence only; follow with Three.js animation/material comparison before production adoption. A source-only geometry pass is insufficient.

For each real asset job, record creature/source references, source license and hash, target body/role features, supported equipment/poses, triangle/material/texture budgets, permitted changes, editable output path, GLB output and validation evidence. Retain the original and the conditioned version separately. Stop iterative cleanup when the chosen acceptance checks pass; do not repeatedly decimate until the asset merely loads.

## Acceptance and next work

Use [the creature-fit audit](audits/2026-11-10-creature-fit.md) to choose the four representative pilots: Goblin Spearhand (assembly), Clay Helper (construct), Wererat (organic hybrid), Air Elemental (procedural/effects). Toolchain setup does not mean any of these has been remodeled.

Target a clear improvement toward at least 80/100 semantic fit with no wrong-body/rendering failure. Also require actual-game scale, coherent style, readable combat role, idle/walk/attack/hit/death, grips/feet, plausible joints, lighting/alpha and export/reimport checks. An 80-point identity score alone is not high-end presentation approval.

## Primary references

- [Official Codex advanced configuration](https://learn.chatgpt.com/docs/config-file/config-advanced): dedicated profile files and command-backed credentials.
- [Official Codex MCP configuration](https://learn.chatgpt.com/docs/extend/mcp): server registration and per-tool policy.
- [DeepSeek Codex integration](https://api-docs.deepseek.com/quick_start/agent_integrations/codex/): native Responses support and model catalog.
- [DeepSeek API model names](https://api-docs.deepseek.com/en/).
- [MCP for Blender upstream](https://github.com/ahujasid/mcp-for-blender): community tool, independent of the Blender Foundation; MIT.
- [Blender 5.2 LTS](https://www.blender.org/releases/5-2/) and [official release checksums](https://download.blender.org/release/Blender5.2/blender-5.2.4.sha256).
- [Meshy MCP upstream](https://github.com/meshy-dev/meshy-mcp-server): optional, not installed for this setup.
- [Mixamo limitations](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html).

## Does Blender need to stay open?

Interactive MCP requires a running Blender instance with its add-on/server active. Closing Blender ends that bridge. Background inspection and exports launch their own Blender process and do not require a window left open. The isolated setup-test window can be closed; start a new task-owned workspace for actual modeling.

## Local image-to-3D experiment

The [Crypt Ghoul pipeline pilot](local-mesh-pipeline-pilot.md) records successful local Modly/TRELLIS.2 geometry/textures and the failed first Mesh2Motion deformation gate. Tools are now installed on bmoser; earlier optional/deferred setup notes do not describe this completed experiment. Production models remain unchanged.
