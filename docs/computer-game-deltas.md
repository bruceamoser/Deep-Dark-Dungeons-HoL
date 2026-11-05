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
- Returning alive after fully clearing a previously uncredited depth earns one level, up to the source maximum of 100. This award schedule is a proposed computer-game rule. HoL’s DP amounts, prerequisites, attribute rules and level-based Grit grants remain authoritative. A hero may hold earned levels until a supported signature/training choice is available.
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
