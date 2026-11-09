import test from "node:test";
import assert from "node:assert/strict";
import { arena, R } from "./forge-fixture.mjs";
function prepare(id = "power-retaliating-guard") {
  const g = arena(),
    h = g.active,
    e = g.enemies[0];
  h.preview.state.abilities.push(id);
  g.useAbility(id);
  return { g, h, e };
}
test("prepared counters survive the next own turn, fire once, and spend only Reaction", () => {
  for (const id of ["power-retaliating-guard", "power-blade-ward"]) {
    const { g, h, e } = prepare(id);
    h.survival.ownTurn++;
    g.budgets[h.id] = R.startTurn({ turnId: "next", speed: g.speed(h) });
    const before = e.hp;
    g.resolveEnemyHit(e, h);
    assert.ok(e.hp < before, id);
    assert.equal(g.budgets[h.id].remaining.reaction, 0);
    assert.equal(g.budgets[h.id].remaining.main, 1);
    assert.equal(g.budgets[h.id].remaining.maneuver, 1);
    const after = e.hp;
    g.resolveEnemyHit(e, h);
    assert.equal(e.hp, after);
  }
});
test("spent Reaction, stowed weapon, range and blocked path cannot counter or consume preparation", () => {
  for (const reason of ["reaction", "weapon", "range", "wall"]) {
    const { g, h, e } = prepare();
    if (reason === "reaction") g.spendReaction(h, "block");
    if (reason === "weapon")
      g.held(h, "item-ordinary-melee-weapon").held = false;
    if (reason === "range") e.x -= 3;
    if (reason === "wall")
      g.map.zones.push({ kind: "wall", cells: [{ x: e.x, z: e.z }] });
    const before = e.hp;
    g.riposte(h, e);
    assert.equal(e.hp, before, reason);
    assert.equal(
      g.activeTactics(h).filter((t) => t.effects.riposte).length,
      1,
      reason,
    );
  }
});
test("expired preparation cannot retaliate and an eligible new preparation works", () => {
  const { g, h, e } = prepare();
  h.survival.ownTurn += 2;
  const before = e.hp;
  g.riposte(h, e);
  assert.equal(e.hp, before);
  g.addTactic(h, h, { riposte: true }, "test-new");
  g.riposte(h, e);
  assert.ok(e.hp < before);
});
