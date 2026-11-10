# Asset provenance

Free asset sources by **Kay Lousberg / KayKit**, CC0-1.0. The original license files are preserved within each asset directory.

| Pack                   | Creator repository                                                         | Pinned commit                              |
| ---------------------- | -------------------------------------------------------------------------- | ------------------------------------------ |
| Adventurers 1.0        | https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0 | `672074b73ba276876a19e8816ecdc5241817ab47` |
| Dungeon Remastered 1.0 | https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0        | `b0ca9bd96a8072ab36a3a5464f00ed1e06a16d07` |
| Skeletons 1.0          | https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0  | `15b62b9bad122f72926c10fb14d622c73819fa54` |

The initial import used the published free editions; these are now superseded by the purchased collection documented below. Geometry is reused and scaled at runtime. The character collection includes rigging, animation and accessories, but is not a complete modular outfit/ancestry solution.

Cinzel and EB Garamond font licenses are retained under `public/vendor/hol/fonts/`. HoL content remains Bruce's material; no new public distribution license is assigned by this project. Third-party asset licenses do not license the HoL manuscript.

The Greyhaven seal is original SVG artwork authored for the game. `art/source/greyhaven-seal.vectorcraft` is the editable MCP-created document and `art/exports/greyhaven-seal.png` its VectorCraft export.

