import test from "node:test";
import assert from "node:assert/strict";
import { fresh, C, R } from "./forge-fixture.mjs";
import { Game } from "../src/core/game.mjs";
import { actionDetails, SHORTCUT_KEYS } from "../src/ui/action-details.mjs";
test("shortcut order is per hero, validates all changes atomically and survives reload without action cost", () => {
  const g = fresh(),
    ids = g
      .availableActions(g.active)
      .map((c) => c.id)
      .slice(0, 8),
    other = [...g.party[1].favorites],
    clock = g.campaign.clockSeconds,
    budgets = structuredClone(g.budgets);
  g.setShortcuts(0, ids);
  assert.deepEqual(g.active.favorites, ids);
  g.setShortcuts(0, [...ids].reverse());
  assert.deepEqual(g.active.favorites, [...ids].reverse());
  for (const bad of [
    [ids[0], ids[0]],
    ["power-not-learned"],
    Array(9).fill(ids[0]),
  ])
    assert.throws(() => g.setShortcuts(0, bad), /distinct learned/);
  assert.deepEqual(g.active.favorites, [...ids].reverse());
  assert.deepEqual(g.party[1].favorites, other);
  assert.equal(g.campaign.clockSeconds, clock);
  assert.deepEqual(g.budgets, budgets);
  const copy = new Game(R, C);
  copy.load(structuredClone(g.snapshot()), { resume: false });
  assert.deepEqual(copy.active.favorites, [...ids].reverse());
  assert.deepEqual(SHORTCUT_KEYS, ["5", "6", "7", "8", "9", "0", "-", "="]);
});
test("action help uses current profiles, learned modifiers, at-will limits and blocked requirements without side effects", () => {
  const g = fresh(),
    h = g.active;
  h.preview.state.abilities.push("power-retaliating-guard");
  h.powerUses = { "power-retaliating-guard": 1 };
  h.preview.forge.stats.physical = 3;
  const before = structuredClone(g.snapshot());
  const counter = actionDetails(g, "power-retaliating-guard");
  assert.match(counter.rules, /next turn/);
  assert.ok(!counter.notes.some((n) => n.includes("uses left")));
  const strike = actionDetails(g, "power-forge-strike");
  assert.ok(strike.notes.some((n) => n.includes("+3 physical damage")));
  assert.match(strike.rules, /physical damage/);
  assert.deepEqual(g.snapshot(), before);
  g.held(h, "item-ordinary-melee-weapon").held = false;
  assert.doesNotThrow(() => actionDetails(g, "power-forge-strike"));
});

test("universal action help explains real benefits, not only action categories", () => {
  const g = fresh();
  assert.match(actionDetails(g, "ability-defend").rules, /\+1 Boon.*next turn/);
  assert.match(actionDetails(g, "ability-disengage").rules, /does not provoke/);
  assert.match(
    actionDetails(g, "ability-reduce-a-condition").rules,
    /severity by 1/,
  );
  assert.match(
    actionDetails(g, "ability-use-a-healing-potion").rules,
    /Reaction.*supply die/,
  );
});
