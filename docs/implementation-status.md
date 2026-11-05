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
- The former cleared-depth milestone proposal has been replaced by the XP adaptation below. Workshop training commits only earned progression, protects prior choices and creation, gates newly learned cards to the included roster, carries DP forward, and does not refill HP/Grit. Level-3/7 signature training remains gated by missing signature adapters; this is not complete class progression.
- Procedural wind, footsteps, impacts, spells, combat and loot tones use gesture-unlocked Web Audio, persisted volume/mute and a test sound. This is a functional sound pass, not finished production audio.

The earlier limitation that _all_ learned cards are reference-only is superseded by this pass. The full rescue loop, most signatures/reactions, persistent shopping and high-end final art remain unfinished. Hero injury/condition and treatment coverage is expanded in the pass below.

The complete 427-card curation inventory is [ability-coverage.json](ability-coverage.json). Current counts: 36 included action/passive/support cards, 2 proposed adaptations, 1 excluded and 388 awaiting review. “Awaiting review” is not a judgment that a card should be excluded. Creation still exposes the original catalog and published examples; source-only cards are visible on sheets and cannot execute as generic attacks. Dungeon-only recruitment/catalog filtering and replacement choices for legacy example cards remain to be designed.

## November 5 command-screen update

Replaced the scrolling reference sheet and embedded character mancer with a game-styled equipment screen and native eight-step creator. Added per-hero combat favorites, budget display, quick ready/stow, real armor training checks, equipment-driven model assembly and rotating preview. Linux desktop and blank creation interaction verified. Detailed remaining combat/rules coverage below and in `ability-coverage.json` still applies; this UI update does not claim all tabletop abilities are automated.

## Injury and recovery pass

Wounds apply numerical penalties and typed conditions, offer a displacement direction where required, and continue after acknowledgement. Hero turns resolve condition damage/decay, Dazed action choices, survival and Last Words. Forced movement handles Stability and collision chains. The six treatment capabilities use one-hour, once-per-wound-per-day source procedures and retain scar counts; the Journey panel exposes eligible healers and recovery progress. Healing bottles and nine additional combat/recovery cards have explicit adapters. Source boundaries and adjudications are listed in `computer-game-deltas.md`.

Remaining material gaps include opportunity attacks and most reactions, higher-level signatures, special anatomical remedies, stealth/unnoticed targeting, healing-harmed creatures, difficult-terrain generation and persistent town shopping. No claim is made that 36 included cards equals complete HoL automation.

## Physical attack presentation

Ranged attacks now nock and release the modeled arrow from an upright bow with a drawn string, follow an arcing flight and resolve visual contact on arrival. Sword attacks use the actual held weapon, a short visual lunge and a fading ribbon sampled from the animated blade. One/two-handed melee, unarmed strikes and shield bashes select corresponding rig clips. Fire, frost and life magic have separate shard/ribbon silhouettes. Sound and hit reactions follow release/contact; lethal targets remain visible until impact. These are presentation changes; HoL outcomes, tactical positions and action costs remain authoritative.

## Creation purchasing and combat usability

New recruitment opens a blank character; saved draft resumption and published presets are explicit choices. Ability and discipline purchases have separate game-styled dialogs, current-rank headers, the book's discipline symbols and A/M/R/P type badges. Ability browsing filters by individual disciplines, owned disciplines or general abilities. The equipment step lists the actual granted and purchased inventory, grant sources, unresolved acquisition choices and owned quantities before offering additional purchases.

Combat actions can be switched or cancelled before use, including a confirmation step for self actions. Movement completion refreshes action availability; new player-side turns select an eligible hero and clear old targeting/budget displays. Ally passage, prone-square costs and coordinated exploration movement are covered by the explicit adaptation above. The older blanket limitation on prone-occupant traversal is superseded; opportunity attacks, stealth, special remedies and the other listed gaps remain.

Coffers, recovery caches and stairs now have mesh-based pointer picking, a colored hover glow and contextual interaction menus. Lost caches have visible coffer models. Nearby loot is collected deliberately, and Approach routes the company before reopening the menu. Collected coffers remain inspectable as empty; recovered caches disappear. Generic equipment drops and container contents remain future inventory work.

## Hero repository, Hall and XP

The company register now separates the active party from persistent reserve heroes, with slot assignment/swapping, searchable hero cards, an animated equipped preview and saved XP/progression. Creation saves to the repository before assignment. The Hall of Fallen Heroes preserves individual final-death snapshots and excludes them from recruitment. Startup restores the campaign automatically; migration preserves existing heroes and earned levels. Defeat no longer respawns the published example party.

Exploration, resolved encounters and safely returned coffer treasure award shared XP to living expedition members. XP is visible on party cards, in the repository and on Journey, including training readiness, recent awards and a player-facing explanation of the reward schedule. XP unlocks earned levels; HoL's source training rules apply them in town. Per-floor claims and recovered-cache exclusions prevent duplicate awards. Reward amounts and the increasing level thresholds remain initial balance values; high-level signature coverage and other existing content gaps remain unchanged.

## Broader dungeon content and saved journeys

Added 58 procedurally selected source creatures, player/depth CV budgets, a guardian every fifth floor, source primary attacks/defenses and selected printed reactions. Six town merchants and seeded magical equipment cover 12 base forms and ten sheet slots, with visible dormant/active discipline requirements. Coffers retain individual unclaimed items. Scrolls bank the expedition in town and preserve a return passage to the exact floor. Damage, healing and status labels float over recipients; all 17 condition keys have persistent visual layers. See [encounters-and-treasure.md](encounters-and-treasure.md) for exact coverage and explicit adaptations. This supersedes the earlier seven/sentry-only creature and no-persistent-shopping limits.

Runs provides named independent campaigns, Save a separate copy, rename/delete, new company, resume, Save & exit run and desktop Save & quit. Slots retain repository, Hall, XP, gear, loot, treasury, market, return passage, combat budgets, pending reactions/wounds and in-progress movement. Legacy saves migrate without removing the original file. The current run autosaves; a copy stays unchanged until played. There is no fixed slot-count cap (browser builds remain subject to local-storage quota).

Remaining production work includes full creature alternate-action coverage, opportunity attacks, most hero abilities/signatures, larger creature footprints, long-term encounter/economy/XP balance and bespoke ancestry/creature/gear art. These remain a playable development build, not final high-end art or complete HoL automation.

## Origin grant visibility and creation continuity

Culture/background names now open searchable game-styled choosers for all 18 cultures and 32 backgrounds. Each origin shows both discipline–ability pairs, discipline rank and book icon, A/M/R/P badge, ability description and full rules, dungeon support status and starting coins. Browsing/canceling does not change the draft; explicitly choosing a pair commits it. The Origins page retains a readable receipt for each selected pair.

Early training visibly locks discipline purchasing until level 1, matching the existing pinned validator. Granted origin disciplines remain available at level 0 and ability purchases retain source prerequisites. Same-step edits preserve the creator and purchase-list scroll offsets, expanded source rules and equipment grip selections; deliberate step changes and starting blank reset the view. No source rules or grant/refund arithmetic changed.
