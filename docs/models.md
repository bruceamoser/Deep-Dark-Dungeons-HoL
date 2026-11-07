# Models: decisions, storage and plan

Status as of November 7, 2026. Branch `codex/kaykit-complete-integration`,
204 tests passing.

## The decision

**Style: KayKit, stylized and characterful, not realistic.**

This was settled by comparison rather than by argument, and two of my earlier
recommendations were wrong and were overturned by testing:

1. I first proposed moving to realistic Quaternius base characters on the strength of a
   studio render. Dropped into the running dungeon at true isometric distance they read
   *worse* than the current heroes: the silhouette goes thin and 14,000 triangles of
   anatomy are invisible at the roughly two-tile size a hero occupies.
2. You then preferred the bare KayKit renders over a Synty Sidekick comparison, which
   confirmed the direction is chunky and readable rather than anatomically correct.

The reference look is painted and characterful within a stylised silhouette, in the
spirit of these two references:

- Sloyd "Adventurer Boy" (VoxelVidal, CC BY 4.0) — chunky proportions with painted hair,
  cloth and soft shading.
- Synty Sidekick key art — faceted low-poly with strong shape language.

What that means in practice: **silhouette mass and per-part readability matter more than
polygon count or anatomical accuracy.** Detail has to survive being two tiles tall.

## What we own

**The Complete KayKit Collection v8**, purchased November 7, 2026.

- Creator: Kay Lousberg, https://www.kaylousberg.com
- Source: https://kaylousberg.itch.io/kaykit-complete
- Licence: **CC0 1.0** — free for personal, educational and commercial use, and CC0
  applies even to the SOURCE tier. Credit is requested but not required.
- Archive: `The Complete KayKit Collection v8.zip`, 624 MB,
  SHA-256 `bde0b7329aaed723c2dcb86b9f067ef3c59518ba5b92003a768bd19d91c09280`
- 24 packs, 29,709 archive entries.

Purchased because the free tiers are samples: the free Base Characters pack ships two
bodies, the free Outfits pack ships two outfits, and the free Bestiary ships two
monsters. The collection covers all of it plus every future release.

## Where models are stored

All runtime art lives under `public/assets/`. Every path below is served at `/assets/...`.

| Path | Contents | Size | Status |
| --- | --- | --- | --- |
| `public/assets/characters/adventurersv2/` | Adventurers 2.0 heroes: Knight, Barbarian, Barbarian_Large, Druid, Engineer, Mage, Ranger, Rogue, Rogue_Hooded | 9 glb | **In use** for player heroes |
| `public/assets/characters/series4/` | Paladin, Paladin_with_Helmet, Ninja, Survivalist, OrcRaider, Monster, MonsterCostume, Werewolf_Man, Werewolf_Wolf, Animatronic_Normal, Animatronic_Creepy, Clown, ActionFigure, Driver, SpaceRanger, Robot_One, Robot_Two, SpaceRanger_FlightMode | 18 glb | **In use** for enemies |
| `public/assets/characters/series5/` | BlackKnight, Tiefling, Vampire, Witch, Caveman, FrostGolem, Clanker, CombatMech, Hiker, Protagonist_A, Protagonist_B, Helper_A, Helper_B, Superhero | 14 glb | **In use** for enemies |
| `public/assets/characters/series6/` | Cleric, Lorekeeper, Marksman, AvianSwordsman, MagicalGirl, Farmer_A, Farmer_B, Hoarder, ToySoldier, OrcBrute, Monstrosity, PlantWarrior, 4GTN, 4GTN_Forgotten | 14 glb | **In use** for enemies |
| `public/assets/characters/skeletons/` | Skeleton_Warrior, Skeleton_Rogue, Skeleton_Mage, Skeleton_Minion, Skeleton_Golem, Necromancer | 6 glb | **In use** for undead |
| `public/assets/animations/` | Eight shared rig libraries: General, MovementBasic, MovementAdvanced, CombatMelee, CombatRanged, Tools, Simulation, Special | 8 glb, 132 clips | **In use** |
| `public/assets/creatures/` | Quaternius animals and constructs: Bat, Wolf, Ghost, Demon, Ooze, Goleling (plus the older Orc, Orc_Skull, Yeti, GreenBlob) | 9 glb | **In use** for quadrupeds and drops |
| `public/assets/dungeon/` | Dungeon Remastered 1.0 — 203 props | 9.1 MB | In use, **queued for replacement** |
| `public/assets/adventurer/` | Old Adventurers 1.0 characters and weapons | 19 MB | Weapons still used; characters superseded |
| `public/assets/skeleton/` | Old Skeletons 1.0 | 19 MB | Superseded |

Total character and animation payload added by this work: 34 MB.

The raw KayKit archive is **not** committed. It stays at
`~/Downloads/The Complete KayKit Collection v8.zip`; only the extracted models the game
loads are in the repository.

### Not yet extracted from the collection

These sit in the archive and are not in the tree:

| Pack | Models | Planned use |
| --- | --- | --- |
| Dungeon Pack 1.1 | 283 glTF | Replace Dungeon Remastered 1.0 — verified drop-in, all 12 currently-used prop names exist |
| Fantasy Weapons Bits 1.0 | 48 glTF | Visible equipped weapons |
| RPG Tools Bits 1.0 | 69 glTF | Visible carried gear |
| Resource Bits 1.0 | 132 glTF | Materials and loot |
| Halloween Bits 1.0 | 102 glTF | Monsters and seasonal props |
| Furniture Bits 1.0 | 74 glTF | Interiors |
| Forest Nature Pack 1.0 | 1588 glTF | Surface scenes |
| Medieval Hexagon Pack 1.0.1 | 404 glTF | Hex terrain |
| Platformer, Block, Board Game, City Builder, Prototype, Restaurant, Space Base, Holiday, Mixed Bag 1 and 2 | — | Optional |

