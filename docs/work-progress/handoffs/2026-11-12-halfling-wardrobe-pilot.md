# 2026-11-12 — Halfling wardrobe and equipment pilot

- Machine/platform: Ubuntu desktop, Blender 5.2.4 and dual RTX 3090s.
- Task and intended result: Make male and female halfling bases, one shared class outfit and a light armor set. Show both with an existing weapon and shield in motion.
- Work branch: `codex/halfling-wardrobe-pilot` in `~/Projects/FLD-Creature-Production`.
- Base commit: `057a9906d878c55a86e1da7efc771947b2bcb962`.
- Status: Private prototype for visual review.

## Completed

Both adult bases use new references derived from the Heroes of Legend Player's Book `ancestry-halfling.png`, with Tolkien-inspired compact silhouettes, curly hair, freckled faces and hairy bare feet. Local TRELLIS.2 Q6 shape generation, CuMesh reduction and the Q5 texture pass produced the two body meshes. Each base has neutral underclothes and the same joint names, with joints fitted to its own geometry.

One shared scout-style Blade outfit pattern fits both bodies. It consists of a linen shirt, moss waistcoat, cropped breeches and a leather belt. The leather jack and bracers attach as separate pieces. The short sword and round shield reuse the owned KayKit Adventurers 2.0 models `sword_1handed.gltf` and `shield_round.gltf`. The Blender recipe generates three GLBs for each body from the same scene.

## Decisions

Use the existing sculpted creature style as the presentation target. The garment recipe fits each base surface and carries through its skin weights. Garment meshes and the sword and shield remain separate and inspectable. The exported motion includes idle, walk, sword strike, shield block, hit and fall. Body hair and the initial face and hair are part of the reconstruction. Grip motion uses the hand joints with a static finger shape.

## Verification

All six exports passed Blender reimport with zero degenerate faces, loose vertices or unweighted vertices. Both fitted scenes passed floor clearance for all six clips and quarter-frame sword-to-head clearance during the strike. The side-by-side Three.js capture uses the exact exports and records their hashes. The fully armored pair is 107,352 and 97,899 triangles. Fine shoulder and cuff transitions remain visible close up. Production topology, a finger curl pass and game avatar integration remain future work.

## Local-only state / transfer needs

The book source is in the local Heroes of Legend archive at `design/player-book/art/interior/ancestry-halfling.png`. Private concept art, reconstruction files, editable Blender scenes, fitted exports and QA reports are in `~/.local/share/four-lanterns-character-production/halfling-pilot/`. The motion review is in `~/Downloads/FLD-Halfling-Pilot-2026-11-12/`. Transfer the private assets separately.

Build either body with Blender and `scripts/toolchain/build-halfling-pilot.py -- TEXTURED_GLB OWNED_KAYKIT_GLTF_DIR OUTPUT male|female`. Render the private comparison with the local Vite preview and `scripts/toolchain/review-halfling-pilot.mjs ASSET_ROOT REVIEW_DIR`.

## Sync status

The source recipe, review script and progress checkpoint are on `codex/halfling-wardrobe-pilot`. The prototype has its own Blender and GLB deliverables.
