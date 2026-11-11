# Owned asset inventory and modular pilot — November 11, 2026

Bruce requests a minimal/no-additional-cost workflow, starting with the KayKit and Dungeon Mason purchases. Style is open to revision; no new style or production replacement is approved by this experiment. The previous generated-creature batch is not being resumed.

## Verified starting point on bmoser

| Asset | What is actually here | Remaining gap |
| --- | --- | --- |
| The Complete KayKit Collection v8 | Newly downloaded ZIP, safely extracted; 24 packs, 132 editable `.blend` sources, root CC0 license | Choose a suitable donor and test actual equipped poses |
| Dungeon Mason RPG Tiny Hero Wave Polyart | Existing private runtime `hero.glb`, catalog, tint coverage and weapon alignment | Original purchased Unity package download still pending |
| Generated meeple Smoke Slinger | Private painted source used for a bounded head-attachment experiment | Paint/anatomy/neck quality is insufficient for acceptance |

KayKit archive SHA-256: `bde0b7329aaed723c2dcb86b9f067ef3c59518ba5b92003a768bd19d91c09280`. It matches the previously documented archive; no further purchase/update is needed. Sources include Adventurers 2.0 characters/accessories, Orc Brute source and accessory files, and skeleton sources. Existing KayKit runtime characters use a separate animation library; zero embedded clips is not proof they cannot animate.

The inspected Dungeon Mason export contains 207 meshes, one 42-joint skin and 20 animation clips. Available mesh groups include 20 bodies, 20 head meshes (including variants), 14 hats, 13 hair meshes, 39 accessories, three packs, 16 one-hand weapon meshes, seven two-hand swords, 20 shields, five bows and five spears. This is the exported subset, not a verified inventory of the purchase. Source records mention 598 FBX animation files on another machine, but those files have not been verified locally. The hand rig has thumb/index chains, not a complete five-finger rig.

## Installed tools

- Unity Hub 3.22.6 installed from Unity's official Debian repository package. Official menu entry and app-specific AppArmor profile installed; sandboxing retained.
- Unity Editor 6000.3.28f1 and Unity CLI 1.0.0-beta.17 installed. No game-engine migration is implied: Unity is an import/inspection utility.
- User signed in through Hub; CLI license status confirms signed in and active. The isolated `AssetReview` URP project was created successfully without a Unity Cloud project link and launched with `-muteAudio`.
- Blender 5.2.4 LTS/Rigify already available. No new paid service or generation was used.

The official CLI can inspect/import local `.unitypackage` files but does not offer Asset Store purchase downloads. A [supported Hub deep link](https://docs.unity.com/en-us/hub/deeplinking-support) was dispatched for product 231024. User needs to select AssetReview if prompted, then Download in Package Manager. Do not claim the package is downloaded or imported until its local contents are inspected.

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

Inspect the full Dungeon Mason purchase after download. Select the best authored body, head, clothing and animation donors from that package and KayKit before further mesh surgery. Make one coherent equipped creature with clean paint, correct grips and appropriate attack, then test all five states at actual dungeon scale. Do not promise the whole bestiary or run a new batch until that gate passes.

Private sources, intermediate `.blend`/GLBs and screenshots stay outside Git. Purchased source/exports must not be distributed publicly. Exact machine paths are in the progress handoff and machine record.
