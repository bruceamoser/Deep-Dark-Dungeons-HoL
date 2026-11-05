# Implementation status — November 5, 2026

This is a first playable foundation, not the completed game or the final visual quality benchmark.

## Working surfaces

- Linux desktop application; Windows x64 ZIP packaging.
- Animated 3D heroes with attached melee/ranged equipment and shields, shadows, warm torchlight, fog, dust and camera pan/rotation/zoom.
- Seeded connected rooms/corridors, visible exploration memory, minimap, four-person point-and-click movement and encounter detection.
- Original HoL Character Workshop embedded locally. Full catalog and staged creation validation reused from an immutable source revision; four validated published examples are provided.
- Alternating-side initiative, action budgets, movement conversion, Basic Melee/Unarmed, player-facing defense and fixed damage/resistance.
- Loot collection, exit/depth stairs, local campaign saves, a town menu and a proposed recovery-cache data model.
- Artcraft PhotoCraft, VectorCraft and SolidCraft MCP setup checked. The Greyhaven seal has an editable VectorCraft source and an MCP-exported PNG.

## Material limitations

- The curated action subset below is playable. Most cards, class signatures, opportunity attacks, contextual exploration checks and complete hero condition handling still need design and adapters.
- All 280 wound entries and the upstream survival/recovery modules are bundled. A rolled wound pauses the game at an explicit integration boundary. Its consequences are not silently discarded. Complete wound effects, Dying/Last Words interaction, treatment and expedition rescue remain release blockers.
- Town shopping currently opens creation shopping. Persistent vault-funded shopping is not implemented.
- Failed-party caches and replacement parties are a proposal; the complete defeat/rescue loop is not yet reachable through fully automated harm play.
- Four class-associated free model appearances are available. Full ancestry/body/outfit customization and armor-driven appearance are not implemented. Weapon/shield hand attachments track the held loadout; model bodies/outfits remain a first art pass.
- Scenery remains a first art pass. A designed town, authored room variety, animation blending polish, real sound design, accessibility/options and performance budgets remain necessary.
- Windows is packaged but has not been run on Windows. Linux desktop and headless Chromium checks are separate evidence.

## Source reconciliation

No differences were found between the pinned book `24e545e6d860e8c1b03a21356fd22cae1c039785` and observed HEAD `f3713b60f3000d4fefc44c69428a8d358fe3be5b` in rules, classes, ancestries, origins, cards, development or the creation manuscript. The Foundry-independent implementation is pinned separately; imported descriptive prose is not used to infer mechanics.

## Second playable pass — controls and curated actions

- Combat movement changes only the acting hero, with camera follow suspended. Right-button dragging pans; wheel zooms; F resumes follow in exploration.
- Four exploration formations and editable marching order persist in the campaign. Paths reserve distinct destinations, wait/replan around companions and adapt to walls; formation rigidity is not promised in narrow passages.
- Expanded sheets expose all six attributes, ranks, origins, languages, equipment, resistances, live resources, wounds and per-card curation status. Owned melee/ranged weapons and shields drive hand attachments.
- Explicit action adapters: Basic Melee, Basic Unarmed, Basic Ranged, Hook and Drive, Pinning Shot, Cinder Cast, Rime Grip, Defend and Stabilize. Attribute/range/line-of-sight/action/equipment gates precede spending. Ammunition checks after successful use, including the final use of an exhausted bundle.
- Burning/Freezing tick at NPC turn end before temporary severity decays. Slowed reduces movement and sentries spend movement to stand from Prone when able. No imported prone defense modifier is invented.
- Shield Block offers an actual reaction decision before the sentry's melee attack, stacks with Defend, and expires at the next own turn. The gnome Small Target defense Boon is also applied. Last Words now blocks movement/actions/conversion.
- Main→Maneuver and Maneuver→movement conversions are available. Readying gear is a deliberate Maneuver in combat; a weapon attack can draw a carried weapon when enough hands are free.
- First extraction after clearing each new depth earns one level per surviving hero (game-specific milestone proposal). Workshop training commits only earned progression, protects prior choices and creation, gates newly learned cards to the included roster, carries DP forward, and does not refill HP/Grit. Level-3/7 signature training remains gated by missing signature adapters; this is not complete class progression.
- Procedural wind, footsteps, impacts, spells, combat and loot tones use gesture-unlocked Web Audio, persisted volume/mute and a test sound. This is a functional sound pass, not finished production audio.

The earlier limitation that *all* learned cards are reference-only is superseded by this pass. Wound treatment, the full defeat/rescue loop, most signatures/reactions, persistent shopping and high-end final art remain unfinished. Conditions currently originate on sentries from the supported attacks; full hero condition/wound integration remains blocked at the explicit injury boundary.

The complete 427-card curation inventory is [ability-coverage.json](ability-coverage.json). Current counts: 19 included action/passive/support cards, 2 proposed adaptations, 1 excluded and 405 awaiting review. “Awaiting review” is not a judgment that a card should be excluded. Creation still exposes the original catalog and published examples; source-only cards are visible on sheets and cannot execute as generic attacks. Dungeon-only recruitment/catalog filtering and replacement choices for legacy example cards remain to be designed.
