import test from "node:test";
import assert from "node:assert/strict";
import { fresh, R, C } from "./forge-fixture.mjs";
import { Game } from "../src/core/game.mjs";
import { ordinaryItem } from "../src/core/treasure.mjs";
import { combineSupplyDice } from "../src/core/supply-dice.mjs";
const add = (g, h, id, key, die) => {
  const item = ordinaryItem(g.C, id, key);
  (h.treasure ??= []).push(item);
  h.supplies[key] = die;
  g.refreshHero(h);
  return item;
};
test("combining increases the larger die by exactly one step through d20, preserves weight and refuses empty or incompatible supplies", () => {
  assert.equal(combineSupplyDice(4, 6), 8);
  assert.equal(combineSupplyDice(8, 8), 10);
  assert.equal(combineSupplyDice(12, 4), 20);
  const g = fresh(),
    h = g.party[0];
  for (const id of [
    "item-ammunition-bundle",
    "item-lighting-bundle",
    "item-lesser-healing-bottle",
    "item-water-flask",
  ]) {
    add(g, h, id, "a-" + id, 8);
    add(g, h, id, "b-" + id, 8);
    const bulk = h.preview.inventory.bulk;
    const combined = g.combineSupplies(0, "a-" + id, "b-" + id);
    assert.equal(h.supplies[combined], 10);
    assert.equal(h.preview.inventory.bulk, bulk);
    const i = h.treasure.find((i) => i.instanceId === combined);
    assert.equal(i.reserveDice, undefined);
    assert.equal(i.combinedSupply, true);
    add(g, h, id, "c-" + id, 4);
    const larger = g.combineSupplies(0, combined, "c-" + id);
    assert.equal(h.supplies[larger], 12);
    add(g, h, id, "d-" + id, 4);
    const max = g.combineSupplies(0, larger, "d-" + id);
    assert.equal(h.supplies[max], 20);
    add(g, h, id, "empty-" + id, 0);
    assert.match(g.combineSupplyReason(0, max, "empty-" + id), /remaining/);
    h.supplies["empty-" + id] = 4;
    assert.match(g.combineSupplyReason(0, max, "empty-" + id), /d20 maximum/);
  }
  g.mode = "combat";
  assert.throws(() => g.combineSupplies(0, "a", "b"), /outside combat/);
});
test("larger supply dice persist through saves, transfer, drop/recovery and normal depletion", () => {
  const g = fresh(),
    h = g.party[0];
  add(g, h, "item-food-bundle", "a", 8);
  add(g, h, "item-food-bundle", "b", 8);
  const id = g.combineSupplies(0, "a", "b"),
    copy = new Game(R, C);
  copy.load(structuredClone(g.snapshot()), { resume: false });
  assert.equal(copy.party[0].supplies[id], 10);
  copy.transferTreasure(0, id, 1);
  copy.mode = "exploration";
  copy.dropItem(1, id);
  const pile = copy.map.chests.find(
    (c) => c.dropped && c.items.some((i) => i.instanceId === id),
  );
  assert.equal(pile.items[0].supplyRemaining, 10);
  copy.takeTreasure(`coffer:${pile.id}`, id, 1);
  const target = copy.party[1],
    item = target.preview.inventory.items.find((i) => i.instanceId === id);
  for (const expected of [8, 6, 4, 0])
    assert.equal(copy.checkSupply(target, item, "test", 1).after, expected);
});
test("legacy remaining reserve dice migrate once under the new growth rule, never refill exhausted bundles", () => {
  const g = fresh(),
    h = g.party[0],
    item = add(g, h, "item-food-bundle", "legacy", 4);
  Object.assign(item, { quantity: 3, reserveDice: [4, 6] });
  const saved = structuredClone(g.snapshot());
  const copy = new Game(R, C);
  copy.load(saved, { resume: false });
  assert.equal(copy.party[0].supplies.legacy, 8);
  assert.equal(
    copy.party[0].treasure.find((i) => i.instanceId === "legacy").reserveDice,
    undefined,
  );
  const again = new Game(R, C);
  again.load(structuredClone(copy.snapshot()), { resume: false });
  assert.equal(again.party[0].supplies.legacy, 8);
  const bad = structuredClone(copy.snapshot());
  bad.party[0].treasure[0].reserveDice = [3];
  assert.throws(() => again.load(bad, { resume: false }), /combined supplies/);
});
test("combined healing potions check their grown supply die while retaining source healing and action rules", () => {
  const g = fresh(),
    h = g.party[0];
  add(g, h, "item-lesser-healing-bottle", "p1", 4);
  add(g, h, "item-lesser-healing-bottle", "p2", 4);
  const id = g.combineSupplies(0, "p1", "p2");
  assert.equal(h.supplies[id], 6);
  h.survival.hp = 1;
  // Stow hands before drinking; the supply roll must be d6 rather than the purchased d4.
  h.preview.inventory.items.forEach((i) => (i.held = false));
  let die;
  g.supplyDie = (sides) => ((die = sides), sides);
  g.drinkPotion(0, id);
  assert.equal(die, 6);
  assert.equal(h.supplies[id], 6);
  assert.ok(h.survival.hp > 1);
});
