import test from "node:test";
import assert from "node:assert/strict";
import { R, C, drafts } from "./game-fixture.mjs";
import { Game } from "../src/core/game.mjs";
import { gameCatalog } from "../src/core/powers.mjs";
import { ordinaryItem } from "../src/core/treasure.mjs";
import { serialize, deserialize } from "../src/core/save.mjs";
function fresh() {
  const g = new Game(R, gameCatalog(C));
  g.fresh(drafts);
  g.pause();
  return g;
}
test("combined remaining dice survive saves, transfers, drops and sequential consumption", () => {
  const g = fresh(),
    h = g.party[0];
  const food = h.preview.inventory.items.find(
    (i) => i.catalogId === "item-food-bundle",
  );
  (h.treasure ??= []).push(ordinaryItem(g.C, "item-food-bundle", "food-extra"));
  h.supplies[food.instanceId] = 4;
  h.supplies["food-extra"] = 6;
  g.refreshHero(h);
  const bulk = h.preview.inventory.bulk;
  const id = g.combineSupplies(0, food.instanceId, "food-extra");
  assert.equal(h.preview.inventory.bulk, bulk);
  assert.equal(h.supplies[id], 4);
  assert.deepEqual(
    h.treasure.find((i) => i.instanceId === id).reserveDice,
    [6],
  );
  assert.equal(
    h.preview.inventory.items.some(
      (i) => i.instanceId === food.instanceId || i.instanceId === "food-extra",
    ),
    false,
  );
  const copy = new Game(R, gameCatalog(C));
  copy.load(deserialize(serialize(g.snapshot())), { resume: false });
  const bad = structuredClone(copy.snapshot());
  bad.party[0].treasure.find((i) => i.instanceId === id).reserveDice = [3];
  assert.throws(() => copy.load(bad, { resume: false }), /combined supplies/);
  copy.transferTreasure(0, id, 1);
  copy.mode = "exploration";
  copy.dropItem(1, id);
  const pile = copy.map.chests.find(
    (c) => c.dropped && c.items.some((i) => i.instanceId === id),
  );
  assert.deepEqual(pile.items[0].reserveDice, [6]);
  assert.equal(pile.items[0].supplyRemaining, 4);
  copy.takeTreasure(`coffer:${pile.id}`, id, 1);
  const target = copy.party[1],
    item = target.preview.inventory.items.find((i) => i.instanceId === id);
  assert.equal(
    copy.checkSupply(target, item, "test supply", 1).continued,
    true,
  );
  assert.equal(target.supplies[id], 6);
  assert.deepEqual(
    target.treasure.find((i) => i.instanceId === id).reserveDice,
    [],
  );
  assert.equal(copy.checkSupply(target, item, "test supply", 1).after, 4);
  assert.equal(
    copy.checkSupply(target, item, "test supply", 1).exhausted,
    true,
  );
  assert.equal(target.supplies[id], 0);
});
test("matching consumables combine recursively; incompatible, empty and combat combinations reject", () => {
  const g = fresh(),
    h = g.party[0];
  for (const catalogId of [
    "item-ammunition-bundle",
    "item-lighting-bundle",
    "item-lesser-healing-bottle",
  ]) {
    for (const key of ["a", "b", "c"]) {
      const id = catalogId + key;
      (h.treasure ??= []).push(ordinaryItem(g.C, catalogId, id));
      h.supplies[id] = 4;
    }
    g.refreshHero(h);
    const before = h.preview.inventory.bulk;
    assert.throws(
      () => g.combineSupplies(0, catalogId + "a", catalogId + "a"),
      /different/,
    );
    g.mode = "combat";
    assert.throws(
      () => g.combineSupplies(0, catalogId + "a", catalogId + "b"),
      /outside combat/,
    );
    g.mode = "town";
    h.supplies[catalogId + "b"] = 0;
    assert.throws(
      () => g.combineSupplies(0, catalogId + "a", catalogId + "b"),
      /remaining/,
    );
    h.supplies[catalogId + "b"] = 4;
    const id = g.combineSupplies(0, catalogId + "a", catalogId + "b");
    const combined = g.combineSupplies(0, id, catalogId + "c");
    assert.deepEqual(
      h.treasure.find((i) => i.instanceId === combined).reserveDice,
      [4, 4],
    );
    assert.equal(h.preview.inventory.bulk, before);
    const item = h.preview.inventory.items.find(
      (i) => i.instanceId === combined,
    );
    for (let n = 0; n < 3; n++)
      assert.equal(g.checkSupply(h, item, "test", 1).exhausted, n === 2);
  }
  const food = h.preview.inventory.items.find(
    (i) => i.catalogId === "item-food-bundle",
  );
  const water = h.preview.inventory.items.find(
    (i) => i.catalogId === "item-water-flask",
  );
  assert.throws(
    () => g.combineSupplies(0, food.instanceId, water.instanceId),
    /matching/,
  );
});
