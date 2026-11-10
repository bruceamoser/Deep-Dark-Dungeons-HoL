# Current adaptations — v0.6.0

## v0.6 discipline progression supersedes previous purchase rules

Bruce authorized a fresh ruleset and removal of compatibility obligations on November 6, 2026. The discipline atlas replaces staged DP purchases, mastery talents and fixed class signatures. Historical sections below describe earlier editions, not current progression.

- Creation starts at level 1 with three attribute points (0–2 per attribute), two ancestry traits, one class origin, one culture origin and one background origin. Class/culture/background grant rank I only. Duplicate origins grant 3 DP each.
- One nonexpiring budget: 8 DP initially plus 4 per trained level, capped at level 30. Additional discipline origins cost 3 DP from level 2. Rank II costs 2 DP and requires level 3/four invested path nodes; rank III costs 3 DP and requires level 7/nine invested path nodes.
- Each of the 18 disciplines has four circular paths. Minor nodes cost 1 DP; advanced nodes generally cost 2–3. Profile upgrades replace previous values. Weapon powers and melee reactions use the learned profile; an untrained melee reaction uses 1/1/1.
- A confluence requires every exact touching prerequisite. Two/three/four-discipline combinations cost 3/4/5 DP. Opening its border grants purchase eligibility, not a free ability. Refunds remove invalid dependents and return all their costs.
- Powers use the shared effect engine with action/supply/position costs, without encounter-use counters. Former discipline weapon techniques use learned weapon profiles; spells use explicitly reduced starting damage and node improvements. Field Care includes modest HP healing as well as stabilization and Bleeding removal. Wound procedures remain distinct.
- Base maximum HP is 14 + ancestry HP + Fortitude + ancestry/path benefits + one per two trained levels after level 1. Grit starts at 3 and gains one per six trained levels. Injuries continue to use the existing survival and wound engine; progression never heals current HP or refreshes spent Grit.
- Recipe path benefits can coexist: speed reductions multiply the remaining crafting time, with a five-minute floor. Recipe nodes with overlapping knowledge also grant stated HP, healing or carrying bonuses. Alchemical Insight discounts ingredient batches by 25%.
- Equipment comes from a chosen kit plus a 60-coin purse. Forge purchases do not mint additional weapons or supplies. Respec preserves actual possessions and exhausted stacks. All heroes speak Common; social-language purchases do not occupy the progression map.
- Far Walker grants +1 movement and +2 carrying capacity instead of extra DP per level. Other ancestry adaptations continue to use their explicit engine rules.
- Save version 2 intentionally requires fresh journeys. Older files remain on disk and are shown as preserved, incompatible journeys. New run creation never overwrites those files.


Bruce's November 6 direction supersedes the earlier ability-by-ability automation
approach: HoL supplies core mechanics, while powers are designed for this game.
The historical decisions below are retained as an audit trail; current coverage
is in [implementation status](implementation-status.md).

- New training: five starter powers plus one rank-2 and one rank-3 power per
  discipline, three signature choices at each class tier (1/3/7), six general game powers,
  ordinary basic actions, retained armor/general training, and three consumable
  actions. The four additional starter purchases cost 1/2/2/3 DP; these are
  deliberate game prices. Rank-1 powers remain legal in level-0 early training,
  but discipline purchases remain locked until level 1. Only original grant
  powers supply starting weapons; additional techniques do not duplicate gear.
  Recipe-only purchases cannot charge for already-known recipes/benefits. Legacy receipts stay immutable and map to current powers.
  Multiple source cards mapping to one power do not duplicate its effects.
- HP healing does not remove injuries. Normal treatment costs one field dressing
  and 60 minutes, or 15 coins minimum / five times Recovery in town. Exceptional
  care costs one restoration draught or 100 coins and 240 minutes. Trait time
  discounts apply. Wound count/scars and spent Grit persist. This simplification
  was explicitly requested; printed exceptional remedies are not gameplay gates.
- Recipe knowledge is independent of DP. Eleven recipes define tools, batches,
  location, time and full output/refill. Three basics are known; others are
  learned, found or power-granted. No repeatable free ingredient loop.
- Power buffs use the strongest matching positive and negative modifiers.
  Expiry follows the recipient's own turns, with a campaign-time ceiling for
  exploration. Instant areas spare allies; persistent surfaces affect both sides.
  Surface rounds are six campaign seconds. One-use traps fire once. Water
  extinguishes fire/Burning; smoke blocks distant sight; barriers block movement
  and projectiles. Magical light defeats darkness.
- An ally's bonus Maneuver is queued for their next turn retaining that category,
  without stacked queued grants. Resource-granting powers cost a Main Action.
  Reaction restoration requires an actually spent and retained Reaction.