The character command screen uses original SVG line icons (`src/ui/icons.mjs`), CSS framing and a lit Three.js preview. The original procedural recurve bow was replaced by the authored Adventurers 2.0 bow (#24). Armor tiers reuse CC0 KayKit adventurer body/limb meshes, rebound to the selected character rig; heads remain attached to the original rig. Cloth, leather, mixed plate and full plate are equipment-driven variants, not new commissioned character models. The v0.4.0 identity layer below adds ancestry-specific proportions and faces; further weapon silhouettes remain future art work.

Physical projectiles reuse the CC0 KayKit Adventurers 2.0 `arrow_bow.gltf` mesh (wooden shaft, metal head and fletching). Blade trails, impact shards, elemental ribbons, bowstring motion and attack sound synthesis are original runtime code in `src/view/combat-effects.mjs` and `src/view/audio.mjs`. No additional third-party art or audio license was introduced.

Creation and purchase screens reuse the book's existing discipline symbols from `public/vendor/hol/assets/`, with the original source paths and hashes retained in `assets/provenance.json`. A/M/R/P badges use the already bundled Cinzel font and each card's printed Action field, including combined types. Special-duration cards retain their printed label rather than being relabeled as Passive.

World interaction highlights clone and tint the existing CC0 dungeon coffer/stair materials only while highlighted. Recovery and dropped-supply caches use curated KayKit crates.

## Broader creature models and condition effects

Quaternius supplies CC0 rigged meshes from [Ultimate Monsters](https://quaternius.com/packs/ultimatemonsters.html), [Ultimate Animated Animals](https://quaternius.com/packs/ultimateanimatedanimals.html) and [Animated Monster](https://quaternius.com/packs/animatedmonster.html). Creator downloads were quota-limited; the imported Orc, Orc Skull, Yeti, Goleling, Green Blob, Wolf, Bat, Demon and Ghost files came from public mirrors. Exact pinned download URLs and SHA-256 hashes for both original and packaged files are recorded in [creature-assets.json](creature-assets.json). Embedded glTF files were repacked to self-contained GLB without geometry or animation edits.

Species variants share those rigs with palette/scale/equipment changes. They are not 58 bespoke models. Rats and spiders, all persistent condition effects, floating feedback and accessory geometry are original runtime code. Book illustrations remain the pinned HoL assets with their existing source provenance. No extra license for the HoL content is implied by the CC0 meshes.

## Historical individual heroes (v0.4.0; superseded by #24)

The original `src/view/hero-identity.mjs` contained modular head, ears, eyes/irises,
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

## Greyhaven town (#26)

A curated 16-model subset of **KayKit Medieval Hexagon Pack 1.0.1**, from the
owned Complete Collection v8, provides blue-roofed service buildings, the gate,
well, trees, rocks, crates, barrels and grass foundation. Runtime glTF/buffer/atlas
dependencies total approximately 1 MB under `public/assets/town/`. The manifest
records each original archive path and SHA-256 hash; the original CC0 license
text is included (whitespace normalized). Strategic asset pivots are centered in
presentation wrappers; the original geometry is preserved. Continuous packed-earth streets, party contact shadows and destination markers
are original runtime geometry. No new external dependency or paid asset was introduced.

Town navigation uses its own street graph and presentation coordinates. It does
not replace dungeon maps, square-grid rules, saved floor state or service rules.

## Dungeon architecture and room dressing (#23)

`public/assets/world/` contains a curated runtime subset from Dungeon Pack 1.1,
Halloween Bits 1.0, RPG Tools Bits 1.0 and Resource Bits 1.0, all from the owned
Complete KayKit Collection v8 (CC0-1.0). The manifest records each source archive
path, pack and SHA-256 hash, including external buffers and shared atlases.
The original collection license is included with whitespace normalized.

Dungeon walls, authored cutaway half-walls, floor panels, stairs, coffers and
practical props now use Dungeon 1.1. Crypt, archive, shrine and storeroom dressing
uses real coffins, ribs, shrines, bookcases, tables, crates and an anvil. Solid
dressing is restricted to existing obstacle cells and fitted within a 1.9-unit
footprint, preserving the 2.4-unit tactical cells and routes. Lost expedition
caches use a Resource Bits wooden crate rather than another coffer.

The 203-model legacy Dungeon Remastered runtime folder was removed after all
runtime references migrated. Its historical source URLs/commits above remain
the provenance record. The new subset is approximately 1.2 MB versus 9.1 MB for
the superseded folder; the downloaded collection archive remains outside Git.

### Readable stairways and coffers (#32)

Dungeon landmarks now use the collection's authored `stairs_walled`,
`chest_large` and `chest_large_gold` models. Source paths/dependencies and hashes
are recorded in the world manifest. Stairs are centered/fitted and placed clear
of spawn/guardian positions; ordinary and guarded coffers have distinct wood/gold
variants. The authored lid meshes hinge open when their existing saved `opened`
state changes and restore that pose on load. No loot, guard, interaction-distance
or saved-floor rules changed. The superseded basic stair/coffer files were removed.

### Authored hero choices and held equipment (#24)

The shared creator/sheet/town/dungeon path offers 15 complete fantasy character
silhouettes via `src/core/hero-avatars.mjs`. These reuse the purchased Adventurers
2.0 and Mystery Series 4–6 models already licensed under CC0. The original
atlas colors are retained. Broad RGB recoloring and generated face overlays are
removed. Old face/hair/color metadata remains in saves; the editor exposes actual
model and build choices rather than unsupported head morphs. Culture-specific
recolors are not implemented: culture continues to affect game rules, not costume.

`public/assets/gear/manifest.json` records exact collection paths and hashes for
Adventurers 2.0 sword, bow with string, arrow, shield and staff, plus Dungeon 1.1
unlit/lit torches. Worn head items use the Knight's rigged helmet/visor. Authored
outfit boots and belts remain visible instead of duplicate primitive shells;
magical equipment keeps its existing enchantment feedback. Kobolds use fantasy
raiders and animated armor uses Black Knight rather than sci-fi robots. Unused
modern character imports and superseded Adventurers/Skeletons 1.x folders are
removed from the runtime bundle.

### Greyhaven identity refresh (#27)

Original vector artwork: a warm lantern inside a stone gate, blue town roofs and
a gold hexagonal frame. `art/source/greyhaven-seal.svg` is the master;
`greyhaven-seal.vectorcraft` is the editable VectorCraft round-trip and
`art/exports/greyhaven-seal.png` the 512px export. The runtime uses the matching
SVG for sharp interface/loading/favicon marks and PNG for native application
icons. `python3 scripts/artcraft-seal.py` regenerates both runtime copies through
the locally installed `vectorcraft-cli` found on PATH. No external artwork,
font or AI-generated raster was introduced. The loading accent respects reduced
motion preferences.

## Dungeon Mason player characters

Player customization now supports the purchased RPG Tiny Hero Wave Polyart family. See [conversion, licence, private staging and verification](dungeon-mason-characters.md). Purchased source and generated standalone models are excluded from public Git; local finished application builds embed staged runtime exports.

## Approved fantasy soundtrack — November 8, 2026

Four original MP3 recordings by Alexander Nakarada and Kevin MacLeod ship under
CC BY 4.0, selected by Bruce. Source links, hashes and exact files are recorded in
[the music manifest](music-provenance.json); attribution is bundled and
visible in Sound. See [soundtrack decisions and licensing](music.md). Procedural
wind/foley/combat sounds remain game-authored on their own effects bus.

### Four Lanterns Deep illustrated identity (#78)

Bruce approved the generated title artwork on November 8, 2026. The full logo
is `public/art/four-lanterns-logo-v2.png`; its matching desktop/header emblem is
`public/art/four-lanterns-icon-v2.png`. Both retain their generated transparency.
The built-in image generator produced the artwork and derived icon; exact
prompts and provenance are recorded in `art/source/four-lanterns-logo-provenance.json`.
Greyhaven retains its separate town crest.

The loading screen animates independent warm glows over all four painted flames
and a few drifting embers with CSS opacity/transform animations. Lettering stays
still and readable; reduced-motion preferences disable the motion and embers.
No runtime image-generation service or network request is needed.

## November 10 creature pilots

Five Blender-authored runtime exports and editable sources replace the Wererat, Clay Helper and Air Elemental casts and add actual spear/pan equipment. KayKit Ninja donor rig/body is CC0 with original inputs unchanged; added anatomy/construct/vortex/prop geometry and materials are Bruce Moser project contributions. No new public license is assigned. See [provenance/hashes](creature-pilots-provenance.json) and [scope, remaining gaps and verification](creature-model-pilots.md). No cloud generation or purchased source export is involved.
