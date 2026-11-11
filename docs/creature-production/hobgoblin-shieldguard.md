# Hobgoblin Shieldguard — sequential production

Status: source-integrated after author model/motion/runtime review; bulk user review and installation deferred.

Pinned source `24e545e6d860e8c1b03a21356fd22cae1c039785`, text SHA `9159ea327c4df676d1c9c53c62495c1fa9140f945b9f35072995d592932ba209`. Disciplined hobgoblin with a rectangular shield painted with former squadmates' names, ranked spear and protective stance. Illustration: rust skin, pointed ears, dark tied hair, steel/bronze armor, crimson tabard and tall memorial shield.

Owned search: inspected all supplied shields and five spears, original body/face inventory and adapted library. Shield07 has the required rectangular face and finished rim; Shield08's kite shape and round shields rejected. Spear03 has a pointed practical blade; ornamental Spear01/04/05 rejected. Body13 plate and original SwordAndShield Attack03 thrust reuse the reviewed Soldier rig. Reuse Outrider's guarded human-ear removal/lateral pointed-ear fit with rust skin, stern Mouth02 and Hair07. No helmet needed by this reference; reserve an officer helmet for Marshal.

Creative support detail: KayKit Dungeon hanging keyring reduced to belt scale on pelvis (gate/patrol role). Avoid pack/cloak clutter behind the large shield. Crimson livery, warm brass rim, steel plate, dark leather/hair and rust-red skin establish the faction. The owned shield lacks names: add small baked painted-letter forms projected onto the existing face, preserving its source geometry and socket; names are decorative adaptation, not new lore mechanics. Source originals untouched; derivatives remain private. Check shield/ear/face clearance, spear thrust/grip and keys through all five states.

## Model and motion review

8,205 triangles, 43 bones, five original source clips, 16 materials, two textures and 18 Three.js draw calls. Reimport has zero degenerate faces/unweighted vertices; finite skinning checks pass. Front/side/back and 242-frame motion reviewed, including thrust contact at frame9, fixed spear/shield grips, keyring clearance, walk and full fall. Initial planar names clipped into curved shield; rejected and fixed by projecting each letter vertex onto the owned surface. Final eight names avoid the three raised ornaments and travel with the same shield mesh/bone.

Author fit A4/S4/F4/G5/M4/D5 = 85/100. Rust skin, pointed ears, tied hair, tall named shield and spear distinguish it from Soldier and orcs. Clean chibi proportions, broad blade and friendly/simple mouth differ from the grim illustration. Shield lettering is readable in close preview, small markings at dungeon zoom; decorative names do not alter rules. No claim of independent/user approval or benchmark.

## Runtime correction

First game-view attempt correctly failed: an older same-name model path overwrote the equipped manifest entry, loading the old GLB without embedded clips. Moved reviewed equipped paths after legacy paths; regression test checks both replacement and absent-private-asset fallback. Repeat actual bestiary five-state and six-creature/four-hero dungeon visual check passed, with correct new clips and no JS errors. Inspected game-scale tower shield, color and spear visibility.
