# Implementation status — v0.4.0

Playable desktop dungeon RPG with game-owned powers over HoL's base mechanics.
The production presentation target remains; the current modular art and balance
are a playable iteration rather than final production assets.

## Playable

- Four equipped, animated heroes; isometric camera; real-time exploration and alternating HoL turns; formations and individual combat movement. Right-drag grabs the ground. Actual tactical squares and a weighted movement overlay distinguish legal destinations, ally passage and the last movement point.
- 58 book creatures; party/depth encounter budgets; bosses every fifth floor; procedural slotted magic gear with discipline requirements; six merchants and two-way recall scrolls.
- Full staged HoL character validation and DP progression in a nine-chapter game creator. Visible origin grants, book discipline icons, A/M/R/P badges, separate purchase dialogs and scroll retention. New training uses 54 discipline powers, 30 class signatures and five retained general/armor training choices. Three consumable actions round out the 87 game designs. Basic actions remain available.
- A common effect engine for damage/healing, areas, physical DR, reduction, absorption, Boons/Banes, conditions, movement, push/pull, swaps, teleportation, protection, counters, concealment, light and limited action resources. Bonus Maneuvers queue for the recipient's next eligible turn, so they can actually be used in alternating combat.
- Persistent fire, water, smoke, difficult ground, magical light/darkness, barriers, healing circles and one-use traps. Ground previews precede spending; cancellation is free. Surfaces affect both sides; instant area strikes spare allies.
- All 50 ancestry traits retain explicit game behavior. Crafting and treatment traits now benefit the new recipe/care systems. Class signatures establish tactical roles rather than expose the old tabletop card roster.
- Eleven learned recipes with ingredients, tools, locations, level gates and explicit times. Learn from artisans, discover a manuscript in the first searched coffer per floor, craft new supplies or replenish an existing bundle. Knowledge and prepared batches belong to each hero.
- HP healing, stabilization and wound treatment remain distinct. Normal camp treatment consumes a field dressing; exceptional treatment consumes a restoration draught. The town infirmary supplies a priced alternative. Treatment removes wound-linked penalties but retains scars/counts and never restores Grit. HoL's injury tables, death marks and Last Words remain.
- Persistent time, daily food/water, supply exhaustion notices, fatigue after 16 hours, eight-hour sleep with possible ambushes, held torches with automatic dousing and 30-minute consumption checks.
- Saved sex, build, face, skin, eight hairstyles, seven facial-hair styles, eye/hair/clothing/accent colors. Ten ancestry silhouettes and facial features, including pointed ears and constructed Oath-Bound faces. Live rotate/zoom preview; appearance carries into equipped dungeon models, reserves, development and fallen records. Edit cosmetics in town.
- Named independent runs, copies, active and inactive deletion with confirmation, persistent reserves, fallen heroes, visible XP and town training. Deleting the last migrated run cannot reimport it on restart.
- Linux AppImage and Debian installers, Windows NSIS installer, release update checks/downloads and save-before-install. Linux launcher keeps sandboxing enabled with a space-free per-user runtime.

## Compatibility and limits

Original source rules, cards, receipts and inventories remain intact. Legacy
abilities map to the new designs by class/tier or discipline/rank, with explicit
general-ability mappings. Duplicate mappings share one power and its limits; new
training cannot charge DP for a power already supplied by legacy training. Source
stat benefits and past purchases are preserved. This is compatibility mapping,
not a refund or rewrite of the character's historical build.

Signatures share some discipline effect templates. Autonomous summons, vertical
traversal, full social simulation, elaborate fluid physics, broader recipes,
creature alternate actions and long-term balance remain future work. Concealment
is an explicit targeting rule, not a complete stealth simulation. Camp treatment
is predictable once a safe location is established; sleep remains interruptible.

Appearance uses original modular geometry on the existing licensed KayKit rigs.
It is not a bespoke set of production character sculpts; animation blending,
more equipment silhouettes, town environments and final art/audio still need
production work. Two GPUs are not required or combined.

[Current game designs and mappings](game-power-coverage.json) ·
[Historical source-card review](ability-coverage.json) ·
[Approved plan](gameplay-and-identity-plan.md) ·
[Adaptations](computer-game-deltas.md) · [Validation](validation.md)