## How models are loaded

```
GLTFLoader
  ├─ Scene.load()                     loads the roster asset map
  └─ loadAnimationLibrary(loader)     merges the 8 rig libraries into one clip map
        ↓
equipmentAppearance(assets, hero, enemy)
  ├─ player hero or KayKit humanoid enemy  →  humanoid path (armour swap, handslots)
  └─ Quaternius animal or construct        →  creatureAppearance (procedural)
        ↓
dressIdentity()  →  ancestry scale + cloth tint  (+ optional generated face)
dressOutfit()    →  accessories and class layer
dressCreature()  →  theme colours, features, rank escalation
        ↓
{ model, clips }   clips come from animation-library under game-facing names
```

### The rig

All KayKit characters share a **23-bone rig**: `root, hips, spine, chest, upperarml,
lowerarml, wristl, handl, handslotl` (and `.r` equivalents), `head, upperlegl, lowerlegl,
footl, toesl` (and `.r`). Bone lookup normalises `.`, `_` and `-` so the older 1.x naming
(`upperarm.l`) and the 2.0 naming (`upperarml`) both resolve.

### Animations

The 2.0 and Series characters ship with **no embedded clips**. `src/view/animation-library.mjs`
merges the eight rig libraries once and re-exports thirteen clips under the names the game
already asks for:

`Idle`, `Walking_A`, `Running_A`, `Death_A_Pose`, `Hit_A`, `1H_Melee_Attack_Slice_Diagonal`,
`2H_Ranged_Shoot`, `Spellcast_Shoot`, `Unarmed_Melee_Attack_Punch_A`, `Block`, `PickUp`,
`Throw`, `Taunt`.

Skeleton-rigged enemies prefer the skeleton idle, walk and death clips where the library
has them, falling back to the human set otherwise.

### The enemy roster

`src/core/creature-roster.mjs` casts 58 enemy types onto **28 distinct models**, up from
nine. `HUMANOID_MODELS` decides which take the character path and which go to the
procedural creature path. Every roster row resolves to a file on disk; two tests enforce
both the mapping and the files' existence.

## Open problems

1. **Character sheet reads wrong.** `dressIdentity` was written for the 1.0 rig: it hid
   the model's own `_Head` mesh and built a sphere face with eyes and brows. Over the new
   models this produced the "goggles" look you spotted. The generated face is now
   off by default, so the packs' own heads show. **Still needs a visual pass** — the head
   now reads bare on some models because the helmet/face layering has not been re-checked
   against the 2.0 sculpt.
2. **The dungeon is too dark for character detail.** A camera-facing fill was tried and
   did not help; a layer-scoped light does not work in Three.js because lights outside the
   camera's layers are culled before the lighting pass. Needs a real lighting decision,
   not a tweak.
3. **Culture-based clothing is not wired to the new packs.** `src/core/wardrobe.mjs`
   describes 18 cultures, 32 backgrounds and 10 classes, and the generated garment shells
   are now opt-in because they hid the packs' own clothing. Accessories and the class
   layer still draw. The real fix is to map cultures onto the packs' actual parts.
4. **Equipped gear is placeholder geometry.** `dressEquipped` draws helmets, belts and
   boots from primitives. Fantasy Weapons Bits and RPG Tools Bits should replace it.
5. **Only the Adventurers 2.0 subfolder is reachable from the hero path.** The Series
   models are used for enemies; using them for players needs a model-choice step in
   character creation.
6. **Ancient asset folders remain.** `public/assets/adventurer/` and `skeleton/` are
   superseded for characters (weapons still come from `adventurer/`). Removing them would
   save 38 MB once the weapon dependency is repointed.

## Plan

Ordered by value per unit of risk.

1. **Fix the hero look.** Re-check the 2.0 head, helmet and hair layering with the
   generated face off. Confirm against the pack's own reference render. This is the
   outstanding complaint and blocks everything else being judged.
2. **Settle dungeon lighting** so character detail reads at gameplay distance. Treat as a
   design decision with your input, not an implementation detail.
3. **Swap in the Dungeon Pack 1.1.** Verified drop-in: all 12 prop names already used
   exist. Gains 80 new props.
4. **Wire culture, background and class to real parts.** Replace the procedural garment
   shells with mapping onto the packs' modular pieces where they exist.
5. **Visible equipped gear** from Fantasy Weapons Bits and RPG Tools Bits.
6. **Expand the player roster** to the Series heroes so character creation can offer
   Cleric, Paladin, Black Knight, Tiefling, Vampire, Witch, Druid, Ranger and Engineer.
7. **Remove the superseded 1.0 character folders** and repoint weapons.

## Provenance rules

From `AGENTS.md`:

- Every third-party asset must have its source and licence recorded — `docs/assets.md` is
  the register, and the Complete KayKit entry is there.
- Do not commit the downloaded archive, engine caches or editor binaries; only the
  extracted models the game loads.
- Keep source-book and Foundry repositories untouched.

The CC0 grant covers KayKit. The Sloyd reference image is CC BY 4.0 and is used here only
as a visual reference, not as a shipped asset; if any Sloyd model is ever imported it needs
the attribution line `"Adventurer Boy" by VoxelVidal, generated with Sloyd, licensed under
CC BY 4.0.`
