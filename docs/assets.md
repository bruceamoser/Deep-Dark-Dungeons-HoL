# Asset provenance

Free asset sources by **Kay Lousberg / KayKit**, CC0-1.0. The original license files are preserved within each asset directory.

| Pack                   | Creator repository                                                         | Pinned commit                              |
| ---------------------- | -------------------------------------------------------------------------- | ------------------------------------------ |
| Adventurers 1.0        | https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0 | `672074b73ba276876a19e8816ecdc5241817ab47` |
| Dungeon Remastered 1.0 | https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0        | `b0ca9bd96a8072ab36a3a5464f00ed1e06a16d07` |
| Skeletons 1.0          | https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0  | `15b62b9bad122f72926c10fb14d622c73819fa54` |

Only published free editions were imported, not paid extras. Geometry is reused and scaled at runtime. The character collection includes rigging, animation and accessories, but is not a complete modular outfit/ancestry solution.

Cinzel and EB Garamond font licenses are retained under `public/vendor/hol/fonts/`. HoL content remains Bruce's material; no new public distribution license is assigned by this project. Third-party asset licenses do not license the HoL manuscript.

The Greyhaven seal is original SVG artwork authored for the game. `art/source/greyhaven-seal.vectorcraft` is the editable MCP-created document and `art/exports/greyhaven-seal.png` its VectorCraft export.

The character command screen uses original SVG line icons (`src/ui/icons.mjs`), CSS framing and a lit Three.js preview. The readied recurve bow in `src/view/appearance.mjs` is original procedural geometry. Armor tiers reuse CC0 KayKit adventurer body/limb meshes, rebound to the selected character rig; heads remain attached to the original rig. Cloth, leather, mixed plate and full plate are equipment-driven variants, not new commissioned character models. The v0.4.0 identity layer below adds ancestry-specific proportions and faces; further weapon silhouettes remain future art work.

Physical projectiles reuse the CC0 KayKit Adventurers `arrow.gltf` mesh (wooden shaft, metal head and fletching). Blade trails, impact shards, elemental ribbons, bowstring motion and attack sound synthesis are original runtime code in `src/view/combat-effects.mjs` and `src/view/audio.mjs`. No additional third-party art or audio license was introduced.

Creation and purchase screens reuse the book's existing discipline symbols from `public/vendor/hol/assets/`, with the original source paths and hashes retained in `assets/provenance.json`. A/M/R/P badges use the already bundled Cinzel font and each card's printed Action field, including combined types. Special-duration cards retain their printed label rather than being relabeled as Passive.

World interaction highlights clone and tint the existing CC0 dungeon coffer/stair materials only while highlighted. Recovery caches reuse the bundled coffer mesh; no new external asset was added.

## Broader creature models and condition effects

Quaternius supplies CC0 rigged meshes from [Ultimate Monsters](https://quaternius.com/packs/ultimatemonsters.html), [Ultimate Animated Animals](https://quaternius.com/packs/ultimateanimatedanimals.html) and [Animated Monster](https://quaternius.com/packs/animatedmonster.html). Creator downloads were quota-limited; the imported Orc, Orc Skull, Yeti, Goleling, Green Blob, Wolf, Bat, Demon and Ghost files came from public mirrors. Exact pinned download URLs and SHA-256 hashes for both original and packaged files are recorded in [creature-assets.json](creature-assets.json). Embedded glTF files were repacked to self-contained GLB without geometry or animation edits.

Species variants share those rigs with palette/scale/equipment changes. They are not 58 bespoke models. Rats and spiders, all persistent condition effects, floating feedback and accessory geometry are original runtime code. Book illustrations remain the pinned HoL assets with their existing source provenance. No extra license for the HoL content is implied by the CC0 meshes.

## Individual heroes (v0.4.0)

`src/view/hero-identity.mjs` contains original modular head, ears, eyes/irises,
hair, beard, braid, bindings and Oath-Bound seam geometry fitted to KayKit's
CC0 Adventurers head bone. Ancestry/build/sex alter proportions; garment palette
recoloring preserves the equipment pipeline. No downloaded character creator,
paid asset or AI-generated bitmap is used. The original pack files stay unchanged.
Tactical overlays and battlefield flames, water, smoke, ice walls and runes are
original procedural Three.js geometry/materials.

## The Complete KayKit Collection v8 (purchased)

Purchased November 7, 2026. **CC0 1.0 Universal** — the licence file in the archive
states the content is free for personal, educational and commercial use, and CC0 applies
even to the paid SOURCE tier. Attribution is requested but not mandatory.

- Creator: Kay Lousberg, <https://www.kaylousberg.com>
- Source: <https://kaylousberg.itch.io/kaykit-complete>
- Archive: `The Complete KayKit Collection v8.zip`, 624 MB,
  SHA-256 `bde0b7329aaed723c2dcb86b9f067ef3c59518ba5b92003a768bd19d91c09280`
- Collection creation date: 2026-11-03

Twenty-four packs, 29,709 archive entries. Model counts below are the glTF/GLB payload.

| Pack | glTF | GLB | Role in this game |
| --- | --- | --- | --- |
| Adventurers 2.0 | 58 | 13 | Base heroes, incl. new Druid, Engineer, Ranger |
| Skeletons 1.1 | 19 | 10 | Undead, incl. Necromancer and Skeleton Golem |
| Mystery Monthly Series 4 (1.1) | 49 | 31 | Paladin, Ninja, Orc Raider, Werewolf, Monster |
| Mystery Monthly Series 5 (1.1) | 46 | 18 | Black Knight, Tiefling, Vampire, Witch, Frost Golem |
| Mystery Monthly Series 6 (1.1) | 36 | 18 | Cleric, Lorekeeper, Marksman, Orc Brute, Plant Warrior |
| Dungeon Pack 1.1 | 283 | 0 | Dungeon architecture and props |
| Fantasy Weapons Bits 1.0 | 48 | 0 | Weapons, for visible equipped gear |
| RPG Tools Bits 1.0 | 69 | 0 | Adventuring equipment |
| Halloween Bits 1.0 | 102 | 0 | Seasonal props and monsters |
| Resource Bits 1.0 | 132 | 0 | Materials and resources |
| Furniture Bits 1.0 | 74 | 0 | Interiors |
| Forest Nature Pack 1.0 | 1588 | 0 | Overland and surface scenes |
| Medieval Hexagon Pack 1.0.1 | 404 | 0 | Hex terrain |
| Platformer, Block, Board Game, City Builder, Prototype, Restaurant, Space Base, Holiday, Mixed Bag 1 and 2 | — | — | Available; not yet used |

Verified in engine on November 7, 2026: all **61 character GLB models** load through the
project's existing `GLTFLoader` path with zero failures. See `docs/art-direction.md` for
the visual comparison.

The Dungeon Pack 1.1 is a drop-in replacement for the currently bundled Dungeon Remastered
1.0: every prop the game already references (`floor_tile_large`, `pillar_decorated`,
`wall`, `torch_mounted`, `rubble_large`, `barrel_large`, `table_long_decorated_A`,
`candle_triple`, `shelf_small_candles`, `chest`, `stairs_wide`, `banner_patternB_green`)
is present by the same name.

Series 4 to 6 are documented by the creator as "technically identical to the Adventurer
characters", so they share the rig and animation format already in use. Series 4 is mixed
fantasy and modern (it includes a car and an animatronic bear); Series 5 and 6 are
consistently fantasy.