- Cosmetic sex, ancestry mesh features, colors and body style have no bonuses.
  Appearance and equipped visual gear use one pipeline across creation/play.
  Cosmetic appearance can be changed at any time, including dungeon exploration
  and combat, without spending actions, time or other character resources.
- Tactical squares reflect game coordinates. Range overlays use actual weighted
  route costs and cannot end on allies. Deleting a named save removes only that
  run, including its own reserves/fallen history, after explicit confirmation.

The [v0.5 design](v0.5-gameplay-design.md) supersedes old encounter charge limits,
XP thresholds and deferred inventory dropping. It adds mastery, skill specializations,
three signatures per tier, unique relics, stacked conditions and combat combinations.
The historical sections below describe their original releases, not current limits.

---

# Computer-game adaptations — proposals

Bruce approved Linux/Windows, a four-character single-player party, real-time exploration with turn-based combat, a persistent town, recovery with roguelike new parties, stylized dark fantasy and free initial assets.

The following specific implementations are **untested game proposals**, not changes to canonical HoL:

- Greyhaven is a menu-based persistent expedition hub. Treasury survives expedition failure.
- Coffers contain 8–20 + twice depth coins; loot only enters the vault on extraction.
- Dungeon rooms/corridors use a campaign seed and depth. The initial generator has up to nine rooms. Subsequent depth currently changes layout and encounter count, not the complete danger/content curve.
- Nearby visible opposition triggers combat at seven squares; an encounter initially includes that room's group. Exploration stops before turn resolution.
- In exploration, companions attempt collision-safe travel to positions near the selected leader's destination. Tactical diagonal movement costs one, with blocked-corner prevention as a computer geometry rule.
- The initial opposition AI walks toward the nearest eligible hero and uses the published Bone Sentry Basic Melee defense table. Other creature abilities remain unimplemented.
- A proposed failed-company cache holds carried expedition coins at the failure location for a later company. Full resurrection, rescue and lost equipment policies remain to be designed.

No resting procedure may replenish spent Grit. No unavailable behavior may silently become a generic damage roll. Automated injury/condition integration is a release gate, not optional polish.

## Implemented playtest decisions in the second pass

Bruce explicitly approved curating, adapting, excluding and adding abilities for the computer game on November 5, 2026. Original source records stay immutable. The dungeon registry records its choices separately; no unreviewed card is inferred from flavor text. In particular, Basic Ranged and Braced Harness have flavor text that differs from their detailed rules, so adapters follow the detailed rules.

- The first hero in the chosen marching order leads exploration. Two by two, column, wedge and line reserve reachable destination slots; local pathfinding may break shape around obstacles. No party formation movement occurs in combat.
- The initial cleared-depth milestone proposal is superseded by the XP system below. HoL’s DP amounts, prerequisites, attribute rules and level-based Grit grants remain authoritative. A hero may hold earned levels until a supported signature/training choice is available.
- Combat uses normal walkable terrain. Crossing prone occupants and difficult terrain are not yet represented; the current movement implementation conservatively blocks occupied tiles. The Stand control costs the printed two movement squares.
- Readying equipment explicitly via the sheet costs a Maneuver in combat; it stows incompatible held gear. A weapon attack draws a carried weapon at no additional action cost when hands are available. Full dropping/retrieving and grip choices are pending.
- Sentry melee attacks are considered blockable for Shield Block. Reaction prompts pause until a player chooses. The AI does not yet exercise opportunity attacks, Fall to Pieces or other optional reactions; casts and stowing therefore do not currently trigger those attacks. That is an AI coverage limitation, not removal from canonical HoL.
- NPC and hero condition damage use the upstream end plan. The current dungeon ordering is Burning, Freezing, then Bleeding; separate events apply before temporary decay. Overlapping duration-only contributions expire independently. These are explicit computer-game adjudications.
- Tell a Worthy Story is excluded from new dungeon training for now; Forage Woodland and Speak with the Hearth have proposed exploration adaptations, not implemented replacements. No new custom card has been invented just to fill a button.

## Character command screen (November 5, 2026)

- C / I opens the character sheet. Equipment slots, a rotatable animated preview, searchable/filterable inventory, item inspection and Ready/Stow/Wear controls share the authoritative character inventory. World equipment uses the same model assembly.
- Proper stowing costs one Maneuver per item in combat. A one-handed weapon swap preserves a compatible shield; stowing sword and shield to ready a bow requires two Maneuvers (Main may convert). Standalone readiness with no stow also costs one Maneuver as a game timing decision. Costs are preflighted atomically. Armor changes are restricted to outside combat and require printed training; only one armor suit may be worn. This timing restriction is a computer-game adaptation.
- Up to eight supported actions may be favorited per hero, persisted in the campaign. The combat bar shows those actions, action categories and quick weapon controls. Keys 5–9 activate the first five favorites; 1–4 remain hero selection.
- Creation is an in-game eight-step screen, not an iframe. It covers attributes, languages, ancestry/borrowed traits, culture/background pairs, separate creation DP pools, class disciplines/signature, acquisition choices, recipe study, equipment and final validation. Creation preserves the full source catalog with coverage labels; unsupported cards do not gain invented effects.
- Training uses earned levels and the pinned advancement validator. Unsupported new dungeon abilities remain blocked. Draft creation choices persist locally until recruitment; committed training does not heal or restore spent Grit.

