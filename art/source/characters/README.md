# Hill dwarf base — Blender capability prototype

Issue #41. This is an editable art prototype, not a replacement for a released
character. No gameplay code, rules, runtime model mapping or release is changed.

## Files

- `hill-dwarf-base.blend`: editable body, head, optional beard, basic rig and studio.
  Open the **Hill dwarf — neutral base** scene. The original default scene remains
  intact; the GLB export includes only the prototype scene's selected character.
- `../../exports/characters/hill-dwarf-base.glb`: three skinned character meshes,
  one 20-bone rig, embedded palette texture, no studio objects or animations.
- Front, side, back and three-quarter PNGs in the same export directory.
- `hill-dwarf-validation.json`: connectivity, closed surface, weights, elbow-pose
  deformation and export-content results. `hill-dwarf-report.json`: mesh counts.

## Design and provenance

The pinned HoL hill-dwarf description calls for broad shoulders, solid limbs,
strong backs, dense hair and a weathered face. This adult masculine prototype
uses short legs, a broad torso, large hands/feet and unadorned hair/beard. It is a
non-explicit neutral body, without clothing, class kit, culture ornament or
background tools. It is one body/face example, not the range of all hill dwarves.

The face/hair/ears/nose mesh and palette derive from the **KayKit Adventurers 2.0
Ranger** model already bundled at `public/assets/characters/adventurersv2/Ranger.glb`.
It was imported through Blender, evaluated without its original body/gear,
reshaped, softened with a small bevel/smooth normals, and rebound. Bruce approved the core body silhouette and requested a softer face, visible neck, and cleaner hands/feet; the next revision retains that body, raises/softens the head, extends the neck, and reshapes fingers/thumbs/toes. The body and optional beard are new generated geometry;
the body is voxel-welded into a continuous closed surface and reduced to a
compact mesh. Skin uses an explicit swatch of the authored face atlas; the optional beard has its own auburn material.

KayKit creator: Kay Lousberg, https://kaylousberg.com. License: CC0 1.0 Universal;
full license retained at `public/assets/characters/LICENSE.txt`. Purchased source:
The Complete KayKit Collection v8, Adventurers 2.0. See `docs/assets.md` for archive
provenance. No external model generation service or new asset purchase was used.

## Reproduce and validate

Requires Blender 5.2 LTS. User orbit/zoom is restored after an interactive rebuild. From the repository root:

```sh
blender --background --python-exit-code 1 --python scripts/blender/build_hill_dwarf.py
blender --background art/source/characters/hill-dwarf-base.blend --python-exit-code 1 --python scripts/blender/validate_hill_dwarf.py
blender --background art/source/characters/hill-dwarf-base.blend --python-exit-code 1 --python scripts/blender/render_hill_dwarf.py
```

The actual prototype was constructed in the open Blender application using the
installed MCP `execute_blender_code` tool, then rendered/validated in background
Blender processes. The source builder also works without MCP via the command above.

## Prototype limits

The rig demonstrates basic deformation; existing KayKit animation retargeting,
complex shoulder/hip poses, independent finger animation, clothing layers and
in-game lighting/scale are **not validated**. The head still combines the original
face and hair; further modular head work is needed before interchangeable hair.
Automatic body weights are a starting point for manual refinement. User visual
approval is separate from these structural checks.
