import { campEncounterRandom } from "../src/core/fierceness.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { fresh, C, R } from "./forge-fixture.mjs";
import { Game } from "../src/core/game.mjs";
import { campPeriod } from "../src/core/camp.mjs";
import { ordinaryItem } from "../src/core/treasure.mjs";
import { Random } from "../src/core/dungeon.mjs";
const plan = (g) =>
  Object.fromEntries(g.party.map((h) => [h.heroId, ["guard", "guard"]]));
function quiet() {
  const g = fresh();
  g.mode = "exploration";
  g.enemies = [];
  g.campWanderers = () => [];
  return g;
}

test("eight-hour rota gives each hero two working hours and six sleeping hours; longer camps heal only sleeping hours", () => {
  const g = quiet(),
    duties = plan(g);
  for (const h of g.party) {
    const periods = Array.from({ length: 8 }, (_, i) =>
      campPeriod(g.party, duties, i),
    );
    assert.equal(periods.filter((p) => p.worker === h).length, 2);
    assert.equal(periods.filter((p) => p.sleepers.includes(h)).length, 6);
    h.survival.hp = 1;
    h.survival.gritAvailable = 0;
  }
  assert.throws(() => g.startCamp(duties, 7), /8–96/);
  const hours = g.campRecoveryHours(duties);
  assert.ok(hours >= 8);
  g.startCamp(duties, 16);
  for (let i = 0; i < 16; i++) g.campHour();
  for (const h of g.party) {
    assert.equal(h.survival.hp, Math.min(g.healingMaximum(h), 25));
    assert.equal(h.survival.gritAvailable, 0);
    assert.equal(g.campaign.camp.sleepHours[h.heroId], 12);
  }
  assert.equal(g.campaign.camp.status, "complete");
  assert.throws(() => g.campHour(), /No camp/);
});

test("camp saves resume the next period without repeating healing or rewards, reject malformed schedules", () => {
  const g = quiet();
  g.party.forEach((h) => (h.survival.hp = 1));
  g.startCamp(plan(g));
  g.campHour();
  const saved = structuredClone(g.snapshot());
  const copy = new Game(R, C);
  copy.load(saved, { resume: false });
  copy.campWanderers = () => [];
  assert.equal(copy.campaign.camp.elapsed, 1);
  assert.deepEqual(
    copy.party.map((h) => h.survival.hp),
    [1, 3, 3, 3],
  );
  copy.campHour();
  assert.deepEqual(
    copy.party.map((h) => h.survival.hp),
    [3, 3, 5, 5],
  );
  const bad = structuredClone(copy.snapshot());
  bad.camp.assignments[bad.party[0].heroId] = ["guard", "cheat"];
  assert.throws(() => copy.load(bad, { resume: false }), /camp schedule/);
});

test("general foraging finds one material per success; crafting consumes compatible materials; gathering water needs a nearby source", () => {
  const g = quiet(),
    h = g.party[0];
  g.startCamp(plan(g));
  g.dice = (n = 3) => Array(n).fill(6);
  const rng = new Random(123);
  assert.match(g.campDutyReason(h, "cook"), /material/);
  for (let i = 0; i < 4; i++) g.campDuty(h, "forage", { int: () => 21 });
  assert.equal(h.recipeMaterials["recipe-travel-food"], 4);
  const food = h.preview.inventory.items.find(
    (i) => i.catalogId === "item-food-bundle",
  );
  h.supplies[food.instanceId] = 0;
  g.campDuty(h, "cook", rng);
  assert.equal(h.supplies[food.instanceId], 8);
  assert.equal(h.recipeMaterials["recipe-travel-food"], 3);
  g.map.waterSources = [];
  assert.match(g.campDutyReason(h, "water"), /No water/);
  g.map.waterSources = [{ x: h.x, z: h.z }];
  g.campDuty(h, "water", rng);
  const flask = h.preview.inventory.items.find(
    (i) => i.catalogId === "item-water-flask",
  );
  assert.equal(g.supplyValue(h, flask), 6);
});

