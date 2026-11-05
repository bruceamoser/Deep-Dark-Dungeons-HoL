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

The character command screen uses original SVG line icons (`src/ui/icons.mjs`), CSS framing and a lit Three.js preview. The readied recurve bow in `src/view/appearance.mjs` is original procedural geometry. Armor tiers reuse CC0 KayKit adventurer body/limb meshes, rebound to the selected character rig; heads remain attached to the original rig. Cloth, leather, mixed plate and full plate are equipment-driven variants, not new commissioned character models. Ancestry-specific bodies/faces and individual weapon silhouettes remain future asset work.

Physical projectiles reuse the CC0 KayKit Adventurers `arrow.gltf` mesh (wooden shaft, metal head and fletching). Blade trails, impact shards, elemental ribbons, bowstring motion and attack sound synthesis are original runtime code in `src/view/combat-effects.mjs` and `src/view/audio.mjs`. No additional third-party art or audio license was introduced.

Creation and purchase screens reuse the book's existing discipline symbols from `public/vendor/hol/assets/`, with the original source paths and hashes retained in `assets/provenance.json`. A/M/R/P badges use the already bundled Cinzel font and each card's printed Action field, including combined types. Special-duration cards retain their printed label rather than being relabeled as Passive.

World interaction highlights clone and tint the existing CC0 dungeon coffer/stair materials only while highlighted. Recovery caches reuse the bundled coffer mesh; no new external asset was added.

## Broader creature models and condition effects

Quaternius supplies CC0 rigged meshes from [Ultimate Monsters](https://quaternius.com/packs/ultimatemonsters.html), [Ultimate Animated Animals](https://quaternius.com/packs/ultimateanimatedanimals.html) and [Animated Monster](https://quaternius.com/packs/animatedmonster.html). Creator downloads were quota-limited; the imported Orc, Orc Skull, Yeti, Goleling, Green Blob, Wolf, Bat, Demon and Ghost files came from public mirrors. Exact pinned download URLs and SHA-256 hashes for both original and packaged files are recorded in [creature-assets.json](creature-assets.json). Embedded glTF files were repacked to self-contained GLB without geometry or animation edits.

Species variants share those rigs with palette/scale/equipment changes. They are not 58 bespoke models. Rats and spiders, all persistent condition effects, floating feedback and accessory geometry are original runtime code. Book illustrations remain the pinned HoL assets with their existing source provenance. No extra license for the HoL content is implied by the CC0 meshes.
