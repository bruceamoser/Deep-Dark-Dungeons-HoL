# Cave Bat — broad ears and leather wings

Book24e545e6d860e8c1b03a21356fd22cae1c039785, text77b00be66aaee92e8897313220bed2abcb94c7583d2a57c68a8936ee6ac3aec7. Small cave bat with oversized ears, thin dark wings and hooked feet. Portrait inspected: tawny fur/ears, dark green membranes, pale chest, no gear.

Owned search: public bat fallback (earlier audit had visibility problems), original multiview bat and corrected clean-sheet bat, owned costumes/props. Select the clean-sheet bat's complete wing anatomy and existing fitted22-bone rig; no clothing, weapon or random props. Keep its expressive face, fur and oversized ears. TextureCraft Leather grain on existing green membrane regions; tawny body/pale chest and natural dark eyes preserved. No new generation or purchase.

`prepare-cave-bat.py` separates membrane materials using the existing atlas, retains source weights/wing form, lifts live flight clips and lands death at floor. `texture-cave-bat.py` adds coordinated green leather color/height/roughness. Source `~/.local/share/four-lanterns-pipeline-pilot/2026-11-10/meeple-roster-2026-11-11/cave-bat-clean-sheet/animated-candidate.blend`; output `~/.local/share/four-lanterns-creature-production/cave-bat/`. Source preserved; multiview/CuMesh provenance private-local, redistribution unresolved.

Author model/motion/game review complete. Bulk user review, installation and performance deferred.

405 rendered frames and front/side/back reviewed.114,130 triangles,one mesh/two primitives,22 bones,five clips; original2048 atlas plus three512 membrane maps. Reimport no loose/unweighted/zero-area geometry. Live clips minimum0.1128source units above ground; death lands at0.001. Actual five-state bestiary/six-bat dungeon pass with zero errors.22 focused tests and production build pass (existing chunk warning). Final hash `44a9e161af45ad6b5736943479325949c8a73c0b7d456fd43a8896875d7bad80`.

Author fit83/100: anatomy4,silhouette5,signature4,gear5,materials4,distinction3. Remaining: wing panels flap mostly at the shoulder rather than fully articulated fingers; atlas-to-membrane borders show small coarse patches at inspection scale. Small body/oversized ears remain readable at dungeon scale.
