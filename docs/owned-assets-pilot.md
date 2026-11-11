# Owned asset inventory and modular pilot — November 11, 2026

Bruce requests a minimal/no-additional-cost workflow, starting with the KayKit and Dungeon Mason purchases. Style is open to revision; no new style or production replacement is approved by this experiment. The previous generated-creature batch is not being resumed.

## Verified starting point on bmoser

| Asset | What is actually here | Remaining gap |
| --- | --- | --- |
| The Complete KayKit Collection v8 | Newly downloaded ZIP, safely extracted; 24 packs, 132 editable `.blend` sources, root CC0 license | Choose a suitable donor and test actual equipped poses |
| Dungeon Mason RPG Tiny Hero Wave Polyart | Full package downloaded/imported; all 1,024 files verified against archive, plus existing runtime export | Select and qualify additional animations; no new creature family found |
| Generated meeple Smoke Slinger | Private painted source used for a bounded head-attachment experiment | Paint/anatomy/neck quality is insufficient for acceptance |

KayKit archive SHA-256: `bde0b7329aaed723c2dcb86b9f067ef3c59518ba5b92003a768bd19d91c09280`. It matches the previously documented archive; no further purchase/update is needed. Sources include Adventurers 2.0 characters/accessories, Orc Brute source and accessory files, and skeleton sources. Existing KayKit runtime characters use a separate animation library; zero embedded clips is not proof they cannot animate.

The inspected Dungeon Mason export contains 207 meshes, one 42-joint skin and 20 animation clips. Available mesh groups include 20 bodies, 20 head meshes (including variants and head armor), 14 hats, 13 hair meshes, 39 accessories, three packs, 16 one-hand weapon meshes, seven two-hand swords, 20 shields, five bows and five spears. The hand rig has thumb/index chains, not a complete five-finger rig. The full purchase is now verified below.

## Full Dungeon Mason source verified after import

The user imported into `~/Setup Guide In-Editor Tutorial`, not AssetReview. All 1,024 nonempty asset files match the cached package byte-for-byte. An untouched private extraction is available under the workshop's `PurchasedSource/DungeonMason/Assets/RPGTinyHeroWavePolyart` directory. SHA-256 `5d12db3fd09358a7bdd0eca8306d83688697b6e6ec6b6b7710221271fa8d2d68` matches the original purchased archive recorded in this repo.

The package inventory has 1,072 entries including folders: 777 FBX files, 197 prefabs, eight scenes, 24 animation controllers, and two optional rendering ZIPs. The 777 FBXs divide into 598 animation files and 179 geometry files. The animation files include in-place/root-motion variants and separate bow/arrow motion, so **598 does not mean 598 distinct character moves**. Eight families: bow, dual swords, wand, unarmed, single sword, spear, sword/shield, two-hand sword.

Geometry files include the combined 20 bodies/three cloaks, demo stage, 115 head/accessory parts, 57 weapon files and five projectile files. All 115 head-part filenames are already represented in the runtime catalog. All standalone weapon files are represented too; the bow/arrow skinned containers are already converted by the existing exporter. URP.zip (464 entries) and HDRP.zip (460 entries) have no FBX/OBJ/Blend models. They are rendering variants, not hidden creature packs. The 24 assembled character prefabs are useful outfit examples, not 24 additional body meshes.

The biggest unused opportunity is the animation library. Additional creature anatomy still requires adaptation or suitable creature donors, including KayKit. Current source body meshes range from 1,874 to 3,920 triangles before GLB UV/material splitting. The source skeleton contains 43 bones including the root; this is distinct from the exported skin's joint count.

## Authored spear source test

Bruce accepted the donor test as a test and corrected the basic attack: a spear must stab. The pilot now uses `Attack02_Spear.fbx` with one constant bind-space grip rotation, calibrated at extension frame 9. Merely switching clips was insufficient: the separate spear FBX had been attached upright while the hand thrust forward. The correction rotates the whole weapon about its existing socket; no per-frame weapon sliding or source-asset edits. Evaluated spear geometry advances 0.681 world units from draw-back frame 5 to extension frame 9 with forward-axis alignment 0.99996. Builder assertions guard both properties. The final Three.js five-state/120-frame render passes; inspected attack samples show point-first extension and recovery. New private preview: `../spear-thrust/spear-thrust-review.mp4` relative to the source-review evidence directory. This changes the isolated pilot only, not installed gameplay. Dungeon-scale grip/ground checks remain pending.

