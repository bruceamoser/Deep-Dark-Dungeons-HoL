# Implementation status — November 5, 2026

This is a first playable foundation, not the completed game or the final visual quality benchmark.

## Working surfaces

- Linux desktop application; Windows x64 ZIP packaging.
- Animated 3D heroes with attached equipment, shadows, warm torchlight, fog, dust and camera rotation/zoom.
- Seeded connected rooms/corridors, visible exploration memory, minimap, four-person point-and-click movement and encounter detection.
- Original HoL Character Workshop embedded locally. Full catalog and staged creation validation reused from an immutable source revision; four validated published examples are provided.
- Alternating-side initiative, action budgets, movement conversion, Basic Melee/Unarmed, player-facing defense and fixed damage/resistance.
- Loot collection, exit/depth stairs, local campaign saves, a town menu and a proposed recovery-cache data model.
- Artcraft PhotoCraft, VectorCraft and SolidCraft MCP setup checked. The Greyhaven seal has an editable VectorCraft source and an MCP-exported PNG.

## Material limitations

- Learned cards are readable; most are not yet executable in dungeon combat. Reactions, ranged ammunition, spells, conditions and contextual Boons/Banes need complete adapters.
- All 280 wound entries and the upstream survival/recovery modules are bundled. A rolled wound pauses the game at an explicit integration boundary. Its consequences are not silently discarded. Complete wound effects, Dying/Last Words interaction, treatment and expedition rescue remain release blockers.
- Town shopping currently opens creation shopping. Persistent vault-funded shopping is not implemented.
- Failed-party caches and replacement parties are a proposal; the complete defeat/rescue loop is not yet reachable through fully automated harm play.
- Four class-associated free model appearances are available. Full ancestry/body/outfit customization and inventory-driven visual equipment are not implemented. Attached visual weapons are an art prototype, not an authoritative equipment display.
- Scenery remains a first art pass. A designed town, authored room variety, animation blending polish, real sound design, accessibility/options and performance budgets remain necessary.
- Windows is packaged but has not been run on Windows. Linux desktop and headless Chromium checks are separate evidence.

## Source reconciliation

No differences were found between the pinned book `24e545e6d860e8c1b03a21356fd22cae1c039785` and observed HEAD `f3713b60f3000d4fefc44c69428a8d358fe3be5b` in rules, classes, ancestries, origins, cards, development or the creation manuscript. The Foundry-independent implementation is pinned separately; imported descriptive prose is not used to infer mechanics.
