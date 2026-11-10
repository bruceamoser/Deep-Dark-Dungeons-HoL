# Player feedback after v0.8.6

Tracking issue #127; branch codex/127-player-feedback; base 074eff81b3bccd79d24d03ad4585490ce0559724. Investigation only, no gameplay changes yet.

Nine requested items: switch heroes before spending a turn; Speed/DR beside Grit; hovered walking route with damaging squares/opportunity attacks shown; simple probabilistic camp tasks; better creature meshes from full KayKit/Dungeon Mason inventory; collaboratively agree equipment affixes; difficulty setting; slower XP; archery area arrows.

Confirmed: Game.select in src/core/game.mjs:1607 immediately begins selected hero and refuses changing encounter.current. Hero HUD selection also needs audit; do not just bypass the core guard. Need separate reversible selection from turn-start effects/commitment, preserve statuses/reactions/save integrity. HUD vitals in src/main.mjs around624 currently shows only HP/Grit. Impact is an invented wall-collision bonus in treasure affix Ram’s, signature builds and Forge; explain/agree replacement with Bruce before changing equipment rules.

Pending async questions: simplify camp with automatic materials/recipients vs remove ingredient management; familiar equipment bonuses and exclusions; desired level at depth3 and area arrows as consumables/abilities. Continue independent combat/route/HUD and asset inventory work while awaiting answers. Image1 referenced but no attachment available in latest message; infer Speed/DR belongs beside party-card Grit unless clarified.

Next: create focused child issues then each issue→branch→PR→author review/checks→merge. No fixes or release claimed. Preserve private exports/untracked Borin prototypes, installed game and real saves. Full previous release is verified in v086 handoff. Source book/Foundry untouched. Do not spawn agents unless explicitly authorized.
