# Implementation status — v0.6.0

Playable desktop dungeon RPG with game-owned powers over HoL's base mechanics.
The production presentation target remains; the current modular art and balance
are a playable iteration rather than final production assets.

## Playable

- A discipline atlas containing 18 independent origins, 72 circular paths, 377 nodes and 33 confluences. All touching prerequisite nodes are required for combined techniques. Search, grab pan, zoom, book icons, A/M/R/P marks, learned/available/locked states and refund previews are implemented.
- One DP budget: 8 at level 1, 4 per subsequent trained level, level cap 30, unspent DP carried forward. Three origin grants through class/culture/background; overlapping grants refund 3 DP. Additional disciplines cost 3 DP from level 2. Rank II requires level 3/four invested nodes; rank III level 7/nine nodes.
- Replacement attack profiles and independent range paths. Twin Shot uses one Action, separate attack rolls, separate ammunition checks and staggered arrow effects. If ammunition exhausts, a second arrow is not fired. Combination powers retain both barriers and buffs.
- Free town node refunds cascade through dependencies, including discipline investments and confluence contacts. Full respec replaces all character choices while preserving XP, inventory, supply states and injuries without HP or Grit exploits. Training earned levels is explicit in the forge.
- Seven-step game creator: blank identity and attributes, ancestry/traits, appearance, visible origin choices, forge purchases, equipment kits/shopping, review. Old ability, mastery and signature selection interfaces are no longer in the player flow.
- Known disciplines/ranks remain visible on the sheet. Inventory transfer/drop, recoverable caches, unique boss relics, enchantment visuals and visible concealment remain.

- Four equipped, animated heroes; isometric camera; real-time exploration and alternating HoL turns; formations and individual combat movement. Right-drag grabs the ground. Actual tactical squares and a weighted movement overlay distinguish legal destinations, ally passage and the last movement point.
- 58 book creatures; party/depth encounter budgets; bosses every fifth floor; procedural slotted magic gear with discipline requirements; six merchants and two-way recall scrolls.
- A common effect engine for damage/healing, areas, physical DR, reduction, absorption, Boons/Banes, conditions, movement, push/pull, swaps, teleportation, protection, counters, concealment, light and limited action resources. Bonus Maneuvers queue for the recipient's next eligible turn, so they can actually be used in alternating combat.
- Persistent fire, water, smoke, difficult ground, magical light/darkness, barriers, healing circles and one-use traps. Ground previews precede spending; cancellation is free. Surfaces affect both sides; instant area strikes spare allies.
- All 50 ancestry traits retain explicit game behavior. Crafting and treatment traits now benefit the new recipe/care systems. The Human Far Walker trait now grants movement and carrying capacity instead of a second DP rule.
- Eleven learned recipes with ingredients, tools, locations, level gates and explicit times. Learn from artisans, discover a manuscript in the first searched coffer per floor, craft new supplies or replenish an existing bundle. Knowledge and prepared batches belong to each hero.
- HP healing, stabilization and wound treatment remain distinct. Normal camp treatment consumes a field dressing; exceptional treatment consumes a restoration draught. The town infirmary supplies a priced alternative. Treatment removes wound-linked penalties but retains scars/counts and never restores Grit. HoL's injury tables, death marks and Last Words remain.
- Persistent time, daily food/water, supply exhaustion notices, fatigue after 16 hours, eight-hour sleep with possible ambushes, held torches with automatic dousing and 30-minute consumption checks.
- Saved sex, build, face, skin, eight hairstyles, seven facial-hair styles, eye/hair/clothing/accent colors. Ten ancestry silhouettes and facial features, including pointed ears and constructed Oath-Bound faces. Live rotate/zoom preview; appearance carries into equipped dungeon models, reserves, development and fallen records. Edit cosmetics in town.
- Named independent runs, copies, active and inactive deletion with confirmation, persistent reserves, fallen heroes, visible XP and town training. Deleting the last migrated run cannot reimport it on restart.
- Linux AppImage and Debian installers, Windows NSIS installer, release update checks/downloads and save-before-install. Linux launcher keeps sandboxing enabled with a space-free per-user runtime.

## Ruleset and limits

This edition deliberately breaks progression compatibility. Save envelope v2 stores
forge characters; previous files are kept on disk and labeled as earlier-edition
journeys. They are not rewritten, loaded, or mixed with new characters. Original
source rules and imported content remain untouched. Historical engine adapters
and their regression tests remain where shared combat systems still rely on them;
they do not expose the old purchase systems to players.

Autonomous summons, vertical
traversal, full social simulation, elaborate fluid physics, broader recipes,
creature alternate actions and long-term balance remain future work. Concealment
is an explicit targeting rule, not a complete stealth simulation. Camp treatment
is predictable once a safe location is established; sleep remains interruptible.

Appearance uses original modular geometry on the existing licensed KayKit rigs.
It is not a bespoke set of production character sculpts; animation blending,
more equipment silhouettes, town environments and final art/audio still need
production work. Two GPUs are not required or combined.

[Current forge coverage](game-power-coverage.json) ·
[Historical source-card review](ability-coverage.json) ·
[v0.5 design and research](v0.5-gameplay-design.md) · [Earlier plan](gameplay-and-identity-plan.md) ·
[Adaptations](computer-game-deltas.md) · [Validation](validation.md)
