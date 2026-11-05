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
