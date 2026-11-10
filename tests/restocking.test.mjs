import test from "node:test";
import assert from "node:assert/strict";
import { fresh, C, R } from "./forge-fixture.mjs";
import { Game } from "../src/core/game.mjs";
import { ordinaryItem } from "../src/core/treasure.mjs";
import { restockCost } from "../src/core/supply-stock.mjs";
const duties = (g) =>
  Object.fromEntries(g.party.map((h) => [h.heroId, ["guard", "guard"]]));
const arrows = (g) =>
  g.supplyRows().find((r) => r.supply === "arrows" && !r.missing);
function field(g) {
  g.mode = "exploration";
  g.enemies = [];
  g.campWanderers = () => [];
}

test("town restock previews exact costs, preserves larger dice and bundle Bulk", () => {
  const g = fresh(),
    r = arrows(g),
    h = g.party.find((h) => h.heroId === r.hero),
    item = h.preview.inventory.items.find((i) => i.instanceId === r.itemId);
  g.campaign.bank = 1000;
  h.supplies[item.instanceId] = 4;
  const p = g.townRestockPlan(r, 12),
    before = g.campaign.bank,
    bulk = h.preview.inventory.bulk;
  assert.equal(g.supplyValue(h, item), 4);
  assert.ok(p.price > g.townRestockPlan(r, 8).price);
  g.restockInTown(r, 12, JSON.stringify([p.before, p.after, p.price]));
  assert.equal(h.supplies[item.instanceId], 12);
  assert.equal(g.campaign.bank, before - p.price);
  assert.equal(h.preview.inventory.bulk, bulk);
  assert.equal(g.townRestockPlan(r, 8).price, 0);
  g.restockInTown(r, 8);
  assert.equal(h.supplies[item.instanceId], 12);
  assert.throws(() => g.townRestockPlan(r, 14), /supported/);
});

test("party restocking is atomic on shortage/stale review and stocks missing food/water", () => {
  const g = fresh(),
    row = arrows(g),
    h = g.party.find((h) => h.heroId === row.hero);
  h.supplies[row.itemId] = 0;
  let p = g.departurePlan(10),
    snapshot = JSON.stringify(g.snapshot());
  g.campaign.bank = 0;
  assert.throws(() => g.restockParty(10, p.fingerprint), /coins/);
  assert.equal(h.supplies[row.itemId], 0);
  g.campaign.bank = 10000;
  p = g.departurePlan(10);
  h.supplies[row.itemId] = 4;
  assert.throws(() => g.restockParty(10, p.fingerprint), /changed/);
  assert.equal(g.campaign.bank, 10000);
  const next = g.departurePlan(10);
  g.restockParty(10, next.fingerprint);
  assert.equal(g.campaign.bank, 10000 - next.total);
  assert.ok(
    g
      .supplyRows()
      .filter((r) => ["food", "water"].includes(r.supply))
      .every((r) => !r.missing && r.before >= 10),
  );
  assert.equal(g.campaign.restockTarget, 10);
  assert.equal(g.departurePlan(10).rows.length, 0);
});

test("town water refills existing flasks freely without reducing larger combined pools", () => {
  const g = fresh(),
    r = g.supplyRows().find((r) => r.supply === "water" && !r.missing),
    h = g.party.find((h) => h.heroId === r.hero);
  h.supplies[r.itemId] = 0;
  assert.equal(g.townRestockPlan(r, 4).after, 8);
  assert.equal(g.townRestockPlan(r, 8).price, 0);
  g.restockInTown(r, 8);
  h.supplies[r.itemId] = 20;
  g.restockInTown(r, 8);
  assert.equal(h.supplies[r.itemId], 20);
});

