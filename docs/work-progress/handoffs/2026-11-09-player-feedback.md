# Player feedback after v0.8.6

Tracking issue #127; branch codex/127-player-feedback; base 074eff81b3bccd79d24d03ad4585490ce0559724. Investigation only, no gameplay changes yet.

Nine requested items: switch heroes before spending a turn; Speed/DR beside Grit; hovered walking route with damaging squares/opportunity attacks shown; simple probabilistic camp tasks; better creature meshes from full KayKit/Dungeon Mason inventory; collaboratively agree equipment affixes; difficulty setting; slower XP; archery area arrows.

Confirmed: Game.select in src/core/game.mjs:1607 immediately begins selected hero and refuses changing encounter.current. Hero HUD selection also needs audit; do not just bypass the core guard. Need separate reversible selection from turn-start effects/commitment, preserve statuses/reactions/save integrity. HUD vitals in src/main.mjs around624 currently shows only HP/Grit. Impact is an invented wall-collision bonus in treasure affix Ram’s, signature builds and Forge; explain/agree replacement with Bruce before changing equipment rules.

Pending async questions: simplify camp with automatic materials/recipients vs remove ingredient management; familiar equipment bonuses and exclusions; desired level at depth3 and area arrows as consumables/abilities. Continue independent combat/route/HUD and asset inventory work while awaiting answers. Image1 referenced but no attachment available in latest message; infer Speed/DR belongs beside party-card Grit unless clarified.

Next: create focused child issues then each issue→branch→PR→author review/checks→merge. No fixes or release claimed. Preserve private exports/untracked Borin prototypes, installed game and real saves. Full previous release is verified in v086 handoff. Source book/Foundry untouched. Do not spawn agents unless explicitly authorized.

## Accepted decisions and first fix

Bruce confirmed no required ingredients for basic camp duties; hidden success chances use training; recipients automatic with manual override. Equipment discussion explicitly deferred until other work is resolved. Progression targets level2/depth4, level3/depth7, level4/depth11, preserving earned levels; difficulty independent. Area-arrow delivery choice remains unspecified.

Child issue #128 / branch codex/128-turn-selection: removed immediate beginHero from selection; action/movement commitment already starts the turn. Added regression for switching with no turn-start effects and locking after spending. Needs focused tests and native UI qualification before PR/review/merge. All other feedback remains pending.

2026-11-10: #128 native selection, hazard/diagonal movement, combat controls and reactive counters pass. The combined selected-check sequence reached save-slots after prior fixture removed enemies, so its encounter setup had no enemy; rerunning save-slots on a fresh isolated profile. Code CI passes 332 tests. Added actual pointer selection coverage. Next issues: #130 HUD, #131 route risks, #132 camp, #133 creature visuals, #134 difficulty, #135 progression, #136 area archery. Equipment discussion remains last.

#128 completed in PR129 with passing latest-head CI and isolated native saves. #130 adds current Speed/physical DR to party-card vitals, wrapping for compact widths; desktop coverage checks values for all four heroes.