## Injury and recovery pass

- Wounds no longer enter a permanent integration pause. Their numerical movement/physical/mental penalties and typed conditions apply immediately. Wound notices pause further turns until acknowledged, and any wound displacement direction is explicitly chosen. All currently playable heroes use the humanoid wound entries; no anatomy skips are inferred from models.
- Forced movement applies highest printed Stability once per newly contacted actor, contact damage before the new Stability deduction, hard-obstacle damage (+1), rigid group displacement into separate legal cells and the original mover’s backward bounce where possible. This grid placement is the game’s explicit arrangement choice. Braced Harness and other forced-movement reactions still require adapters.
- Physical wound modifiers apply to Brawn/Fortitude/Agility actions and defense; mental modifiers apply to Guile/Knowledge/Reason. Death rolls receive applicable condition Banes rather than automatically inheriting wound activity penalties. Intimidation/persuasion modifiers and anatomical consequences beyond the typed effects remain reference-only until their interactions exist.
- Dazed/Grappled retain player-selected action categories at turn start. Helpless conditions prevent actions, movement and gear handling. Standing costs two available movement. Ongoing damaging conditions and Dying/Last Words keep the encounter running after the last enemy falls. Dead companions are withdrawn; a lost company reaches the existing recovery-cache/next-company loop.
- The six printed treatment capabilities use the pinned reserve/settle planners. Only a capable learned party healer may treat the matching wound in Greyhaven. Each attempt advances one explicit campaign hour and consumes that wound’s daily attempt across healers. Waiting advances to the next treatment day without granting HP, Grit or healing progress. Completing treatment removes its typed persistent penalties, not scar count or missing anatomy.
- Lesser/greater/superior healing bottles use fixed printed healing, a free giver hand, Maneuver and conscious ally Reaction in combat, adjacency and a d4 check after healing. Last Words/dead recipients are rejected. The last supply use still heals.
- Added Drain Warmth, Rim Strike, Blade in the Back (adjacent-companion setup), Sap and Breath, Shared Breath, Mercy in the Light, Relieve Poison, Rouse the Senses and Mend. Healing uses its upfront HP cost, free hand, Life resistance and source condition reductions. Mend rejects Dying and permits standing on Strong. The current healing target roster is the living company; healing-harmed NPCs and unnoticed-target setup await authored creature/stealth support.
- Quiet safe breaths restore HP for living active/stable companions, including wounded heroes, without removing wounds or refreshing Grit. Old saved wound pauses migrate without adding another scar or rerolling the injury.

## Party passage and turn presentation — November 5

Bruce requested that heroes can move past allies in this desktop game. The book's `06-playing.md` section “Distance, space and cover” normally prohibits traversing standing occupants and prices prone occupied squares at 2 movement, with an empty endpoint required. This implementation explicitly adapts the standing-occupant rule: capable, willing party members yield for passage at the normal terrain cost. Standing enemies and incapable standing companions still block; prone occupants and difficult terrain cost 2, and all destinations must be empty. Source files remain unchanged. Shortest combat routes account for these costs, while visual waypoints show passage without leaving stacked heroes in saved state.

Exploration commits companion endpoints together, including cycles where companions exchange places. This prevents formation waits from becoming permanent around treasure or in narrow routes. A blocked route clears with feedback instead of leaving movement stuck. No extra coins or movement allowance is granted.

The next available player-side turn suggests the next eligible hero after the last hero who acted, wrapping the company order at a new round. Players may still choose an eligible participant before committing the turn. This is a UI selection policy; the existing alternating-side encounter procedures are unchanged. Selecting an action is now a reversible targeting state. Self actions require confirmation, and selecting another action, selecting the same action again, Cancel or Escape can leave targeting before any cost is paid.

World-object interactions now replace automatic treasure collection. Coffers, lost-expedition caches and stairs have pointer highlights and Inspect/Approach/Collect/Recover/travel/Leave menus as appropriate. Approach moves the company and reopens the menu without collecting anything. Treasure requires an adjacent capable companion and exploration mode; stairs retain the existing company-gathering checks. This is a computer-game interaction policy, not a new HoL combat action. Arbitrary dropped equipment and container inventories are not implemented by this menu pass.

## Persistent heroes and experience — November 5

