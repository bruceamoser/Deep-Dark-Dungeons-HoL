# Models: decisions, storage and plan

Status as of November 7, 2026. GitHub #21 tracks the current art overhaul.
The hero foundation (#22), readable lighting (#28) and navigable Greyhaven (#29)
are merged. See the continuation sections and `docs/kaykit-world-art.md` for the
current decisions and full collection audit.

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
| `public/assets/world/` | Curated Dungeon 1.1, Halloween crypt props, RPG Tools and Resource Bits | 1.2 MB | In use: architecture, room dressing and caches |
| `public/assets/town/` | Medieval Hexagon buildings, nature, street landmarks | 1 MB | In use: navigable Greyhaven |
| `public/assets/dungeon/` | Legacy Dungeon Remastered 1.0 | Removed | Superseded after runtime references migrated |
| `public/assets/adventurer/` | Old Adventurers 1.0 characters and weapons | 19 MB | Weapons still used; characters superseded |
| `public/assets/skeleton/` | Old Skeletons 1.0 | 19 MB | Superseded |

Total character and animation payload added by this work: 34 MB.

The raw KayKit archive is **not** committed. It stays at
`~/Downloads/The Complete KayKit Collection v8.zip`; only the extracted models the game
loads are in the repository.

### Available for further curated imports

The archive contains much more than the small runtime subsets selected so far:

| Pack | Models in archive | Further use |
| --- | --- | --- |
| Dungeon Pack 1.1 | 283 glTF | More architecture, floor variants and tavern furniture; selected Dungeon 1.1 models already in use |
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

## Appearance status

The shared appearance editor offers 15 real authored fantasy model choices and
three builds. Original texture colors and heads are preserved; unsupported face,
hair and color controls have been removed while their legacy save fields survive.
Culture-specific costume recoloring remains a possible future addition. Held gear
uses curated KayKit models, worn helmets use rigged Knight parts, and authored
belts/boots replace overlapping primitive overlays. Enchantment runes still show
active and dormant magic. Modern/sci-fi imports and superseded 1.x folders were
removed. See `src/core/hero-avatars.mjs` and `public/assets/gear/manifest.json` for
the current runtime catalogs; earlier inventory tables document the initial import.

## Plan

Ordered by value per unit of risk.

1. **Hero foundation complete (#22).** Authored head/hat/clothing layering and
   armor donors checked with actual models and the full native suite.
2. **Readable lighting complete (#28).** Bruce selected the atmospheric direction;
   actor fill preserves the floor lighting and core visibility boundaries.
3. **Dungeon assets and room dressing (#23).** A curated Dungeon 1.1 subset replaces
   legacy runtime art; crypt/archive/shrine/storeroom props occupy existing blocked
   cells. Authored half-walls replace primitive cutaways, and lost caches use crates.
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

## Continuation: cohesive art overhaul (November 7, 2026)

Bruce expanded the direction to a clean, consistent visual overhaul of the entire
 game using the purchased KayKit collection. GitHub #21 tracks the whole effort;
#20 is the first implementation issue. Follow issue → branch → PR → author review
and applicable checks → merge → next issue. Local source is at
`/home/bruce/Projects/Deep-Dark-Dungeons-HoL`; the installed game is v0.6.0 and is
separate from development builds. The connected personal GitHub account works;
the old `/home/bmoser` helper paths in AGENTS.md belong to another machine.

The first continuation corrects unarmored heroes being replaced by Mage body
parts, restores authored hats/helmets/visors, resolves RogueHooded donor mesh
names, and stops generated culture/class accessories covering finished sculpts.
Worn armor still swaps real skinned parts. Generated faces remain opt-in.
Animals and procedural creatures retain their own animation clips rather than
receiving incompatible KayKit humanoid tracks; skeleton humanoids now request
the skeleton shared clips. Original collection license text is included beside
the imported characters and animations.

`node scripts/kaykit-appearance-check.mjs` compares the six loaded hero models
against their pack originals under the same lighting, checks all three armor
swaps using real loaded assets, and captures the actual character sheet. Run
against the Vite server on port 5198. Screenshots are in ignored `test-results/`.
The comparison still exposes the broad palette recoloring and ancestry scaling;
this is a foundation repair, not acceptance of final character customization.
Hair/face options currently do not change the authored head sculpt and need real
part/model choices in the later wardrobe/creator issue.

### Greyhaven travel (#26)

The town now uses a dedicated KayKit diorama and presentation-only street graph.
Building selection and R/M/T/W/P/V/H/D hotkeys send the visible four-hero party
to the corresponding entrance; arrival opens the existing service. Requests for
training/respec and town wound care from character screens also travel before
continuing. Escape cancels a trip, choosing another destination redirects, and
modal/run-library screens pause walking. Floor/run loads clear pending travel.
Town positions are deliberately not written into a suspended dungeon's hero
coordinates. The town asset manifest records the curated runtime subset.

### Posed Dungeon Mason grips (#80)

Sword, hammer and shield presentation is fitted against the actual ready clip,
including the distinct unarmed shield pose. Swords point upper-left from the
grip, hammer heads roll 180 degrees about their shaft, and shield faces stay
upright toward the front camera. The renderer clones only the selected prop's
geometry and rotates it about the bind grip; shared licensed assets, skin
weights and animation tracks remain intact. Owned geometry is disposed with
the actor. Mathematical skinning checks and native ready/equipment/torch/effect
checks cover the corrected poses and guard against shared-template mutation.
