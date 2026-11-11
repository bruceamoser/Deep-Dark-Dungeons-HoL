# Owned gear beyond weapons — verified locally November 11, 2026

Use this inventory before creating creature accessories from scratch. Sources live privately under `~/Projects/DDD-Asset-Workshop/PurchasedSource/`; no mesh or purchased texture is reproduced in Git. The raw inventories include format/color variants, so filenames are not unique geometry counts.

## Dungeon Mason — RPG Tiny Hero Wave Polyart

`DungeonMason/Assets/RPGTinyHeroWavePolyart/Mesh/HeadParts` contains 115 FBXs. The combined body file contains 20 bodies and three cloaks. Useful selections:

- 14 `Hat01`–`Hat14` headpieces: helmets, caps, hoods, wizard/other hats. Inspect thumbnails/actual mesh before choosing; names do not identify style.
- Five `HeadArmor01`–`HeadArmor05` armored head variants. These can include the head itself; do not blindly layer over a complete human head (overlap can cause clipping).
- Three `BackPack01`–`BackPack03` designs, including a stocked traveling pack.
- Twenty `Shield01`–`Shield20` designs, stored in Weapons but useful defensive/role gear.
- Three cloaks in `AllBodiesCloaks.fbx`.
- Masks, eyepatch, crowns, horns, ears, glasses, ribbons, two basic facial-hair forms with color variants, 13 hairstyle files, eyes/mouths/brows and head variants.
- Boots, gloves, belts, tunics and much armor are generally integrated into the 20 outfit/body meshes, not a complete independent wardrobe of swappable pieces. Source masks allow recoloring; task-owned mesh copies can be modified carefully.

Actual supplied parts already reused: Scrapper Hat04 fitted cap; Soldier Hat02 with its two isolated horns removed; Bandit Body05/Hair02/BackPack01. Original source FBX/textures untouched; editable/export derivatives remain private.

## KayKit Complete Collection v8 — 24 installed packs

Relevant folders and verified examples:

| Pack | Available nonweapon gear/props |
| --- | --- |
| RPG Tools Bits 1.0 | `torch`, `torch_burnt`, `lantern`, `rope_bundle_A/B`, maps/rolled map, journals open/closed, keys/locks/lockpick set, fishing rod/tacklebox/hook/floater, shovel, pickaxe, mallet, tongs, hammer, anvil, grindstone, saw, chisel, file, handdrill, handplane, scissors, drafting compass, blueprints, bucket, nails/screws |
| Adventurers 2.0 | `quiver`, arrow bundles, potion sizes small/medium/large/huge in blue/green/orange/red, `spellbook_open/closed`, `smokebomb`, mugs full/empty, ammo crates |
| Dungeon Pack 1.1 | torch/lit/mounted variants, candles, books, bottles, keys/keyring, buckets, chests, crates, barrels, food plates, coins/stacks, bookcases/shelves and dungeon fixtures |
| Resource Bits 1.0 | food apples/berries/cheese/flour/fish baskets and barrels, gems/sacks/chests, money stacks, resource containers/piles |
| Mixed Bag 2 | `beartrap_A/B`, `necronomicon_A/B`, `book_mimic`, cobwebs and other props |
| Mystery Monthly Series 5: Hiker | `Tent`, `Waterbottle` |
| Furniture Bits 1.0 | books and furniture; inspect designs for setting fit |

RPG Tools has 69 distinct model stems; Adventurers 71 (including characters/rigs/weapons); Dungeon 283; Resources 132. These are inventory navigation counts, **not** claims of unique meshes or game-ready attachments. KayKit v8 carries the previously verified CC0 license. Keep source/license provenance per adopted part and adapt palette/scale/materials to the Mason-based creature where needed.

An owned prop still needs grip/socket fitting, silhouette review and animation clearance. A static torch is not automatically animated fire; a potion is not an automatically working throw/release. Record the actual work and test those behaviors before acceptance.