Bruce approved mixed exploration, encounter and recovered-treasure XP, shared equally among surviving expedition members, with training in town. The book's `design/development.md` delegates milestone levels to the DA; this XP schedule replaces only that award decision. The existing source advancement validator still determines DP, Grit, prerequisites and signatures. XP does not immediately change attributes, heal HP, restore Grit or purchase abilities.

Initial balance values (computer-game rules, subject to playtesting):

| Event | XP per living party member |
| --- | --- |
| First entry into a new chamber, excluding the arrival room | 60 + 10 × (depth − 1) |
| Completed encounter | 100 + 20 × (depth − 1) per defeated sentry |
| Newly looted coffer coins returned to Greyhaven | 5 per coin |

Reserve heroes earn no expedition XP. A conscious/active status is required to discover a room, but living incapacitated companions share the reward. Encounter awards wait until the encounter and ongoing survival/harm procedures are resolved. Discovery and encounter XP are retained as earned; coffer XP remains pending until extraction and is lost on defeat. Recovery caches never grant XP again. Claims are saved per generated floor, preventing repeated events, re-entry or save reload from duplicating rewards. Regenerating a floor after a defeated expedition creates a new set of discoveries and encounters.

Level 2 requires 1,000 cumulative XP. Advancing from level L to L+1 costs 1,000 + 250 × (L − 1). The cumulative threshold for level N is 1,000 × (N − 1) + 125 × (N − 1) × (N − 2), capped at source level 100. These values aim to make several rooms plus treasure worth roughly an early level; no long-term balance claim is established. Missing higher-level signature adapters still gate training as documented elsewhere.

Created heroes receive permanent identities independent of their current party slots. A living hero swapped out of the company remains in reserve with the same inventory, survival state, wounds, favorites, XP and progression. Completed characters are saved before returning to the roster. Startup loads the existing campaign rather than replacing it with examples. Legacy earned levels migrate to their minimum XP thresholds without losing committed training. Old expedition memorial entries remain stored; they do not become invented individual death records.

Only the source survival status `dead` creates a Hall entry. Dying, Stable and Last Words remain distinct and do not mark a hero fallen early. Each final death is recorded once, with a snapshot of the hero, last depth, expedition and last recorded harm. Fallen heroes cannot be assigned from the repository. After defeat, surviving heroes and reserves remain available; the game no longer creates a replacement party from copies of the published examples. This keeps the existing proposed retreat/recovery loop without granting healing or reversing death.

## Book encounters, equipment and town economy

The earlier Bone-Sentry-only AI and shopping limitations are superseded by [encounters-and-treasure.md](encounters-and-treasure.md): 58 source creatures, party/depth CV budgets, fifth-floor guardians, generated slotted equipment, discipline-gated magical effects, six merchants and paired return scrolls. That document records the exact automated subset and remaining creature-rule gaps. Creature portraits, models and family names grant no unprinted traits. Encounter XP now sums `round(CV / 8 × (100 + 20 × (depth − 1)))` for defeated creatures; legacy sentries without stored CV default to 8. This retains the original sentry award while accounting for the broader roster.

## Independent saved journeys

A run is a complete independent campaign timeline, including its active and reserve heroes, Hall, progression, market, return passage and current dungeon/combat state. Save copies fork that timeline; they do not share a global roster or resurrect a hero within an existing run. Continuing any slot makes it the autosaved active run. New run uses the four published examples as a starting company; new character creation itself remains blank. Players may replace the examples through the register.

Opening Runs pauses movement and cancels the scheduled opposition timer before saving. Save & exit returns to the library, retaining the actual exploration/combat/survival state. Resume restores the acting hero, budgets, pending movement, pending defense and wound decisions. This pause/save policy is a computer-game convenience, not an in-world retreat or rest. An OS window close saves the active run before closing. Legacy `campaign.json` is copied into a named slot on first use and retained untouched for backup.

## v0.3.0 curation and expedition rules

Bruce delegated cut/fix/replace decisions. This section supersedes earlier pending-signature, opportunity, darkness and crafting notes above. Every one of the 427 source cards has a roster decision: 205 included, 222 retired. All 90 class signatures remain selectable. All 50 ancestry traits have an explicit game description. The coverage manifest preserves source hashes and per-card decisions. Source rules are never overwritten.

Signature replacements preserve class roles: Arcanist ranged magic/wards; Blade weapon pressure/counters; Intellect reconnaissance/openings; Leader allied positioning/morale; Odd misdirection; Protector interception; Shadow pursuit control; Shepherd healing/condition relief; Unbalanced force/risk; Warden tracking/ranged pressure. Summon origin gifts resolve immediate effects rather than adding uncontrolled units. Social and language gifts become morale, misdirection or reconnaissance. Large-area, vertical, water, unrestricted illusion, dialogue and autonomous-companion systems are cut from the purchasable roster. These are design decisions for this game, not assertions about tabletop usefulness.

