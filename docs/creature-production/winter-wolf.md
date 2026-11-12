# Winter Wolf — snow coat and rime breath

Pinned book24e545e6d860e8c1b03a21356fd22cae1c039785, text2bf5a99ad276946fd64a9b44d9e4da6954015906005b47e4461da5059382608a. White speaking wolf, frost on teeth, rime breath and normal bite. Portrait inspected: white sculpted ruff, blue eyes, no gear.

Owned/adapted search: approved Wolf supplies the qualified quadruped, fitted jaw and eyes; Dire Wolf's heavier chest unnecessary here. Humanoid Werewolf and Mason/KayKit costumes are inappropriate. No gear or purchase. Preserve original Wolf source. White upper coat and glacial-blue lower fur, cyan irises, black nose/lips. Existing sculpted fur gives the large-scale surface; no competing fine texture needed.

`prepare-winter-wolf.py` preserves23-bone skeleton and donor five motions, adds a dedicated inhale/open-jaw breath clip and Head-parented BreathMuzzle socket. Runtime cold attack uses that socket; melee remains jaw bite. Private source `~/.local/share/four-lanterns-modular-pilot/2026-11-11/wolf/v2/wolf-pilot.blend`; outputs `~/.local/share/four-lanterns-creature-production/winter-wolf/final/`. Donor multiview/CuMesh rights unresolved; private-local distribution only. No source assets modified.

Author review complete; bulk player art review/install/performance deferred.

Final motion review:585 frames across six clips, front/side/back, read-only reimport (118,007 triangles,19 meshes,23 bones,six materials,no maps), no loose/degenerate/unweighted vertices. Lowest point -0.0044 source units (-0.015 runtime), within tolerance. Breath socket is a non-rendering Head child; it adds no skinning cost.22 focused tests and required-assets build pass, existing chunk-size warning.

Final hash `38c716fa50f8676dacd1c6ca3fe82f07a646ab8912f4ee65dc302c28a7d03e05`. Muted bestiary and six-wolf/four-hero dungeon pass with no page/console errors, including sampled mouth-launched frost projectile and reset. Author fit83/100: anatomy4,silhouette4,signature4,gear5,materials4,distinction4. Limits: sculpted fur/simple donor gait; rime uses a traveling frost lance rather than a volumetric cone, and no separate frosted-whisker geometry.
