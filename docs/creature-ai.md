# Creature combat behavior

The 58 dungeon creatures keep their pinned book statistics, damage profiles and encounter CV. AI decisions are computer-game adaptations. They are not a claim that encounter balance is finished: abilities and coordination make existing opponents more effective, so further balance should use the new behavior as its baseline.

## Goals

| Behavior | Examples | Decisions |
| --- | --- | --- |
| Pack | Wolves, dire wolves, scrappers, outriders | Prefer a shared quarry, isolation and allies already in melee; circle when legally available. |
| Duelist | Masked duelist, skeleton champion, death knight | Prefer separate opponents and maintain a personal engagement. |
| Guardian | Sentries, armor, shieldguards, wardens | Screen vulnerable ranged allies and favor ground near their original post. |
| Hunter | Spider, ghoul, ghast, shadow, wraith, devil | Prefer isolated/wounded targets and useful disabling attacks. |
| Skirmisher | Bandit, imp, scouts, goblin boss, marshal | Prefer exposed opponents and avoid being surrounded. |
| Support | Warcaller, rattlechanter | Relieve a hearing ally's Dazed/Frightened condition while maintaining attack pressure. |
| Controller | Winter wolf, smoke-slinger, trapkeeper, cultist, tomb sage | Spread useful disruption and shape approach routes; consider friendly fire. |
| Ranged | Archers and other ranged casters | Seek clear shots and separation; physical archers favor visibly lighter armor. |
| Bruiser | Remaining close-combat creatures | Close with a visible foe and choose a useful printed attack. |

Profiles are assigned by creature identity; otherwise printed attack reach supplies the ranged/bruiser fallback. The bestiary describes goals without displaying weights or decision formulas.

## Rules and action coverage

All **120 Main Action entries** across all 58 cards are exposed to selection, including the previously ignored third attacks. Ammo-empty attacks are unavailable; printed nonconsecutive-turn limits are tracked even on a successful defense. A disabling rider is less attractive when already applied. Ordinary actions retain their source damage, range, type, defense and status effects. Opportunity strikes use that creature's printed Basic Melee, not a shared fixed damage profile.

Rime breath uses the printed three-row 1/3/5 cone. Every affected hero defends separately; NPC allies are also affected. NPC collateral uses the same defense classification with its printed defense attribute, conditions/Threat modifiers, resistances and weaknesses. The AI penalizes friendly casualties; it gains no friendly-fire exclusion.

Combat maneuvers include Defend, Study the Opening, Stoke the Core, Scatter Embers, Grave Stench, Rattle of the Grave, Shoulder Through, Keep the Rhythm, Make Room, Shed the Grasp, planted Stability, lighting, smoke, caltrops and difficult ground. Maneuvers execute at most once per retained category. Make Room spends the recipient's Reaction and chooses a legal nonprovoking route rather than silently ignoring reactions.

Mobility supports Roll Away, Stalking Step, Measured Step, Wind Step, Tunnel Scamper, Shambling Advance, Circle the Prey, Slip Through Shadow and conditionally Silken Scuttle. Straight lines, reach, occupancy, terrain and the printed opportunity exemptions constrain each. One-opponent exemptions leave other melee opponents able to react. Stalking requires cover/concealment; dark movement requires darkness; Silken Scuttle requires supported web-marked tiles (ordinary generated maps currently do not supply these). The AI falls back to another legal maneuver when a requirement is absent. It does not gain free generic movement or summon helpers.

Read the Blood Trail can direct a search toward the nearest bleeding creature without granting an unseen attack target. Cosmetic Change Guise does not change statistics and is not spent as a fake combat buff. Become Still is not preferred over the stronger available Defend; no additional stacking defensive bonus is invented. These are intentional selection policies, not claims that every narrative ability needs use every round. Unchanged reaction adapters remain in `bestiary.mjs`; this is not a full new implementation of every printed reaction.

## Self-preservation and care

Harmful fire/trap fields take priority over maintaining an attack position. Creatures seek safe reachable endpoints, or progress toward an exit when a field is too wide to leave this turn. A budgeted search retains safer detours without granting extra movement. Ordinary travel, printed mobility maneuvers, ally Make Room and blood-trail movement avoid hazardous routes; normal opportunities still apply unless a printed maneuver exempts them. Burning creatures favor reachable water and use the normal water-contact extinguishing rule. Resistance, weakness and Burning immunity inform danger estimates.

The player’s universal Reduce a condition Main action now has an explicit NPC adaptation: capable creatures can reduce temporary Burning, Freezing or Bleeding by one on themselves or an adjacent ally in the same group. Urgent adjacent ally care happens before moving away to attack. Aid spends the Main action, preserves starred sources and does not grant HP, Grit or wound treatment. Minor nonlethal conditions may yield to an immediate attack. Printed support chooses conditions it can actually reduce, including Frightened when Dazed comes only from a starred source.

Audit of all 58 current encounter cards found **no allied HP-healing ability**. Keep the Rhythm relieves Dazed/Frightened; vampire spawn's Famished bite restores only its own HP under its printed transfer limits. No creature gains an unprinted healing spell or a new encounter role from this change.

## Counterplay and saves

Wolf Pinning Bite creates paired maintained Grappled contributions. Its own contribution does not repeatedly stack. Separation, holder incapacity/death or a hero's **Break free** Main Action ends the paired hold. Break free is a game-owned deterministic escape option, not an assertion about the tabletop escape procedure.

Smoke and temporary fields clear at the owner's next turn (or death); once-scene maneuvers retain their used marker. Caltrops remain difficult ground until **Clear caltrops**, a Main Action on the same/adjacent square, removes the patch. These actions are available through the combat Actions menu and can be favorited.

Target commitment, attack history, once-scene use, guard post and paused maneuver state are saved and validated. Existing saves without tactical state are accepted. A new encounter resets scene limits. Normal movement uses weighted terrain and actual occupied squares; routes are shown as movement waypoints. Damage and forced movement still use the existing rules paths. Conditions, hidden status, walls, taunts and opportunity interruptions constrain decisions. No AI difficulty bonuses, stat inflation or encounter-budget changes were added.

## Verification

Unit scenarios cover the entire roster/action list, coordination and duel targets, visibility/taunts, spacing and movement budgets, ammo/cooldowns, support, terrain lifetimes, mobility reaction exemptions, holds/escape, friendly fire, incapacity, safe detours within budget, hazard escape without a visible target, water extinguishing, paid ally condition care, and saved/corrupt tactical state. Native desktop checks exercise actual enemy turns, paid escape/terrain clearing, ranged movement/fire, support, alternating control attacks, and the complete bestiary display with isolated saves.