Tactical buffs of the same category use the strongest benefit and strongest penalty, not additive stacking. Next-attack bonuses expire on use; other buffs last through the recipient's next turn (self effects last the current turn, except prepared counters, which remain through the next own turn). Interception takes the already-mitigated damage, spends the protector's Reaction while adjacent, and uses normal wound procedures. Prepared ripostes automatically spend a Reaction after an adjacent physical attack while capable with a melee weapon. Last-stand wards prevent one lethal hit from dropping an active recipient below 1 HP; they neither revive Dying heroes nor heal wounds. Explicit per-encounter abilities reset on entering a new encounter. Survey actions reveal floor/container locations, never creature identities through darkness.

Ancestry daily Boons must be prepared on the sheet and consume only on eligible rolls. Human borrowed traits use the same implementation. Oath rerolls replace the result, cost HP and cap all healing/recovery until the next 06:00 dawn. Earth sensing is limited to grounded creatures on connected stone, with a clear attack path still required. Lighting has bright, dim (1 Bane), very dim (2) and barely lit (3) bands. Low-light ratings reduce only lighting Banes. No creature is revealed by the one-square navigation silhouette. Rubble/low passages cost two movement; appropriate ancestry traits remove the terrain surcharge, not a prone occupant surcharge.

Exploration advances ten seconds per committed party step, combat six seconds per completed round, crafting/treatment their listed time. After 16 hours awake, fatigue adds one Bane, increasing every four hours to three (Tallfolk endurance starts at 20). Hunger/thirst each add a Bane; the combined needs penalty caps at three. Once per 24 hours each living active hero automatically uses/checks carried food and water while travelling or after downtime. Water flasks gain a d6 in this adaptation; town refills are free. A final exhausted use still feeds/hydrates the hero. Eight hours of sleep clears fatigue only; partial sleep persists until interrupted by waking activity. The legacy dungeon sleep command is replaced by the duty-based camp planner below; its old flat hourly ambush rule is retired. Sleep never heals wounds or restores Grit.

Torches use lighting-bundle d6 supplies and occupy a free hand. One supply roll occurs per 30 minutes actually burning, preserving partial burn time while automatically doused in lit areas. Lantern in the Palm requires a free hand to cast, then leaves hands free; it expires on changing floors. Holding a torch is included in weapon/gear/potion free-hand checks. Exhausted supplies produce persistent queued notices.

Matching carried ammunition and other consumable bundles can be combined outside combat into one inventory entry. This is an inventory convenience: the active die and every remaining reserve die are preserved and consumed in sequence, not added or promoted to a larger die. Exhausting one pool automatically starts the next; the final exhausted use still takes effect. Original bulk and bundle quantities remain unchanged. Empty bundles and different products or crafting-material types cannot be combined. The combined entry retains its remaining dice through save/load, transfer, dropping and recovery.

Crafting supports six usable recipe outputs. Each attempt requires the learned permission/recipe, carried tools (except Human improvisation in town), a compatible named material supply and an hour. Ordinary materials cost 12 coins/d6; healing ingredients cost 80/d6. One material check follows each attempt. New supplies/progress use the pinned workshop procedures. Generic recipe choices show only usable outputs. Field harvesting is a replacement for environment-specific foraging: one finite edible patch per generated floor, one hour, Knowledge 1/2/3 supply steps up to d8. Regenerating a floor after an expedition creates a new patch; returning to a saved floor does not.

Legacy retired purchases can be replaced in Greyhaven at the same original DP cost and stage, subject to full source validation. Existing acquired possessions are retained with their actual supply states. Source acquisition options that need new manual choices are not offered by the quick retraining selector. The original purchase remains intact until an explicit valid replacement is committed; there is no silent XP/DP loss.

When a movement step passes through yielding companions, the existing atomic passage policy keeps saved endpoints unoccupied. Opportunities are evaluated over that step's intermediate route before committing its destination; a disabling hit cancels that entire pending step. This is an explicit compromise for atomic party passage, rather than saving a hero stacked on a companion mid-strike.


## v0.5.1 — full town respec

Bruce requested a button to restart character development from the beginning.
Free respec in Greyhaven is a computer-game adaptation, not a source-book rule.
It replaces attributes, ancestry/traits, origins, class, disciplines, signatures
and all DP purchases through the current trained level. The complete creation
and advancement validators still apply, including the level-0 discipline lock,
creation DP expiration and signature tiers. Only the current playable catalog
can be committed. Earned but untrained levels remain available for later training.

