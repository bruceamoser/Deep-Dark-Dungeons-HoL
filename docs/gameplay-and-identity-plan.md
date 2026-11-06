# Gameplay powers and individual heroes

Approved direction, November 6, 2026: use HoL's checks, attributes, disciplines,
development, action economy, damage and survival as the foundation. Design the
computer game's abilities independently. Bruce explicitly authorized simplifying
wound recovery and choosing which powers to replace. Original rules and source
repositories remain unchanged.

## Deliverable

1. A game-owned power catalog, separate from tabletop cards. New training uses
   purpose-built powers with concise effects, targeting, costs and duration.
   Existing characters, possessions, injuries and progression remain loadable.
   A smaller, understandable roster takes priority over reproducing hundreds of
   tabletop names. Ancestry traits remain persistent identity benefits; class
   signatures establish a role; purchased powers add tactical choices.
2. Reusable effects: individual/area damage and healing, damage bonuses and
   reduction, DR, Boons/Banes, movement bonuses, push/pull, routed movement,
   teleport/swap, conditions and cleansing, absorption, interception, counters,
   concealment/reveal, lighting, action resources and supply replenishment.
   Powers declare effects, delivery, duration and limits. Target previews and
   rejection reasons precede spending; cancellation is free.
3. Battlefield surfaces: fire, water, smoke, difficult ground, light/darkness and
   temporary barriers. Water extinguishes fire and Burning; smoke obscures;
   barriers stop movement/projectiles; forced movement interacts with hazards.
   Effects expire consistently and survive saving. No expansive physics system.
4. A learned recipe book independent of ability purchases. Basic recipes are
   reliable, with explicit ingredients, tools, location, time and output. Recipes
   can be learned from merchants and found as loot; abilities can unlock or
   improve crafting. Make new supplies or replenish existing ones to capacity.
5. Separate HP healing, stabilization and wound recovery. Field healing restores
   HP without erasing wounds or granting Grit. Camp treatment spends supplies and
   time for predictable wound recovery; town care provides a priced alternative.
   Exceptional injuries use a clear restoration option, not a dead-end tabletop
   instruction. Treated injuries retain their history and wound count.
6. A saved appearance profile: sex, ancestry-specific silhouette/features, face,
   skin tone, hairstyle, facial hair, hair/eye colors, clothing theme and accent.
   Live rotatable/zoomable preview, curated palettes, randomize and reset.
   Ancestry changes retain compatible personal choices. The same assembled,
   animated model appears in creation, the sheet, town and dungeon, with actual
   equipment. Existing heroes receive deterministic appearances. Appearance can
   be edited in town without changing statistics; profiles survive reserve,
   death, save/load and development.

7. Run-library deletion for active or inactive saves, with named confirmation,
   cancellation and restart safety. Never affect another run.
8. Visually distinct tactical squares, weighted reachable movement shading,
   last-point boundaries and hover costs. Account for Slowed, difficult terrain,
   action conversion and ally passage. Combat grid is automatic; exploration
   offers a G toggle.

## Design constraints

- Powerful restoration, damage and extra actions have explicit resource limits;
  no unlimited healing or extra-action loops.
- Persistent hazards affect both sides. Area attack targeting identifies affected
  squares and recipients; ally-safe instant powers say so explicitly.
- Strongest matching buff/debuff wins; duration and stacking rules are visible.
- Displacement cannot enter walls or occupied cells or cut blocked corners.
- Cosmetic selections have no combat bonuses. Equipment remains readable over
  clothing colors. Sex does not restrict hair or facial-hair choices.
- Use existing licensed animated assets with original modular geometry and
  recoloring. Record derivatives; do not claim bespoke production art is finished.

## Execution and acceptance

Implement catalog/effects and migration, then environments, crafting/recovery,
appearance, and UI integration. Exercise each mechanic with meaningful tests,
save/load round trips and a complete character creation path. Inspect the actual
rendered appearance at portrait and dungeon scales. Run the Linux desktop via
`aa-exec -p unconfined -- launch-game.sh` with sandboxing enabled. Review the diff,
merge passing PRs, rebuild the local launcher and publish verified Windows,
AppImage and Debian releases. Update this plan with delivered coverage and limits.

## Delivered in v0.4.0

The items above are implemented. The current catalog has 87 game designs and 11
recipes; the appearance system covers all ten ancestries on existing licensed
rigs. Bonus Maneuvers are queued for an ally's next eligible turn, avoiding an
unusable off-turn grant. Current design data and legacy mappings live in
`game-power-coverage.json`. See `implementation-status.md` for production-art
and simulation limits, and `validation.md` for executed checks.
