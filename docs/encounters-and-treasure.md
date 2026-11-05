# Dungeon creatures, treasure and return travel

This is the implemented computer-game subset of HoL. The pinned source catalog contains 192 creatures; **58** now enter procedural encounters. Their printed HP, CV, ordinary speed, primary defense/outcomes, numeric resistances, weaknesses, immunities and Stability remain source data. No level multiplier inflates their HP or damage. The Bestiary lists the playable cards, source illustrations, defenses and primary attacks; it does not imply that every printed option is automated.

## Encounter construction

The source's provisional encounter budget is `B(level) = 32 + 8 × level`. Mixed parties sum one quarter of each active hero's budget. The game multiplies that budget by depth pressure `min(1.75, 0.75 + 0.1 × (depth − 1))`; the last ordinary chamber uses 1.25 difficulty and a boss chamber 1.5. These depth/difficulty values are initial playtest tuning, not calibrated balance.

Each room chooses a themed pool. Depth unlocks broader creatures; every three average trained party levels beyond level 1 adds one unlock step. The seeded selector spends CV within its budget, caps encounters at five actors, caps a species at two, and initially limits primary Dazed/Paralyzed attackers to one. Budgets may underfill when the available pool or actor limit prevents another purchase. A required boss is present even when its printed CV exceeds a low-level party's target. Re-entered saved floors retain their inhabitants instead of scaling them again.

The roster spans skeletal undead, ghosts and wraiths, bandits and cultists, goblins, kobolds, orcs, hobgoblins, vermin, wolves, lycanthropes, ghouls, ooze, constructs, elementals and infernal creatures. Exact IDs, depth gates and visual adapters are in `src/core/creature-roster.mjs`. All currently supported creatures have a printed one-square footprint. Larger creatures need footprint/path/targeting support before inclusion.

Depths 5, 10, 15, 20, 25 and 30 introduce the Barrow Guard, Ash Demon, Wraith, Horned Devil, Tomb Sage and Death Knight respectively. Subsequent five-floor guardians use the Death Knight with budgeted guards. A living guardian blocks its treasure coffer and the next descent; retreat/return travel remains possible. This is a repeatable initial progression, not an unlimited roster of unique bosses.

## Creature automation boundary

Every included card has a supported primary single-target action and a basic melee fallback where its ammunition is exhausted. Range, defense attribute, damage type, defense-result damage, primary conditions, Push/Pull and prone riders are interpreted from printed fields. NPC ammunition starts at inventory d6 and steps down with source inventory checks, as a game provisioning choice. AI selects its nearest eligible target, moves within ordinary speed and uses its primary action when legal. Dazed/Grappled retain Main, then Maneuver, then Reaction as available; players still choose their own retained categories.

Implemented printed options include Defend, Study the Opening, Pack Hunter, Fall to Pieces, Shield Hunker, Cover a Companion, Turn the Blade, Spell Screen, Heated Hide, Splintering Rime, Clinging Recoil and Emberling's cold-related defense benefit. Reaction effects only apply when the creature actually lists them. Physical attacks are treated as Shield Block eligible; elemental attacks are not, an explicit fixed adjudication of the source's DA-determined blockability.

Unimplemented alternate actions, other optional maneuvers/reactions, opportunity attacks, unusual senses, burrowing/flying path rules, unnoticed-target play, anatomy and narrative traits remain coverage gaps. Portraits and model categories grant no mechanics. The roster's broad species coverage is not complete creature automation. Defenses are player-facing: a strong defense uses the printed **Strong defense** outcome, not the hero-attack outcome orientation.

## Generated equipment

Coffers and merchants generate seeded individual melee weapons, bows, shields, three armor tiers, belts, boots, hats, rings, brooches and gloves. The sheet exposes head, neck, body, hands, waist, feet, two rings and main/off hand. Generated weapons retain their canonical ordinary weapon identity for abilities, ammo and grip rules. Armor retains source training requirements; carrying and encumbrance include recovered and purchased gear.

Current enchantments provide Flame/Frost weapon riders, Fire/Cold/Life resistance, Brawn, or Speed. Ember Edge follows the book's Flame prerequisite, additional fire damage and Strong-hit Burning pattern; Frost and Speed variations are explicit game adaptations. Tier-two enchantments require rank 2 where the tier-one form requires rank 1. A dormant weapon still works as its ordinary base, and ordinary armor/shield properties remain available. Requirement labels show owned rank, needed rank and active/dormant status before purchase or equip. Generated mechanics are reconstructed from their receipts on load.

Repeated positive item bonuses to one attribute use the highest value; matching resistances use the highest value and cap at 3. Different resistance types coexist. Life resistance also reduces Life healing. Item Brawn changes live rolls and capacity, not creation DP, class eligibility, trained attributes or maximum HP. Wearable changes are outside combat; ready/stow costs retain the existing combat equipment policy. These effects do not grant discipline training.

Generated models reuse ordinary weapon/armor meshes with equipped headwear, belts/boots and an active weapon glow. Individual affixes do not yet have bespoke commissioned models. The first coffer includes a Scroll of Return; boss coffers yield a tier-two item. Collecting coins does not collect all items: choose a recipient and take each item; opened coffers keep unclaimed contents. Coin and treasure XP cannot be collected repeatedly.

## Surface merchants and paired recall

Six persistent merchants cover general supplies, armor, weapons, temple goods, alchemy and magical accessories. This follows the six-store organization in the original [Moria manual](https://github.com/dungeons-of-moria/umoria/blob/master/historical/manual.md). Stock is finite within an expedition and refreshes on a new expedition. Ordinary equipment sells for half listed value; held/worn and partly consumed goods must not be sold as fresh items. Neither buying nor selling grants DP or training.

A Scroll of Return may be bought from temple/alchemy/magic merchants or found in a coffer. Reading consumes it, requires a free hand and a capable reader outside combat, and rejects unresolved wounds or survival crises. It banks coins and pending treasure XP and opens a paired town passage. Returning restores the same floor: defeated/living creatures and their HP, seen tiles, coffer contents and XP claims. It places the company at that floor's entrance. This differs explicitly from Moria's deepest-visited-floor recall. It never heals, refills Grit, reverses death or rerolls the floor. The passage survives saves and is cleared by defeat.

## Feedback

Actual HP deltas produce red damage and green healing numbers above the recipient, alongside condition increases, reductions/clears and survival-state labels. Burning has rising flames, Dazed orbiting stars, Freezing ice, Bleeding droplets, Poison green wisps, and the other current HoL conditions have distinct persistent layers. Effects follow models and disappear as contributions expire; they are presentation, not extra damage or action rules.