The same hero keeps identity, name/appearance unless edited, XP/history, learned
recipe book/materials, owned equipment, current supplies, wounds/conditions and
expedition needs. Mastery and specializations reset to unspent points. Current HP
never rises from respec; maximum HP retains existing wound-related reductions.
A saved spent-Grit count prevents switching through a lower-Grit build from
restoring spent Grit. Rebuild does not reset time, fatigue, hunger or thirst.
Temporary positive build effects/prepared tactics are cleared; penalties remain.

All currently owned creation possessions become portable inventory receipts.
Old receipts and replacement grants are suppressed; there is no new creation
purse, shopping, duplicated grant equipment or replenished supplies. Armor is
unequipped if its proficiency is absent. This keeps the current loadout while
allowing purchases and later advancement to use the new build. Unfinished drafts
are local, separate from recruitment and tied to hero identity. The campaign
changes only after a valid final confirmation; the old build remains otherwise.

## Greyhaven town presentation

Greyhaven uses a separate street graph and town coordinates for walking to
services. This does not replace the dungeon's square grid or move heroes inside
a suspended floor. Selecting a building or its hotkey walks the whole company
to the entrance before opening the existing service; character-screen training,
respec and infirmary requests use the same arrival requirement. Town walking is
presentation time and grants no healing, Grit, XP or recovery. Services retain
their existing costs, time and source-rule behavior. Trips pause under modals,
can be cancelled/redirected, and reset on floor/run loading. No new save schema
is required; town presentation restarts at the central street on load.

## November 8 carrying-weight playtest

Bruce requested fractional Bulk to make useful expedition supplies practical. Capacity remains 10 + 3 × Brawn plus earned bonuses. Food, ammunition, lighting, water and material bundles weigh 0.5 Bulk; small bottles, dressings, charms, writing gear and other pocket supplies weigh 0.25. Weapons, armor and large tools retain their existing weights. The game-owned table is `src/core/bulk.mjs`; source-book records remain unchanged. Combined bundles retain their total weight and remaining supply dice. Loading rebuilds item weights and cached ordinary merchant stock without refilling supplies. Any excess over capacity rounds up to a whole movement penalty so fractional weight never produces fractional tactical movement.

## November 8 dungeon camp

Safe Breath's immediate full-HP recovery is removed from the computer game. Dungeon camp uses at least eight one-hour periods, up to 96 hours. Each of four party slots works twice per repeating eight-hour rota, leaving six hours asleep. Sleep restores 2 HP/hour up to available maximum HP, clears fatigue after six hours asleep, and never restores Grit or removes injuries. Town sleep retains its eight-hour fatigue requirement and also heals 2 HP/hour.

Workers keep watch. Dedicated Guard adds one Boon to a Reason detection check. Location fierceness sets the wandering-creature chance, including cleared floors; Leaf Listener halves the hourly hazard, and a sleeping hero's wakeful Reverie retains its warning benefit. A detected approach gives the party the opening; an ambush gives opposition the opening. Completed hours and partial recovery persist through interruption and save/reload. Empty/dead party slots leave their periods unguarded.

Foraging makes at most three successful material finds per floor, with Knowledge determining success. Arrow/torch work uses shared craft tools and compatible ingredient batches; cooking uses edible ingredients. Water gathering fills carried flasks only within three squares and line of sight of an underground well. Material requirements, output caps and failed duties are shown before the camp starts. Camp duties consume the hour already scheduled; they do not advance the clock twice.

Bruce requested healing care at +4 HP per learned HP-healing skill for each working hour spent tending one chosen companion. HP-healing spells, field skills and healing-field skills count once each; supplies and profile upgrades do not count as extra skills. One Field Dressing supply check is required per care hour; no usable dressings means no boost. Sleep and care healing remain separate from wound recovery and respect unavailable HP.

Ordinary camp wound care requires an HP-healing skill or the matching treatment skill, a field dressing check, and a selected patient/wound. An HP-healing skill authorizes the matching typed treatment card for camp only. The pinned treatment planner supplies the recovery roll, 1/2/3 progress and receipt; every wound permits one attempt per campaign day across all healers and save/reload. Severe injuries still require a restoration draught and the existing 240-minute care time, with trait discounts; one reserved supply and partial care persist across camps. Scars and wound history remain. Existing care interfaces also honor a camp attempt's daily lock.

The camp UI shows current and projected HP, wound progress and company supplies. Forecasts run isolated copies through worst/best supply and recovery outcomes, without live state changes. Ranges assume a completed camp, with possible successful/failed foraging and no wandering interruption; actual outcomes may vary. The animated background uses existing KayKit scenery and the party's actual modular character models; the compact planner keeps duties and forecasts together.

## November 8 supply growth and travel cadence

