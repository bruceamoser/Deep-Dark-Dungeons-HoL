import test from "node:test";
import assert from "node:assert/strict";
import { fresh, C, R } from "./forge-fixture.mjs";
import { Game } from "../src/core/game.mjs";
function quiet() {
  const g = fresh();
  g.mode = "exploration";
  g.enemies = [];
  g.supplyDie = () => 1;
  return g;
}
const supply = (h, id) =>
  h.preview.inventory.items.find((i) => i.carried && i.catalogId === id);
test("food/water checks follow party movement, count real path steps only, save without replay", () => {
  const g = quiet(),
    h = g.party[0],
    food = supply(h, "item-food-bundle"),
    water = supply(h, "item-water-flask");
  g.movementSupplies(39);
  assert.equal(g.supplyValue(h, water), 8);
  g.movementSupplies(1);
  assert.equal(g.supplyValue(h, water), 6);
  assert.equal(g.supplyValue(h, food), 8);
  const copy = new Game(R, C);
  copy.load(structuredClone(g.snapshot()), { resume: false });
  copy.supplyDie = () => 1;
  assert.equal(copy.provisionCountdown().water, 40);
  copy.movementSupplies(39);
  assert.equal(copy.supplyValue(copy.party[0], water), 6);
  copy.movementSupplies(1);
  assert.equal(copy.supplyValue(copy.party[0], food), 6);
  assert.equal(copy.supplyValue(copy.party[0], water), 4);
  g.mode = "town";
  const before = g.campaign.provisionTrail.steps;
  g.movementSupplies(100);
  assert.equal(g.campaign.provisionTrail.steps, before);
  assert.throws(() => g.movementSupplies(-1), /nonnegative/);
});
test("missing provisions cause immediate needs penalties; last use satisfies the check, later refill satisfies overdue need", () => {
  const g = quiet(),
    h = g.party[0],
    water = supply(h, "item-water-flask");
  h.supplies[water.instanceId] = 4;
  g.movementSupplies(40);
  assert.equal(g.needs(h).thirsty, false);
  g.movementSupplies(40);
  assert.equal(g.needs(h).thirsty, true);
  const notices = g.campaign.supplyNotices.length;
  g.autoProvisions();
  assert.equal(g.campaign.supplyNotices.length, notices);
  h.supplies[water.instanceId] = 6;
  g.autoProvisions();
  assert.equal(g.needs(h).thirsty, false);
});
test("camp preserves provisions, daily timers and fire fuel without deferred consumption", () => {
  const g = quiet();
  g.campWanderers = () => [];
  const before = g.party.map((h) => ({
    supplies: structuredClone(h.supplies),
    foodAge: g.clock().seconds - h.needs.ateAt,
    waterAge: g.clock().seconds - h.needs.drankAt,
  }));
  const trail = structuredClone(g.campaign.provisionTrail);
  g.startCamp(
    Object.fromEntries(g.party.map((h) => [h.heroId, ["guard", "guard"]])),
    32,
  );
  for (let i = 0; i < 32; i++) g.campHour();
  for (const [i, h] of g.party.entries()) {
    assert.deepEqual(h.supplies, before[i].supplies);
    assert.equal(g.clock().seconds - h.needs.ateAt, before[i].foodAge);
    assert.equal(g.clock().seconds - h.needs.drankAt, before[i].waterAge);
  }
  assert.deepEqual(g.campaign.provisionTrail, trail);
  assert.equal(g.campaign.camp.fireLit, true);
  g.autoProvisions();
  g.party.forEach((h, i) => assert.deepEqual(h.supplies, before[i].supplies));
});