test("wandering creatures can interrupt a cleared floor; workers detect, Guard adds a Boon, failed watch is an ambush", () => {
  for (const detected of [true, false]) {
    const g = quiet();
    delete g.campWanderers;
    g.traits = () => [];
    g.startCamp(plan(g));
    let seed = 0;
    while (campEncounterRandom(seed, 0).next() >= g.campDanger(1).hourly)
      seed++;
    g.campaign.camp.seed = seed;
    let guardSources;
    g.heroRoll = (h, a, m, extra) => {
      guardSources = extra.sources;
      return { tier: detected ? "standard" : "weak" };
    };
    g.advance = () => {};
    const result = g.campHour();
    assert.equal(result.interrupted, true);
    assert.equal(result.detected, detected);
    assert.deepEqual(guardSources, [{ kind: "boon", amount: 1 }]);
    assert.ok(g.enemies.length);
    assert.equal(g.mode, "combat");
    assert.equal(g.encounter.startingSide, detected ? "players" : "opposition");
    assert.equal(g.campaign.camp.elapsed, 1);
  }
});

function medical(g) {
  const healer = g.party[2];
  for (const p of g.party)
    for (const i of p.preview.inventory.items.filter(
      (i) => i.catalogId === "item-field-dressing",
    ))
      p.supplies[i.instanceId] = 0;
  healer.preview.state.abilities.push(
    "power-mending-touch",
    "power-forge-vital-surgery",
  );
  const dressing = ordinaryItem(g.C, "item-field-dressing", "camp-dressings");
  (healer.treasure ??= []).push(dressing);
  healer.supplies[dressing.instanceId] = 4;
  // Equipment refresh is unnecessary for the test's learned-power fixture.
  healer.preview.inventory.items.push(dressing);
  return { healer, dressing };
}
test("HP care adds four per learned healing skill, requires dressings and pays a supply check", () => {
  const g = quiet(),
    { healer, dressing } = medical(g),
    patient = g.party[0];
  g.startCamp(plan(g));
  patient.survival.hp = 1;
  const skills = g.campHealSkills(healer).length;
  assert.ok(skills >= 2);
  g.supplyDie = () => 1;
  g.campMedicalDuty(healer, "heal", { heroId: patient.heroId });
  assert.equal(
    patient.survival.hp,
    Math.min(patient.survival.maxHp, 1 + 4 * skills),
  );
  assert.equal(healer.supplies[dressing.instanceId], 0);
  const hp = patient.survival.hp;
  g.campMedicalDuty(healer, "heal", { heroId: patient.heroId });
  assert.equal(patient.survival.hp, hp);
  assert.match(
    g.campMedicalReason(g.party[1], "heal", { heroId: patient.heroId }),
    /no learned/,
  );
});
test("normal wounds use recovery rolls, one attempt per day across healers, and persist across save/reload", () => {
  const g = quiet(),
    { healer } = medical(g),
    patient = g.party[0];
  const record = C.wounds.records.find((w) => w.recoveryValue > 3);
  const wound = { id: "camp-test-wound", record, effects: [], applied: true };
  patient.wounds.push(wound);
  const target = { heroId: patient.heroId, woundId: wound.id };
  g.startCamp(plan(g));
  g.dice = (n = 3) => Array(n).fill(4);
  g.supplyDie = () => 4;
  g.campMedicalDuty(healer, "treat", target);
  assert.equal(wound.treatment.attempts.length, 1);
  assert.ok(wound.treatment.progress >= 1 && wound.treatment.progress <= 3);
  assert.match(g.campMedicalReason(healer, "treat", target), /already.*today/);
  assert.match(g.careQuote(0, wound.id).reason, /already.*today/);
  // Save just the source-valid learned build, not the test's injected power fixture.
  const saved = structuredClone(g.snapshot()),
    copy = new Game(R, C);
  copy.load(saved, { resume: false });
  assert.equal(copy.party[0].wounds[0].treatment.attempts.length, 1);
  copy.party[2].preview.state.abilities.push("power-mending-touch");
  assert.match(
    copy.campMedicalReason(copy.party[2], "treat", target),
    /already.*today/,
  );
});
test("camp forecasts bound recovery and supply rolls without changing the real company, paths or clock", () => {
  const g = quiet(),
    { healer } = medical(g);
  g.party.forEach((h) => (h.survival.hp = 1));
  const duties = plan(g);
  duties[healer.heroId] = ["heal", "heal"];
  const targets = {
    [healer.heroId]: [
      { heroId: g.party[0].heroId },
      { heroId: g.party[0].heroId },
    ],
  };
  g.paths.set("hero-0", [{ x: 1, z: 2 }]);
  const before = structuredClone(g.snapshot());
  const forecast = g.campForecast(duties, 8, targets);
  assert.deepEqual(g.snapshot(), before);
  assert.ok(forecast.low[0].survival.hp >= 13);
  assert.ok(forecast.high[0].survival.hp >= forecast.low[0].survival.hp);
  assert.equal(forecast.low[2].supplies["camp-dressings"], 0);
  assert.equal(forecast.high[2].supplies["camp-dressings"], 4);
});

