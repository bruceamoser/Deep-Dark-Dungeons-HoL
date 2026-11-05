# Implementation status — November 5, 2026

This is a first playable foundation, not the completed game or the final visual quality benchmark.

## Working surfaces

- Linux desktop application; Windows x64 ZIP packaging.
- Animated 3D heroes with attached melee/ranged equipment and shields, shadows, warm torchlight, fog, dust and camera pan/rotation/zoom.
- Seeded connected rooms/corridors, visible exploration memory, minimap, four-person point-and-click movement and encounter detection.
- Native game-styled eight-step character creation. Full catalog and staged creation validation reused from an immutable source revision; four validated published examples are provided.
- Alternating-side initiative, action budgets, movement conversion, Basic Melee/Unarmed, player-facing defense and fixed damage/resistance.
- Loot collection, exit/depth stairs, local campaign saves, a town menu and a proposed recovery-cache data model.
- Artcraft PhotoCraft, VectorCraft and SolidCraft MCP setup checked. The Greyhaven seal has an editable VectorCraft source and an MCP-exported PNG.

## Material limitations

- The curated action subset below is playable. Most cards, higher-level class signatures, opportunity attacks and contextual exploration checks still need design and adapters.
- All 280 wound entries and the upstream survival/recovery modules are bundled. Numerical wound effects, typed conditions, Dying/Last Words and daily treatment are now integrated. Exceptional anatomical consequences/remedies, additional reactions and expedition rescue need further work.
- Town shopping currently opens creation shopping. Persistent vault-funded shopping is not implemented.
- Full-party death now reaches defeat and records the company and its coin cache. Cache collection and replacement-company controls exist; a complete expedition rescue experience and balance remain unfinished.
- Four class-associated free model appearances are available. Armor tiers and held weapons/shields now drive both world models and the animated sheet preview. Full ancestry/body/outfit customization remains unimplemented; current appearances remain a first art pass.
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

The earlier limitation that _all_ learned cards are reference-only is superseded by this pass. The full rescue loop, most signatures/reactions, persistent shopping and high-end final art remain unfinished. Hero injury/condition and treatment coverage is expanded in the pass below.

The complete 427-card curation inventory is [ability-coverage.json](ability-coverage.json). Current counts: 36 included action/passive/support cards, 2 proposed adaptations, 1 excluded and 388 awaiting review. “Awaiting review” is not a judgment that a card should be excluded. Creation still exposes the original catalog and published examples; source-only cards are visible on sheets and cannot execute as generic attacks. Dungeon-only recruitment/catalog filtering and replacement choices for legacy example cards remain to be designed.

## November 5 command-screen update

Replaced the scrolling reference sheet and embedded character mancer with a game-styled equipment screen and native eight-step creator. Added per-hero combat favorites, budget display, quick ready/stow, real armor training checks, equipment-driven model assembly and rotating preview. Linux desktop and blank creation interaction verified. Detailed remaining combat/rules coverage below and in `ability-coverage.json` still applies; this UI update does not claim all tabletop abilities are automated.

## Injury and recovery pass

Wounds apply numerical penalties and typed conditions, offer a displacement direction where required, and continue after acknowledgement. Hero turns resolve condition damage/decay, Dazed action choices, survival and Last Words. Forced movement handles Stability and collision chains. The six treatment capabilities use one-hour, once-per-wound-per-day source procedures and retain scar counts; the Journey panel exposes eligible healers and recovery progress. Healing bottles and nine additional combat/recovery cards have explicit adapters. Source boundaries and adjudications are listed in `computer-game-deltas.md`.

Remaining material gaps include opportunity attacks and most reactions, higher-level signatures, special anatomical remedies, stealth/unnoticed targeting, healing-harmed creatures, prone-occupant traversal, difficult-terrain generation and persistent town shopping. No claim is made that 36 included cards equals complete HoL automation.

## Physical attack presentation

Ranged attacks now nock and release the modeled arrow from an upright bow with a drawn string, follow an arcing flight and resolve visual contact on arrival. Sword attacks use the actual held weapon, a short visual lunge and a fading ribbon sampled from the animated blade. One/two-handed melee, unarmed strikes and shield bashes select corresponding rig clips. Fire, frost and life magic have separate shard/ribbon silhouettes. Sound and hit reactions follow release/contact; lethal targets remain visible until impact. These are presentation changes; HoL outcomes, tactical positions and action costs remain authoritative.