test("basic camp tasks need no ingredients or tools, training improves hidden chance, success grows one step", () => {
 const g=fresh(),r=arrows(g),owner=g.party.find(h=>h.heroId===r.hero),t={heroId:r.hero,supplyId:r.itemId};
 owner.supplies[r.itemId]=4;field(g);g.startCamp(duties(g));
 const basic=g.campRestockPlan(g.party[0],"arrows",t),skilled=g.campRestockPlan(g.party[1],"arrows",t);
 assert.equal(basic.reason,"");assert.equal(skilled.after,6);assert.ok(skilled.chance>basic.chance);assert.equal(skilled.units,0);
 const bulk=owner.preview.inventory.bulk;
 g.performCampRestock(g.party[1],"arrows",{int:()=>100},t);assert.equal(owner.supplies[r.itemId],4);
 g.performCampRestock(g.party[1],"arrows",{int:()=>1},t);assert.equal(owner.supplies[r.itemId],6);
 assert.equal(owner.preview.inventory.bulk,bulk);assert.equal(g.materialCount("craft"),0);
 owner.supplies[r.itemId]=12;g.performCampRestock(g.party[1],"arrows",{int:()=>1},t);assert.equal(owner.supplies[r.itemId],20);
 assert.match(g.campRestockPlan(g.party[1],"arrows",t).reason,/full/);
});

test("automatic camp recipient prefers lowest carried supply; manual choice and new supplies work", () => {
 const g=fresh(),r=arrows(g),owner=g.party.find(h=>h.heroId===r.hero);field(g);g.startCamp(duties(g));
 owner.supplies[r.itemId]=0;
 assert.equal(g.campRestockPlan(g.party[0],"arrows").row.hero,r.hero);
 const empty=g.supplyRows().find(r=>r.supply==="dressings"&&r.missing),target={heroId:empty.hero,supplyId:"new"};
 g.performCampRestock(g.party[0],"dressings",{int:()=>1},target);
 assert.ok(g.supplyRows().some(r=>r.supply==="dressings"&&r.hero===empty.hero&&!r.missing&&r.before===4));
});

test("camp forecasts bound uncertain supply work without changing live state; saved completed work is not repeated", () => {
 const g=fresh(),r=arrows(g),h=g.party.find(h=>h.heroId===r.hero),t={heroId:r.hero,supplyId:r.itemId};h.supplies[r.itemId]=4;field(g);
 const plan=duties(g),targets={};plan[g.party[0].heroId]=["arrows","guard"];targets[g.party[0].heroId]=[t,null];
 const before=JSON.stringify(g.snapshot()),f=g.campForecast(plan,8,targets);
 assert.equal(JSON.stringify(g.snapshot()),before);
 assert.equal(f.low.find(h=>h.heroId===r.hero).supplies[r.itemId],4);
 assert.equal(f.high.find(h=>h.heroId===r.hero).supplies[r.itemId],6);
 g.startCamp(plan,8,targets);g.campSupplyProjection="success";g.campHour();assert.equal(h.supplies[r.itemId],6);
 const copy=new Game(R,C);copy.load(structuredClone(g.snapshot()),{resume:false});copy.campWanderers=()=>[];copy.campHour();
 assert.equal(copy.party.find(h=>h.heroId===r.hero).supplies[r.itemId],6);
});

test("old recipe batches and typed material dice migrate once, preserving weight and advanced materials", () => {
  const g = fresh(),
    h = g.party[0];
  h.recipeMaterials = { "recipe-travel-food": 2, "recipe-smoke-flask": 3 };
  const old = ordinaryItem(g.C, "item-material-bundle", "legacy-materials");
  old.materialType = "recipe-fletched-ammunition";
  const rare = ordinaryItem(g.C, "item-material-bundle", "special-materials");
  rare.materialType = "recipe-lesser-healing-bottle";
  const untyped = ordinaryItem(g.C, "item-material-bundle", "untyped");
  (h.treasure ??= []).push(old, rare, untyped);
  h.supplies[old.instanceId] = 4;
  g.refreshHero(h);
  const bulk = h.preview.inventory.bulk,
    copy = new Game(R, C);
  copy.load(structuredClone(g.snapshot()), { resume: false });
  assert.ok(
    copy.party[0].preview.inventory.items.find(
      (i) => i.instanceId === "untyped",
    ).inventoryDie,
  );
  assert.equal(copy.materialCount("food"), 8);
  assert.equal(copy.materialCount("craft"), 16);
  assert.equal(copy.party[0].preview.inventory.bulk, bulk);
  assert.equal(copy.party[0].recipeMaterials["recipe-smoke-flask"], 3);
  assert.ok(
    copy.party[0].preview.inventory.items.find(
      (i) => i.instanceId === rare.instanceId,
    ).inventoryDie,
  );
  const second = new Game(R, C);
  second.load(structuredClone(copy.snapshot()), { resume: false });
  assert.equal(second.materialCount("craft"), 16);
  assert.equal(second.materialCount("food"), 8);
  second.transferTreasure(0, "legacy-materials", 1);
  assert.equal(second.materialCount("craft"), 16);
  assert.equal(
    second.party[1].preview.inventory.items.find(
      (i) => i.instanceId === "legacy-materials",
    ).bulk,
    old.bulk,
  );
  second.consumeMaterialStock("craft", 1);
  assert.equal(second.materialCount("craft"), 15);
});

