import test from "node:test";
import assert from "node:assert/strict";
import { C, R, fresh } from "./forge-fixture.mjs";
import { C as source } from "./game-fixture.mjs";
import { Game } from "../src/core/game.mjs";
import { ordinaryItem } from "../src/core/treasure.mjs";
import { encumbranceFor } from "../src/core/bulk.mjs";

test("small supplies reduce carrying weight without changing source records or supply dice", () => {
  const g = fresh(),
    h = g.party[0];
  for (const [id, expected] of [
    ["item-food-bundle", 0.5],
    ["item-ammunition-bundle", 0.5],
    ["item-lesser-healing-bottle", 0.25],
  ]) {
    const item = ordinaryItem(source, id, id);
    assert.equal(item.bulk, expected);
    assert.equal(
      item.inventoryDie,
      source.inventory.equipment.find((d) => d.id === id).inventoryDie,
    );
    assert.equal(source.inventory.equipment.find((d) => d.id === id).bulk, 1);
  }
  assert.ok(h.preview.inventory.bulk < 10);
  assert.equal(
    h.preview.inventory.capacity,
    10 + 3 * h.preview.attributes.brawn + (h.preview.forge.stats.capacity ?? 0),
  );
  assert.equal(encumbranceFor(13.25, 13), 1);
  assert.equal(encumbranceFor(14.25, 13), 2);
});

test("loading old weights recalculates combined stacks and cached merchant stock without refilling supplies", () => {
  const g = fresh(),
    h = g.party[0];
  const item = ordinaryItem(g.C, "item-food-bundle", "old-stack");
  Object.assign(item, { quantity: 3, bulk: 3, reserveDice: [4, 6] });
  item.definition.bulk = 1;
  (h.treasure ??= []).push(item);
  h.supplies[item.instanceId] = 4;
  g.market();
  const saved = structuredClone(g.snapshot());
  const entry = saved.market.stock.general.find(
    (e) => e.item.catalogId === "item-food-bundle",
  );
  entry.item.bulk = entry.item.definition.bulk = 1;
  const loaded = new Game(R, C);
  loaded.load(saved, { resume: false });
  const restored = loaded.party[0].preview.inventory.items.find(
    (i) => i.instanceId === item.instanceId,
  );
  assert.equal(restored.bulk, 1.5);
  assert.equal(loaded.party[0].supplies[item.instanceId], 8);
  assert.equal(restored.reserveDice, undefined);
  assert.equal(restored.combinedSupply, true);
  assert.equal(
    loaded
      .market()
      .stock.general.find((e) => e.item.catalogId === "item-food-bundle").item
      .bulk,
    0.5,
  );
});
