# Shield Soldier — sequential production

Status: source-integrated; revised helmet explicitly approved by Bruce (“that’s perfect”). Performance deferred.

Pinned source commit `24e545e6d860e8c1b03a21356fd22cae1c039785`, source-text SHA `9514d25b5ef446aa5fe02d2ec48da8ec0a0d7d9996dec0141a649311a469f534`. Book text and illustration inspected: professional guard, serviceable armor, scarred broad shield and ordinary sidearm; green cloth and plain metal helmet. Attack is “Measured thrust”. Avoid horns, magic glow and oversized fantasy ornaments.

Choose owned Body13 for plate shoulders/greaves, straight OHS03 sword, Shield08 broad kite shape, and a new plain fitted helmet. Steel/green/leather palette distinguishes it from the lighter Bandit. Original SwordAndShield motion must be inspected to identify a true thrust; names alone do not prove attack shape. Original rig/UVs/weights preserved. Owned source remains private.

## Final reviewed result

The shallow authored helmet was rejected by Bruce. Removed that code and selected the supplied **Hat02**. Inspected its disconnected geometry; removed only the two isolated horns (194 vertices total), preserving the fitted shell, crest, rim, nose/cheek guards and UVs. Recolored the owned copy to steel. Bruce explicitly approved this revised helmet. Original source remains untouched. A HeadArmor01 trial was also rejected during author review due to overlapping head geometry; it is not the final export.

Final export: **5,544 triangles, 43 bones, five source clips**, one embedded texture. Zero degenerate faces and unweighted vertices after reimport. Exact source geometry/texture/clip hashes, modification report and rest-rig checks are in private provenance. Corrected shield to face forward and calibrated the source Attack03 thrust through a constant socket rotation (forward alignment 1.0 at frame 9). Runtime contact is 8/30 seconds. Full five-state render, finite deformation, front/side/back and actual game bestiary/dungeon checks passed with zero JavaScript errors. No FPS benchmark.

Author fit: A5/S4/F4/G5/M4/D5 = **91/100**. Correct armored guard, now with proper fitted helmet silhouette. Remaining differences: clean chibi style, simplified crossed shield bands instead of tree heraldry/scarring and broad blade. No claim of realistic wear or facial animation.

Private evidence: `~/.local/share/four-lanterns-creature-production/shield-soldier/` contains editable Blender/GLB, provenance, roundtrip, validation, 242-frame motion review, turnarounds, and game-view/results. The approved manifest pins final bytes; installed delivery follows at the checkpoint.
