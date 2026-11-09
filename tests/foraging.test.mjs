import test from "node:test";
import assert from "node:assert/strict";
import {
  forageTable,
  forageOutcome,
  FORAGE_RESOURCES,
} from "../src/core/foraging.mjs";
import { fresh, C, R } from "./forge-fixture.mjs";
import { Game } from "../src/core/game.mjs";
const plan = (g) =>
  Object.fromEntries(g.party.map((h) => [h.heroId, ["forage", "guard"]]));
test("baseline d100 table covers every face exactly once and finds one resource on 50 faces", () => {
  const t = forageTable();
  assert.equal(t.findChance, 50);
  const counts = {};
  for (let roll = 1; roll <= 100; roll++) {
    const result = forageOutcome(t, roll);
    counts[result.id] = (counts[result.id] ?? 0) + 1;
  }
  assert.equal(counts.nothing, 50);
  for (const r of FORAGE_RESOURCES) assert.equal(counts[r.id], r.base);
  for (const b of t.bands) {
    assert.equal(forageOutcome(t, b.start).id, b.id);
    assert.equal(forageOutcome(t, b.end).id, b.id);
  }
  assert.throws(() => forageOutcome(t, 0), /d100/);
});
test("learned abilities expand only relevant resource bands and retain a nonzero empty range", () => {
  const base = forageTable(),
    field = forageTable({ powers: ["power-field-replenishment"] }),
    medic = forageTable({ powers: ["power-forager-remedies"] });
  assert.equal(field.bands.find((b) => b.id === "wood").chance, 16);
  assert.equal(field.bands.find((b) => b.id === "herbs").chance, 6);
  assert.equal(medic.bands.find((b) => b.id === "herbs").chance, 18);
  assert.equal(medic.bands.find((b) => b.id === "wood").chance, 12);
  assert.deepEqual(forageTable({ powers: ["power-driving-cut"] }), base);
  const trained = forageTable({
    powers: [
      "power-field-replenishment",
      "power-forager-remedies",
      "power-field-artisan",
    ],
    remedies: true,
    salvage: true,
    healingSkills: 4,
  });
  assert.equal(trained.findChance, 85);
  assert.equal(trained.bands.at(-1).chance, 15);
  for (const b of trained.bands.slice(0, -1)) assert.ok(b.chance >= b.base);
});
test("general foraging grants exactly one batch, finds water, respects empty rolls, and persists results without a floor cap", () => {
  const g = fresh();
  g.mode = "exploration";
  g.enemies = [];
  g.startCamp(plan(g));
  const h = g.party[0];
  for (const r of FORAGE_RESOURCES.filter((r) => r.recipe)) {
    const band = g.campForageTable(h).bands.find((b) => b.id === r.id);
    g.campForage(h, { int: () => band.start });
    assert.equal(h.recipeMaterials[r.recipe], 1);
  }
  const before = structuredClone(h.recipeMaterials);
  g.campForage(h, { int: () => 100 });
  assert.deepEqual(h.recipeMaterials, before);
  for (let i = 0; i < 6; i++) g.campForage(h, { int: () => 25 });
  assert.ok(h.recipeMaterials["recipe-travel-food"] > 3);
  g.map.waterSources = [];
  const flask = h.preview.inventory.items.find(
    (i) => i.catalogId === "item-water-flask",
  );
  h.supplies[flask.instanceId] = 4;
  g.campForage(h, { int: () => 1 });
  assert.equal(g.supplyValue(h, flask), 8);
  assert.equal(g.campWaterSource(), true);
  const copy = new Game(R, C);
  copy.load(structuredClone(g.snapshot()), { resume: false });
  assert.deepEqual(copy.party[0].recipeMaterials, h.recipeMaterials);
  assert.equal(copy.map.waterSources.length, 1);
});
test("old targeted forage schedules migrate to one general task and medicinal materials can make dressings", () => {
  const g = fresh();
  g.mode = "exploration";
  g.enemies = [];
  g.startCamp(plan(g));
  const saved = structuredClone(g.snapshot());
  saved.camp.assignments[g.party[0].heroId] = ["forage-food", "forage-torches"];
  const copy = new Game(R, C);
  copy.load(saved, { resume: false });
  assert.deepEqual(copy.campaign.camp.assignments[g.party[0].heroId], [
    "forage",
    "forage",
  ]);
  const h = copy.party[2];
  h.recipeBook = ["recipe-field-dressing"];
  h.recipeMaterials = { "recipe-field-dressing": 1 };
  for (const i of h.preview.inventory.items.filter(
    (i) => i.catalogId === "item-field-dressing",
  ))
    h.supplies[i.instanceId] = 0;
  copy.campDuty(h, "dressings", { int: () => 6 });
  assert.equal(h.recipeMaterials["recipe-field-dressing"], 0);
  assert.ok(copy.supplyItem(h, "item-field-dressing"));
});

