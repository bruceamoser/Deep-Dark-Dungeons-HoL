# KayKit world art selection

Inspected the complete purchased v8 archive on November 7, 2026, including all
24 pack inventories and the relevant original preview sheets. Counts below are
format payloads, not unique model counts: glTF and GLB often duplicate a model,
and forest assets include eight color variants. The source archive remains in
Downloads; preview sheets extracted for inspection stay in ignored test-results.

## Collection inventory

| Pack | glTF | GLB |
| --- | ---: | ---: |
| KayKit Adventurers 2.0 | 58 | 13 |
| KayKit Block Bits 1.0 | 58 | 0 |
| KayKit Board Game Bits 1.0 | 243 | 0 |
| KayKit Character Animations 1.1 | 0 | 16 |
| KayKit City Builder Bits 1.0 | 73 | 0 |
| KayKit Dungeon Pack 1.1 | 283 | 0 |
| KayKit Fantasy Weapons Bits 1.0 | 48 | 0 |
| KayKit Forest Nature Pack 1.0 | 1588 | 0 |
| KayKit Furniture Bits 1.0 | 74 | 0 |
| KayKit Halloween Bits 1.0 | 102 | 0 |
| KayKit Holiday Bits 1.0 | 138 | 0 |
| KayKit Medieval Hexagon Pack 1.0.1 | 404 | 0 |
| KayKit Mixed Bag 1 | 59 | 0 |
| KayKit Mixed Bag 2 | 50 | 0 |
| KayKit Mystery Monthly Series 4 (1.1) | 49 | 31 |
| KayKit Mystery Monthly Series 5 (1.1) | 46 | 18 |
| KayKit Mystery Monthly Series 6 (1.1) | 36 | 18 |
| KayKit Platformer Pack 1.0 | 525 | 0 |
| KayKit Prototype Bits 1.1 | 85 | 3 |
| KayKit RPG Tools Bits 1.0 | 69 | 0 |
| KayKit Resource Bits 1.0 | 132 | 0 |
| KayKit Restaurant Bits 1.0 | 225 | 0 |
| KayKit Skeletons 1.1 | 19 | 10 |
| KayKit Space Base Bits 1.0 | 69 | 0 |

## World composition choices

- **Dungeon Pack 1.1:** the primary square-grid architecture set. Use authored
  half walls instead of plain cutaway boxes; varied closed/inset/arched wall
  sections for room identity; grates, chipped tiles, bookshelves, candles,
  scaffold pieces and broken furniture for restrained dressing. The 1.1 update
  adds tavern counters, stools, benches and beds suitable for the inn. Eleven
  of the twelve currently referenced props have identical mesh accessor bounds
  to the legacy version; replacing paths alone is not a visual redesign.
- **Halloween Bits:** coffin/coffin_decorated, crypt, shrine/shrine_candles,
  gravestones, ribcage, skull_candle, plaque_candles, lanterns and dead trees
  provide a coherent crypt/shrine vocabulary. Seasonal candy, pumpkins and
  tractors are not appropriate defaults for the core dungeon.
- **RPG Tools Bits:** anvil, grindstone, tongs, hammer, lantern, rope bundles,
  journal, maps and lockpicks make workshops and carried gear readable.
- **Resource Bits:** ore, bars, gems, sacks, textiles, wood, crates, food baskets
  and barrels provide merchant/crafting/loot identity. Exclude modern fuel
  drums, banknotes and plastic pallets from fantasy scenes.
- **Medieval Hexagon:** houses, tavern-like buildings, market stalls, well,
  smithy, towers, gate and walls suit a composed Greyhaven overview. The
  hexagon ground system is not a reason to change dungeon square-grid rules.
  These are strategic-scale buildings: verify party/building proportions and
  entrance paths in the town scene before accepting them.
- **Forest Nature:** rocks, cliffs, trees, dead trunks, shrubs, grass and
  mushrooms can frame town outskirts, overgrown rooms and dungeon entrances.
  Pick a consistent palette and small curated subset; do not import 1,588
  format/color variants into the runtime.
- **Furniture Bits:** wooden chairs, desks, cabinets, beds and rugs may fill
  gaps, but most of this set is modern. Prefer Dungeon 1.1 tavern furniture;
  exclude monitors, keyboards, desk lamps and gaming equipment.
- **Mixed Bag 1/2:** chains, shackles, idols, bear traps, cobwebs, ornate
  mirrors and necronomicons are useful accents. Most other objects are modern
  novelty props and should not dilute the fantasy art direction.
- **Fantasy Weapons/Adventurers/Skeletons/Monthly characters/animations:**
  use authored silhouettes, matching rig/hand slots and appropriate fantasy
  casting. Availability does not imply every science-fiction/toy model belongs
  in the game. Character customization/gear is tracked in #24.
- **Board Game, Block, Prototype, Platformer, City Builder, Restaurant, Holiday,
  Space Base:** inventories inspected. These are optional sources, not the core
  art vocabulary; use only when an individual item fits the established world.

## Agreed play and presentation direction

Bruce chose readable atmospheric lighting: legible heroes and nearby terrain,
warm practical torchlight and dark unexplored space (#25).

Greyhaven should be an actual navigable town, not a service menu over a dungeon
(#26). Select a house/shop and the party walks to its entrance; arrival opens
the existing service. Service hotkeys start that same navigation. Keep routes
short, show the destination, allow redirection/cancellation, and make building
functions recognizable. Preserve source-rule services and saved expeditions.

Work sequentially through GitHub issues, branches, PRs, author review/checks and
merges. #21 is the overall art-overhaul tracker; #23 handles dungeon assets and
composition. Extract only runtime dependencies and retain source/license records.

Bruce also requested a polished Greyhaven logo and related game presentation.
#27 covers the editable vector crest, title treatment, loading screen, application
icon and matching interface/location marks. Existing vector source is
`art/source/greyhaven-seal.svg`; extend that source consistently and verify the
mark at the small sizes actually used by the game.

## Winding dirt paths — November 8, 2026

Bruce revised the earlier dead-straight street direction. Greyhaven keeps its
authored KayKit buildings and service destinations, now joined by curved dirt
lanes with soft, uneven boundaries and rounded junctions. The game generates
the packed-earth surface and subtle grain; no new third-party art is used.
The party and route preview share those lane curves, including redirection and
hotkey travel. This is presentation state, separate from dungeon movement/time.
