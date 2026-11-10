# November 10 — Goblin facial contrast and staged art direction

Branch `codex/goblin-face-contrast`, base `c9752afb0ace0af32238df8547759440bde1fd88`. Bruce accepted the four pilot models but found the goblin face too monotone and explicitly requested simple recoloring of eyes/mouth/etc. He also endorsed decent recognizable roster coverage first, with later high-capability refinement.

Added a targeted vertex-palette pass on cloned existing Orc Raider goblin heads: eye whites/pupils, brows, mouth, tusks and bronze jewelry. No new facial geometry, GLB, textures, rig, weights or gameplay changes. Other Orc Raider goblin variants share the correction; boss/Orc Brute and non-goblin casts are unchanged. Textured heads bypass this pass. Owned geometry/material disposal stays on the existing instance path.

Close-up/reference captures inspected; local directory build refreshed; muted exact-launcher pilot pose/skin/save/sandbox regression passes in `/tmp/fld-goblin-face-native.log`. Model-only preview updated in `art/exports/creatures/`; full comparison remains ignored under `test-results/goblin-face`. No new cosmetic-only unit tests; repository CI still exercises the source build/rules. No public release or system-package replacement.

First preview was too dark around the eyes; adjusted the original palette/position regions to retain eye whites without adding overlays. Existing blend/source GLBs and recorded hashes are unchanged. Do not confuse a new colour attribute with new vertices.

Next: continue recognizable models for failed casts, then refine anatomy/materials/detail with stronger guidance and actual visual/animation acceptance. This is the recorded direction, not a guarantee that model tier alone produces high-end art. Preserve original editable sources and Bruce's quiet local-testing preference. Verify PR/remote merge state before treating this checkpoint as synced.