test("paused duty changes affect future work without repeating time, healing or previous forage rewards", () => {
  const g = fresh();
  g.mode = "exploration";
  g.enemies = [];
  g.campWanderers = () => [];
  g.forageProjection = "nothing";
  g.supplyDie = (d) => d;
  const duties = plan(g);
  g.startCamp(duties);
  g.campHour();
  const hp = g.party.map((h) => h.survival.hp),
    time = g.clock().seconds;
  duties[g.party[1].heroId] = ["guard", "guard"];
  g.updateCampDuties(duties, {});
  assert.equal(g.campaign.camp.elapsed, 1);
  assert.equal(g.clock().seconds, time);
  assert.deepEqual(
    g.party.map((h) => h.survival.hp),
    hp,
  );
  g.campHour();
  assert.equal(g.campaign.camp.elapsed, 2);
  assert.equal(g.clock().seconds, time + 3600);
});

test("relevant discipline ranks improve matching finds while abilities contribute larger bonuses", () => {
  const base = forageTable();
  for (const rank of [1, 2, 3]) {
    const wilderness = forageTable({
      ranks: { "discipline-wilderness": rank },
    });
    assert.equal(wilderness.findChance, 50 + rank * 3);
    assert.equal(wilderness.bands.find((b) => b.id === "herbs").chance, 6);
    const craft = forageTable({ ranks: { "discipline-craft": rank } });
    assert.equal(craft.findChance, 50 + rank * 2);
    assert.equal(craft.bands.find((b) => b.id === "food").chance, 14);
    const medicine = forageTable({ ranks: { "discipline-medicine": rank } });
    assert.equal(medicine.findChance, 50 + rank);
    assert.equal(medicine.bands.find((b) => b.id === "water").chance, 8);
  }
  assert.deepEqual(
    forageTable({ ranks: { "discipline-flame": 3, "discipline-arms": 3 } }),
    base,
  );
  const combined = forageTable({
    ranks: { "discipline-wilderness": 1 },
    powers: ["power-field-replenishment"],
  });
  assert.equal(combined.findChance, 71);
  assert.ok(
    forageTable({ powers: ["power-field-artisan"] }).findChance >
      forageTable({ ranks: { "discipline-craft": 3 } }).findChance,
  );
  const capped = forageTable({
    ranks: {
      "discipline-wilderness": 3,
      "discipline-craft": 3,
      "discipline-medicine": 3,
    },
    powers: [
      "power-field-replenishment",
      "power-forager-remedies",
      "power-field-artisan",
    ],
    healingSkills: 3,
  });
  assert.equal(capped.findChance, 85);
  for (let roll = 1; roll <= 100; roll++)
    assert.ok(forageOutcome(capped, roll));
});

test("camp uses the acting hero's discipline ranks without sharing them across the company", () => {
  const g = fresh(),
    h = g.party[0],
    other = g.party[1];
  h.preview.state.ranks = {};
  other.preview.state.ranks = {};
  const before = g.campForageTable(h).findChance,
    otherBefore = g.campForageTable(other).findChance;
  h.preview.state.ranks["discipline-wilderness"] = 1;
  assert.equal(g.campForageTable(h).findChance, Math.min(85, before + 3));
  assert.equal(g.campForageTable(other).findChance, otherBefore);
});