Bruce superseded sequential reserve-die pooling with a single growing supply die. Combining matching nonempty supplies raises the larger die by exactly one step: d4 → d6 → d8 → d10 → d12 → d20. For example d4+d6 becomes d8, and d8+d8 becomes d10. A d20 supply stays at the cap; the UI keeps further components separate rather than discarding them. Purchased/recipe output caps still describe one normal batch. Combining can exceed those caps. Carried Bulk and original bundle quantity are preserved. Old saved reserve dice fold once through this growth rule, with exhausted components ignored, including floor caches and reserves. Grown potion supplies retain the pinned potion action/healing plan and use the game's supply check at their actual current die.

Resource checks now follow actual dungeon movement plus stationary dungeon work/camp hours. One company step is one completed square of company movement (including combat movement), not one step per hero; blocked routes and town travel do not count. Water checks every 40 company steps, food every 80, and each burning torch checks every 25. Doused torches preserve their movement interval. During camp/stationary work, water checks every two hours and food every four. One shared campfire fuel supply checks each camp hour; no fuel/magical light means a dark camp and one Bane to watch. Stationary burning torches check hourly. The final use satisfies the current need; a later missed food/water check immediately creates hunger/thirst penalties until supplies are available. Save/load preserves all progress and does not repeat a check. Daily provisions remain a fallback for long time advances.

Camp forecasts now include these checks, show current and projected stock plus the next movement/rest thresholds, and dim the animated fire when fuel is unavailable. Wandering camp encounters begin even if darkness prevents ordinary visual detection. Ordinary water flasks expose their game-owned d6 supply to the same combine/use interface, and refilling never reduces an already larger supply.

Wound and restoration supplies also use their current supply die after a successful dose. A reserved multi-hour restoration treatment checks the dose once at the start, then retains its receipt across later care hours and camps. Combining supplies therefore never makes one ordinary use discard an entire enlarged pool.

## November 8 general d100 foraging

Bruce replaced targeted foraging with one general Forage duty, usually yielding one resource or nothing. Baseline d100 bands are 1–8 water (8%), 9–20 wood/fuel (12%), 21–34 food ingredients (14%), 35–44 fletching materials (10%), 45–50 medicinal materials (6%), and 51–100 nothing (50%). Each successful material find adds one compatible recipe batch; water discovers a nearby gatherable source and can fill one depleted flask. There is no three-find floor cap. Time, provisions and wandering-creature risk provide the cost.

Field Replenishment expands water/wood/food/fletching by 4/4/6/4 percentage points. Forager Remedies adds 12 medicinal and 3 food points. Field Artisan adds 5 wood and 5 fletching points; salvage adds 3 to each. Dressing-recipe knowledge adds 3 medicinal points when not already included in Forager Remedies. Each learned HP-healing skill adds 2 medicinal points, capped at 6. Bonuses take space from the empty band; if combined bonuses exceed 35 points, scale only bonuses proportionally, preserving at least 15% nothing. The UI lists each hero's actual bands and relevant training.

Medicinal finds supply the field-dressing recipe. Make dressings is a camp duty requiring that recipe and one compatible batch; it makes/refills d4 dressings without advancing an extra hour. Old targeted forage choices migrate to the general task. Paused camp duties/patients can change for future periods while completed hours, healing and rewards remain intact.

Forecasts run an empty/weak/depleting scenario and successful scenarios for each possible resource with favorable treatment/supply checks. HP and each supply category display their corresponding range; different category maxima need not occur together. Actual foraging still rolls once on the hero's d100 table and grants at most one find.

### Direct exploration interactions (#83)

A normal chest/cache click approaches and opens or recovers it on arrival;
remaining items open their distribution screen. Stair clicks approach with the
company and show the travel confirmation without changing floors automatically.
Shift-click retains Inspect and the explicit object menu. Escape or another
movement order cancels the approach; combat detection clears it immediately.
Arrival rechecks availability, range and guardian restrictions.

### Location fierceness (#85)

Seven persistent room ratings show **Creatures in the area** from Very low
through Very high on a green-to-red scale. Base eight-hour interruption chances
are 2%, 5%, 10%, 18%, 28%, 38%, and 50%. Corridors inherit the nearest room's
rating with a Low minimum. Entrance rooms start Very low; other room ratings
are derived from a separate seeded stream and saved without changing floor
layout. Existing saves receive the same deterministic ratings on first use.

Hourly hazard is `1 - (1 - eightHourRisk)^(1/8)`; longer camps accumulate that
hazard rather than repeating a full-camp chance each hour. A camp stores its
location rating. Encounter rolls have their own seeded stream, independent of
duty random draws, and resume at the saved next hour. The planner displays the
cumulative remaining risk, including ancestry warnings. Guard still improves
ambush detection rather than preventing encounters.

### Action shortcuts and descriptions (#84)

Every character sheet and the combat bar open a dedicated shortcut manager.
Each hero has eight ordered shortcuts on 5, 6, 7, 8, 9, 0, minus and equals;
1–4 continue to select heroes. Add/remove/reorder and companion switching cost
no game time or actions, save immediately and reject unlearned/duplicate entries.
Search and action-cost filters browse learned actions with expandable rules.