test("new counted ingredients survive transfer and dropped-cache recovery, without access to reserve/dead goods", () => {
  const g = fresh(),
    h = g.party[0],
    stock = g.addMaterialStock(h, "medicine", 4);
  g.transferTreasure(0, stock.instanceId, 1);
  assert.equal(g.materialCount("medicine"), 4);
  field(g);
  g.dropItem(1, stock.instanceId);
  assert.equal(g.materialCount("medicine"), 0);
  const chest = g.map.chests.find((c) =>
    c.items?.some((i) => i.instanceId === stock.instanceId),
  );
  g.takeTreasure(`coffer:${chest.id}`, stock.instanceId, 1);
  assert.equal(g.materialCount("medicine"), 4);
  g.party[1].survival.status = "dead";
  assert.equal(g.materialCount("medicine"), 0);
});

test("invalid ingredient receipts, project targets and departure preferences reject before load replaces state", () => {
  const g = fresh(),
    c = new Game(R, C);
  c.load(structuredClone(g.snapshot()), { resume: false });
  for (const value of [0, 7, 99]) {
    const bad = structuredClone(g.snapshot());
    bad.restockTarget = value;
    assert.throws(() => c.load(bad), /departure/);
  }
  const bad = structuredClone(g.snapshot());
  bad.party[0].treasure = [
    {
      kind: "ordinary",
      catalogId: "item-material-bundle",
      instanceId: "bad",
      materialType: "recipe-travel-food",
      stockUnits: -1,
      stockBulk: 0,
    },
  ];
  assert.throws(() => c.load(bad), /ingredient stock/);
  field(g);
  g.startCamp(duties(g));
  const camp = structuredClone(g.snapshot());
  camp.camp.targets = {
    [g.party[0].heroId]: [{ heroId: g.party[0].heroId, supplyId: 42 }, null],
  };
  assert.throws(() => c.load(camp), /camp schedule/);
});

test("automatic procurement honors the best capable buying/crafting discount", () => {
  const g = fresh(),
    row = arrows(g),
    h = g.party.find((h) => h.heroId === row.hero);
  h.supplies[row.itemId] = 4;
  const price = g.townRestockPlan(row, 8).price,
    ingredients = g.ingredientPurchasePrice("craft", 4);
  const original = g.traits.bind(g);
  g.traits = (hero) =>
    hero === g.party[0]
      ? [...original(hero), { buyRate: 0.5 }]
      : original(hero);
  assert.equal(g.townRestockPlan(row, 8).price, Math.ceil(price * 0.5));
  assert.equal(
    g.ingredientPurchasePrice("craft", 4),
    Math.ceil(ingredients * 0.5),
  );
  g.party[0].survival.status = "dead";
  assert.equal(g.townRestockPlan(row, 8).price, price);
  assert.equal(g.ingredientPurchasePrice("craft", 4), ingredients);
});

test("free basic preparation does not spend advanced Maker's Gift daily receipt or old materials", () => {
 const g=fresh(),r=arrows(g),worker=g.party[0],owner=g.party.find(h=>h.heroId===r.hero);field(g);g.startCamp(duties(g));
 g.addMaterialStock(worker,"craft",4);worker.traitUses={craftImprove:7};owner.supplies[r.itemId]=4;
 g.performCampRestock(worker,"arrows",{int:()=>1},{heroId:r.hero,supplyId:r.itemId});
 assert.equal(g.materialCount("craft"),4);assert.equal(worker.traitUses.craftImprove,7);assert.equal(owner.supplies[r.itemId],6);
});