`scripts/toolchain/prepare-mason-spear-pilot.py` assembles Body08 with original human head/face/hair, Spear02 and five authored spear clips. This isolates rig/equipment reuse from the rejected generated-head experiment; it is not advertised as a new goblin. The source bone names, hierarchy and rest matrices match across idle, walk, attack, hit and death (maximum matrix delta approximately 7e-18).

Export: 5,354 triangles, seven rendered meshes/draw calls, one material/embedded texture, approximately 1.43 MB. The existing silent Three.js asset reviewer passed finite animated geometry, distinct poses, visible pixels and animation-binding checks. Front/side/back/three-quarter and five-state captures were inspected, followed by 120 motion samples. A private silent video shows the poses slowed for review. Death reaches a fallen pose; the weapon remains attached to the hand. Ground/weapon clearance and full grip quality are not accepted yet. No native encounter FPS was measured and no production model was replaced.

Reproduce the source test with private inputs:

```sh
blender --background --factory-startup -noaudio --python-exit-code 1 --python scripts/toolchain/prepare-mason-spear-pilot.py -- /private/RPGTinyHeroWavePolyart /private/source-review
AUDIT_URL=http://127.0.0.1:5197 node scripts/toolchain/review_asset_submission.mjs /private/source-review/source-spear.glb /private/source-review/render 0.85 embedded
```

## Installed tools

- Unity Hub 3.22.6 installed from Unity's official Debian repository package. Official menu entry and app-specific AppArmor profile installed; sandboxing retained.
- Unity Editor 6000.3.28f1 and Unity CLI 1.0.0-beta.17 installed. No game-engine migration is implied: Unity is an import/inspection utility.
- User signed in through Hub; CLI license status confirms signed in and active. The isolated `AssetReview` URP project was created successfully without a Unity Cloud project link and launched with `-muteAudio`.
- Blender 5.2.4 LTS/Rigify already available. No new paid service or generation was used.

The original built-in CLI inspection did not expose an Asset Store download command, so a [supported Hub deep link](https://docs.unity.com/en-us/hub/deeplinking-support) was used for product 231024. The user has now completed download/import; verification is above. CLI 1.0.0-beta.17 is current on its channel. The local Pipeline 1.0.0-pre.1 package was added only to AssetReview; its Editor has not loaded the connection yet. No live Editor automation or tutorial-project edits are claimed. Archive/FBX inspection and Blender/Three.js testing do not depend on that connection.

## Modular goblin experiment

`scripts/toolchain/prepare-modular-goblin-head.py` cuts a head copy from the specific painted meeple Slinger source at Blender Z=0.302, preserves UVs, and exports an intentionally open neck boundary. It is source-specific, not an anatomy detector. The original source is untouched. The resulting head has 43,493 triangles and no facial rig.

`scripts/toolchain/modular-owned-pilot.mjs` uses the actual game's Mason appearance factory, licensed body/gear and clips, then attaches the copied head to the existing head bone in rest space. It shows the human baseline and sword/shield, two-handed gear, and bow variants. A silent software-rendered Three.js fixture produced 120 frames across idle, walk, attack, hit and death with no browser errors. Head attachment follows the rig in inspected poses.

**Visual acceptance failed.** Idle/attack/hit inspection shows a conspicuous cut/painted red neck edge, noisy facial paint, oversized head/weapon clearance issues, and an unsuitable generic two-handed attack. Requested spear selection does not establish a correct spear model/pose. This is assembly evidence only, not a high-end art result. No creature was promoted, no fit score increased, and no release or installed game was changed. Native dungeon performance, full turnarounds, all-frame deformation/grips, final export/reimport and final material quality remain untested. The head triangle count is not an approved production budget.

Reproduce with private sources in place and the local Vite fixture available:

```sh
blender --background --factory-startup --python scripts/toolchain/prepare-modular-goblin-head.py -- /absolute/path/to/painted-refined.glb /absolute/private/output
FLD_PILOT_OUTPUT=/absolute/private/output FLD_PILOT_URL=http://127.0.0.1:5197 node scripts/toolchain/modular-owned-pilot.mjs
```

## Next gate

Inventory is complete and source rig reuse is demonstrated. Select the best authored body, head, clothing and animation donors from Dungeon Mason and KayKit before further mesh surgery. Make one coherent equipped creature with clean paint, correct grips and appropriate attack, then test all five states at actual dungeon scale. Do not promise the whole bestiary or run a new batch until that gate passes.

Private sources, intermediate `.blend`/GLBs and screenshots stay outside Git. Purchased source/exports must not be distributed publicly. Exact machine paths are in the progress handoff and machine record.