Hovering or focusing an action-bar slot shows the effective power profile,
range, cost, effects, equipment/supply needs, applicable damage bonuses and
current availability. Disabled slots remain focusable for their explanation.
Descriptions read current compiled powers and never consume attack buffs or
mutate a target; target resistance and conditional bonuses are stated separately.

## November 9 camp resource preservation and water capacity

Bruce explicitly superseded camp provision costs: resting in dungeon camp or town sleep does not consume food, water or lighting supplies. Movement and non-camp downtime costs remain unchanged. Camp hours do not advance provision intervals or daily food/water ages, so resuming does not charge a deferred camp cost. Existing unmet needs are retained; rest does not create supplies or erase pre-existing hunger/thirst. Task-specific crafting materials and medical supplies still apply. A campfire remains as initially available without hourly fuel checks.

New ordinary/starting water flasks and well/gather/forage refills use d8. Existing partially depleted flasks retain their current amounts until refilled; larger combined pools are not reduced. Source rules files remain untouched.

Foraging odds remain the November 8 bands and training modifiers, internal to the engine. Player-facing camp text reports outcomes rather than dice/bands/percentages. Store cards show each hero's current qualitative stocks and possible gains, task choices show injured-only expected HP healing, and explicit saved camp order is independent of combat formation.

## November 9 discipline foraging competence

Each effective rank I–III adds a small personal bonus: Wilderness +1 point each to water/wood/food; Craft +1 each to wood/fletching; Medicine +1 to medicinal materials. Starting origins count immediately. Relevant abilities retain their larger existing bonuses and stack with these benefits under the existing 85% total find cap. Unrelated disciplines grant no forage bonus. This supersedes the previous absence of discipline-only forage effects. Descriptions remain qualitative in player UI.

## November 9 tactical creature decisions

Identity-driven combat goals replace nearest-target-only behavior. All printed main entries are considered, including third attacks and printed nonconsecutive-turn limits. Creature maneuvers, weighted positioning, taunts, visible targets, legal reaction exemptions, ally support and cone friendly fire now affect decisions. Printed statistics and encounter CV are unchanged. Creature action messages are plain outcomes. Game-owned Main Action Break free and Clear caltrops provide counterplay to maintained wolf holds and persistent caltrops. See [creature AI](creature-ai.md) for exact coverage, perception constraints, NPC collateral adaptation and intentional omissions. This supersedes the old first-specialty/Study-or-Defend AI policy.

## November 9 player movement consent

Fire and harmful magical traps require explicit player consent before normal movement, coordinated party approaches, walking powers, swaps or dangerous landings commit their costs. Leaps/teleports inspect the landing rather than skipped ground. Confirmation covers only the reviewed field/cell/hero combinations. Newly encountered hazards pause remaining travel, and resuming an already-paid route does not pay again. Saved routes are rechecked after load; no silent consent is persisted. Forced enemy displacement retains its existing rules.

## November 9 diagonal occupancy

A single actor in a side square no longer turns a one-point diagonal into a two-step detour. The destination must remain free, both blocked side squares close the gap, and either solid wall/obstacle corner still blocks diagonal passage. Difficult terrain costs remain unchanged. This refines the original geometry adaptation without adding free movement or changing opportunity reach.

## November 9 creature self-preservation

Hazard escape precedes attack positioning; safe detours remain within the creature’s actual movement allowance and preserve opportunity attacks. Burning creatures can seek water. The universal Main action to reduce temporary Burning/Freezing/Bleeding by one is explicitly adapted to NPC self/adjacent same-group ally care. It grants no HP or starred-condition removal. Current 58 encounter cards have no allied HP-healing ability, so none is invented. Printed support and life-taking limits remain intact; see [creature AI](creature-ai.md).

## November 9 direct restocking and shared ingredients

Bruce approved the simpler supplies model. Everyday supplies remain individual die-based carried items, while one party screen handles coin restocking in Greyhaven and targeted deterministic camp projects. Preparation steps cost 1/1/2/3/5/8 units along Empty→d4→d6→d8→d10→d12→d20; specialists can improve multiple affordable tiers per duty. Food/crafting/medicinal ingredient units are shared from carried inventory, with real Bulk and automatic procurement discounts. Maker’s Gift retains its once-per-day material-preservation receipt. Later duty previews account for earlier ingredient spending and distinguish uncertain foraging. Old ingredient value and Bulk migrate once, while depletion, one-step combination and special medical/resting procedures remain. This supersedes prepared recipe batches and flat normal-die camp replenishment for everyday supplies. Detailed prices, save policy and exceptions are in [supplies](supplies.md); source books stay unchanged.
