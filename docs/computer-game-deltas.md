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
- NPC condition damage uses the upstream end plan in its defined order. Full simultaneous-condition ordering choices and hero wound effects remain pending.
- Tell a Worthy Story is excluded from new dungeon training for now; Forage Woodland and Speak with the Hearth have proposed exploration adaptations, not implemented replacements. No new custom card has been invented just to fill a button.
