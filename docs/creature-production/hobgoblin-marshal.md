# Hobgoblin Marshal — sequential production

Status: source-integrated after author model/motion/runtime review; installed delivery and user art review deferred.

Pinned source `24e545e6d860e8c1b03a21356fd22cae1c039785`, text SHA `34b25a4e1fe972635f12bdd372b4b94297cb5531ed37d6a264c1c31b4ff5f90c`. Field officer with an undecorated helm, map board scored with revised plans, command saber. Illustration: rust hobgoblin, plain fitted helmet, green cloak/tabard, layered metal armor and map board.

Owned search: inspected supplied hats/HeadArmor, five spears/shield inventory from prior guard, KayKit map/rolled map/journal and board candidates. Reuse Soldier's hornless Hat02 (guarded removal of two disconnected horns) rather than inventing a flat cap. Body18 layered armor and Cloak02 distinguish officer silhouette. Reuse Shieldguard rust face/lateral ears, OHS08 curved saber from Outrider/Bandit. Heavy sealed HeadArmor rejected because it hides the hobgoblin face; no shield required by profile.

Creative map board: KayKit RPG Tools map has curled parchment and actual map texture. Adapt Restaurant cuttingboard's finished wooden rectangle into a backing at hand scale, rotated upright; Board Game board_A is needlessly square/oversized, journal too book-like. Both parts rigidly share weapon_l and one fitted rotation; no shield gameplay flag. Green/steel/bronze officer kit, rust skin and dark leather, warmer natural map colors. Preserve original source meshes/UV/rig/animations. SwordAndShield source stance supports carried map and saber slash; inspect hand/map/helm/ears/cloak through all five states. No new geometry needed.

## Reviewed model and motion

6,497 triangles, 43 bones, five embedded source clips, 13 materials/four textures and 17 Three.js draw calls. GLB reimport: zero degenerate faces or unweighted vertices. Front/side/back, 242-frame motion, complete saber slash and full death inspected; finite Three.js checks pass. Map parchment and wooden backing share the fitted left socket; blade remains gripped. No gameplay shield added.

Initial helm skirt intersected the ears. Raised/compressed the fitted copy and added paired open-bottom notches below its rim, preserving crown, brow/cheek guards and original horn removal. First cuts through the entire dome damaged shading; restricted cuts to the lower skirt and retained original crown topology. Lower skirt uses deliberate flat panels, with minor faceting visible close up. These are intentional openings, not automatic non-manifold repair.

Author fit A4/S4/F5/G5/M4/D5 = 89/100. Clear helmet/map/saber officer identity, green cloak and rust hobgoblin head. Clean, bright plate and broad chibi face rather than worn layered mail; map carried in a guarded left-arm stance rather than pointing, no gesture-specific command clip. Small paper details are close-view features. Bulk user review remains pending.

Actual development bestiary five-state controls and six Marshals beside four heroes passed, correct pinned model/clips and no JS errors. Inspected map/helm/saber at game scale. Nine focused production/equipped tests pass; no new performance/package claim.
