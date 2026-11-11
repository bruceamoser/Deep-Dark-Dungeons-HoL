# Goblin Spearhand — owned-source preview

November 11, 2026. Bruce requested a clean goblin head, coordinated skin/outfit colours and equipped animation review **before dungeon integration**. This is a private preview; no installed or runtime creature replacement.

## Assembly and visual decisions

- Retain the accepted Dungeon Mason Body08, Spear02, exact skeleton and corrected Attack02 thrust from the source pilot.
- Replace the human head/face/hair with a newly authored closed head, projecting nose, tapered jaw, long folded ears, amber eyes, distinct pupils/brows, rectangular teeth and two small fangs. The scalp is deliberately bare under removable headgear. No generated-head cutout or image projection is used.
- Moss-green skin, rust-red tunic, brown gloves/boots, dark undercloth and restrained brass trim. Outfit recolouring uses the source UV masks; a rest-space foot-region material assignment separates boots from the original shared cloth colour. Source topology/weights remain unchanged.
- Add a separate brass saucepan helmet and handle from the pinned Spearhand illustration. Helmet can be hidden for bare-head review. All new rigid head/helmet parts use the existing head bone; there is no facial animation.
- Plastic finish remains roughness 0.30, with the metal pot at 0.34. Early review removed protruding hair, smoothed the voxel-fused head normals, corrected ear inset/winding and replaced bead-like teeth with softly beveled shapes.

The head/body intentionally follow the game's rounded character style, rather than the illustration's gaunt anatomy. The outfit is a clean stylized adaptation, not an exact recreation of its ragged salvage clothes. Final visual approval belongs to Bruce.

## Measured result and checks

Final GLB: **29,454 triangles**, four mesh groups rendered as 14 primitives/draw calls, 14 materials, one embedded 512×512 palette texture, 2,214,740 bytes. The palette occupies approximately 1 MiB as RGBA8, or 1.33 MiB with a full mip chain. These are preview-render costs, not an encounter FPS prediction.

- Exact comparison with the accepted fixture: all 43 source rest bones/hierarchy, body/spear vertices/topology/weights/transforms and five animation channels/keyframes preserved.
- Isolated Blender export/import/export/reimport: 43 bones, five actions, four skinned mesh groups and one loaded image preserved. Structural test, not proof of identical rendered output.
- Actual silent Three.js GLB review: finite animated geometry, distinct poses, visible model pixels, no missing animation bindings. Front, side, back and three-quarter plus five state screenshots reviewed.
- Separate presentation: 254 frames at 30 fps, original clip speed, repeated idle/walk/thrust/hit and one death with final hold. Head/helmet stay attached through the inspected samples; spear uses the previously validated point-first thrust. No page errors. Silent 900×900 H.264 MP4, 8.47 seconds.
- Syntax checks passed. No gameplay change or native launcher check was needed for this isolated asset preview. No six-creature benchmark, actual dungeon lighting/scale qualification or Windows validation performed.

Provisional author semantic-fit assessment using the six-part audit: **A/S/F/G/M/D = 4/3/4/4/4/4 → 77/100**. Goblin anatomy and spear/saucepan role are readable, while the round body, polished spear and tidy outfit depart from the reference. This does not replace the roster's in-game rating or constitute independent/final art approval. Distinction and readability require rechecking in the dungeon after Bruce reviews this preview.

## Reproduction and licensing

Use `scripts/toolchain/prepare-mason-spear-pilot.py` to build the accepted source fixture from the licensed package. Then:

```sh
blender --background --factory-startup -noaudio --python-exit-code 1 \
  --python scripts/toolchain/build-goblin-spearhand-pilot.py -- \
  /private/source-spear.blend /private/RPGTinyHeroWavePolyart /private/goblin-spearhand
AUDIT_URL=http://127.0.0.1:5197 node scripts/toolchain/review_asset_submission.mjs \
  /private/goblin-spearhand/goblin-spearhand.glb /private/goblin-spearhand/validation 0.85 embedded
AUDIT_URL=http://127.0.0.1:5197 node scripts/toolchain/review-goblin-spearhand.mjs \
  /private/goblin-spearhand/goblin-spearhand.glb /private/goblin-spearhand/presentation
```

Preview renderer uses the local game's Three.js dependency and actual exported materials/clips. Original sources remain untouched. Dungeon Mason purchase/source hash/license are recorded in [owned-assets inventory](owned-assets-pilot.md) and [Dungeon Mason documentation](dungeon-mason-characters.md). Newly authored geometry is created by the versioned builder; the combined asset remains dependent on licensed geometry and is kept out of public Git. No extra paid asset, external model call or cloud generation was used.

Private artifact root: `~/.local/share/four-lanterns-modular-pilot/2026-11-11/goblin-spearhand`. It contains editable `.blend`, GLB, provenance, preservation report, roundtrip report, static/motion validation and the final `goblin-spearhand-preview.png` / `goblin-spearhand-motion.mp4`. These must transfer separately between machines.

Update: Bruce approved the preview and requested dungeon qualification. The [six-creature native encounter report](goblin-spearhand-dungeon.md) records the subsequent runtime integration, animation checks, performance and local installation. The measurements above remain the original isolated-preview record. No roster batch restart.