test("severe wound care reserves one restoration supply and carries timed treatment across camps", () => {
  const g = quiet(),
    { healer } = medical(g),
    patient = g.party[0];
  const wound = {
    id: "camp-severe",
    record: C.wounds.records.find((w) => !w.recoveryValue),
    applied: true,
    effects: [],
  };
  patient.wounds.push(wound);
  const draught = ordinaryItem(
    g.C,
    "item-restoration-draught",
    "camp-restoration",
  );
  (healer.treasure ??= []).push(draught);
  healer.preview.inventory.items.push(draught);
  const target = { heroId: patient.heroId, woundId: wound.id };
  healer.supplies[draught.instanceId] = 20;
  let checks = 0;
  g.supplyDie = () => {
    checks++;
    return 1;
  };
  g.startCamp(plan(g));
  g.campMedicalDuty(healer, "treat", target);
  assert.equal(healer.supplies[draught.instanceId], 12);
  assert.equal(wound.treatment?.completed, undefined);
  assert.ok(wound.campCare.minutes < wound.campCare.required);
  g.breakCamp();
  g.startCamp(plan(g));
  for (let i = 0; i < 3 && !wound.treatment?.completed; i++)
    g.campMedicalDuty(healer, "treat", target);
  assert.equal(wound.treatment.completed, true);
  assert.equal(patient.wounds.length, 1);
  assert.equal(checks, 1);
  assert.equal(healer.supplies[draught.instanceId], 12);
});

test("completed camp reports retain actual foraging and healing through save/load and acknowledgement", () => {
  const g = quiet();
  g.party.forEach((h) => (h.survival.hp = 1));
  const duties = Object.fromEntries(
    g.party.map((h) => [h.heroId, ["forage", "guard"]]),
  );
  g.startCamp(duties);
  g.forageProjection = "herbs";
  for (let i = 0; i < 8; i++) g.campHour();
  const report = g.campaign.camp.report;
  assert.equal(report.start[0].hp, 1);
  assert.equal(report.end[0].hp, 13);
  assert.equal(report.healed[g.party[0].heroId], 12);
  assert.equal(
    report.events.filter((e) => e.includes("found medicinal materials")).length,
    4,
  );
  const restored = new Game(R, C);
  restored.load(g.snapshot());
  assert.deepEqual(restored.campaign.camp.report, report);
  restored.campaign.camp.report.acknowledged = true;
  assert.equal(restored.snapshot().camp.report.acknowledged, true);
});
test("ending camp early preserves the completed-hour report and rejects corrupt result records", () => {
  const g = quiet();
  g.startCamp(plan(g));
  g.campHour();
  g.breakCamp();
  assert.ok(g.campaign.camp.report.end);
  const bad = g.snapshot();
  bad.camp.report.start[0].hp = "bad";
  assert.throws(() => new Game(R, C).load(bad), /camp results/);
});
