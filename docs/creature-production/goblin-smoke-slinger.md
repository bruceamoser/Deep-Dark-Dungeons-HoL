# Goblin Smoke Slinger — sequential production

Status: source-integrated after author model/motion/game review; bulk user review, delivery and performance deferred. Pinned source24e545e6d860e8c1b03a21356fd22cae1c039785, textSHAd1b67246cc0d8d06a468d139e20f7ca28690d3f62342b027e61aaede50532e14. Book: nimble goblin, sling, clay smoke pots in padded loops, soot fingers and mouth scarf. Portrait dark short hair, oxblood scarf, brown leather, hand pot and sling. Ordinary attack is a physical sling stone; smoke pots provide cover, not fire damage.

Owned search: approved goblin head; supplied Body09 fitted travel clothing, AC08 face wrap, Hair07 tied dark hair; KayKit Adventurers smokebomb (actual small flask/pot with detail), RPG Tools rope bundles, Dungeon bottles, and Space Base rock_A. Reuse brown/terracotta smoke pots and small owned rock as projectile. Rope bundles are coiled carried supplies, not a usable two-cord sling. Inspected the previous private pilot's cord/pouch construction; its unrelated generated body/rig and old grips are not reused. A small authored two-cord/leather sling is the genuine missing gear item; attach/animate on the preserved owned hand rig and verify retention/release, not a floating rigid sling. Register it for reuse. Brown/charcoal cloth, oxblood face wrap, green skin and clay pots distinguish this role from Firestarter's orange goggles/pack. No generation or purchased source edits.

Raised AC08 face-wrap fits were rejected after side views exposed floating cloth or muzzle/teeth intersections. The final design uses Body09’s supplied oxblood neck wrap lowered below the face; the redundant separate human mask was removed. This is an explicit portrait difference, preserving expression and clean geometry. No goblin anatomy was deleted to conceal a fit failure.

## Model and motion evidence

32,110 triangles,46 bones (43 preserved source bones plus three sling bones),six clips,18 materials/four texture bindings from two embedded images,19 draw calls. Private editable/export/review files: `~/.local/share/four-lanterns-creature-production/goblin-smoke-slinger/`. Source originals remain untouched; hashes are in private provenance and the approved manifest.

Front/side/back and343 captured motion frames reviewed, with exact release/recovery frames. Supplied Body09 oxblood/brown clothes and neck wrap, Hair07 tied black hair, approved goblin face, three clay smoke pots, spare cord. Both sling cords meet the hand anchor; leather pouch retains the owned grey stone. Three new prop bones author the underhand sling arc and loose-cord recovery on the original body throw clip. This is baked motion, not simulated sling physics or a full overhead windup. Runtime hides the held stone at14/30s and launches a frozen copy of its actual geometry/material.

GLB reimport has zero degenerate faces/unweighted vertices; sampled Three.js skinning is finite. Every source-frame ground check passes: supplied soles stay within.018 units, all gear stays above ground. Forward fall and bounded root contact avoid the rejected backward hair/gear penetration; loose-cord evaluation now updates before reading matrices, avoiding cumulative drift. The hit-pose arc keeps the pouch above ground rather than shrinking the sling.

Fit A5/S4/F4/G4/M4/D5 =88/100. Recognizable goblin slinger with clay smoke pots; distinct from the Firestarter’s goggles/fuel pack and Rattlechanter’s pans/bells. Mouth scarf is lowered, pot loops are simplified, clothing is clean, and the animation is a compact underhand release. User bulk review remains pending. Smoke-cover rules and physical stone damage are unchanged.

Actual development-game bestiary five-state controls, six Slinger/four-hero appearance and45-frame shot capture pass with no JavaScript errors. At release, the held stone disappears and the same shaped stone flies from the pouch; recovery restores it. Dungeon scale keeps the face, pots and sling readable. No installer update or FPS claim.

## November 12 image rebuild

A new frontal A-pose reference produced the body, oxblood scarf, fitted travel clothes, dark tied hair, terracotta pots and spare coil. TRELLIS Q6_K produced 1,631,287 source triangles, CuMesh reduced them to 69,045, and the texture pass retained the olive skin and warm clay. The final rigged export has 69,863 triangles across the reconstructed body, two cords, the leather pouch and the owned stone. The original hand-sling recipe now accepts a grip in the new hand's rest space. The compact underhand release is baked into frame 13 (0.50 seconds) of the ranged clip. The melee fallback is a left-hand punch.

All six clips pass the floor check and GLB round-trip shows zero degenerate faces, loose vertices or unweighted vertices. Reviewed 591 sampled motion frames with the actual new model, including the release pose. The sling remains on the throwing hand and the pouch swings with it. The private recipe inputs, textured reconstruction and final rig are in `~/.local/share/four-lanterns-creature-production/goblin-smoke-slinger/image-rebuild/`.

The muted development bestiary and six-Slinger/four-hero dungeon fixture passed with zero JavaScript errors. The released stone is the held mesh at its sampled pose, and the load returns at 0.95 seconds. This export is source-integrated for the next local delivery.
