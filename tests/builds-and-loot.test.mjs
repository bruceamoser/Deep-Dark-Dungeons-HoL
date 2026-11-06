import test from "node:test";
import assert from "node:assert/strict";
import { R, C, drafts } from "./game-fixture.mjs";
import { Game } from "../src/core/game.mjs";
import { gameCatalog, POWERS } from "../src/core/powers.mjs";
import {
  masteryBudget,
  masterySpent,
  TALENTS,
  specializationOptions,
} from "../src/core/builds.mjs";
import { magicItem, ordinaryItem, RELICS } from "../src/core/treasure.mjs";
import { serialize, deserialize } from "../src/core/save.mjs";
import { xpForLevel } from "../src/core/experience.mjs";

function fresh() {
  const g = new Game(R, gameCatalog(C));
  g.fresh(drafts);
  g.pause();
  return g;
}
function arena() {
  const g = fresh();
  g.map = {
    ...g.map,
    tiles: {},
    obstacles: {},
    chests: [],
    rooms: [],
    zones: [],
    lights: [{ x: 5, z: 5, radius: 12 }],
    entrance: { x: 0, z: 0 },
    exit: { x: 9, z: 9 },
  };
  for (let x = 0; x < 10; x++)
    for (let z = 0; z < 10; z++) g.map.tiles[`${x},${z}`] = { x, z };
  g.party.forEach((h, i) => Object.assign(h, { x: 5, z: 5 + i }));
  g.enemies = [
    {
      id: "dummy",
      name: "Target",
      x: 4,
      z: 5,
      hp: 100,
      maxHp: 100,
      conditions: [],
      reactionUsed: true,
    },
  ];
  g.mode = "combat";
  g.suspended = false;
  g.advance = () => {};
  g.dice = (n = 3) => Array(n).fill(6);
  g.encounter = R.startEncounter(
    [
      ...g.party.map((h) => ({ id: h.id, side: "players" })),
      { id: "dummy", side: "opposition" },
    ],
    [6, 6, 6],
  );
  g.active.preview.state.abilities = [];
  return g;
}
test("all classes have three valid signature choices per tier and powers are at will", () => {
  const catalogs = gameCatalog(C);
  assert.equal(Object.keys(TALENTS).length, 30);
  for (const cls of catalogs.choices.filter((c) => c.kind === "class")) {
    for (const level of [1, 3, 7])
      assert.equal(cls.signatures[level].filter((id) => POWERS[id]).length, 3);
    for (const signatureId of cls.signatures[1].filter((id) => POWERS[id])) {
      const d = structuredClone(drafts[0]);
      Object.assign(d, {
        classId: cls.id,
        classDisciplines: cls.startingDisciplines.slice(0, 2),
        signatureId,
        purchases: { 0: [], 1: [] },
      });
      d.attributes = {
        brawn: 1,
        fortitude: 1,
        agility: 1,
        guile: 0,
        knowledge: 0,
        reason: 0,
      };
      d.acquisitions ??= {};
      for (const p of Object.values(POWERS).filter((p) => p.weapon === "melee"))
        d.acquisitions[p.id] = { meleeHands: 1 };
      const result = R.workshopCharacter(d, catalogs);
      assert.equal(
        result.valid,
        true,
        `${signatureId}: ${JSON.stringify(result.errors)}`,
      );
    }
  }
  for (const p of Object.values(POWERS)) {
    assert.equal(p.limit, undefined, p.id);
    assert.equal(p.restLimit, undefined, p.id);
    assert.doesNotMatch(p.description, /(?:once|twice) per encounter/i);
  }
});
test("at-will attacks can be reused on later turns and repeated conditions add", () => {
  const g = arena(),
    h = g.active,
    e = g.enemies[0];
  h.preview.state.abilities.push("power-ember-lance");
  g.usePower("power-ember-lance", e.id);
  assert.match(g.powerReason("power-ember-lance"), /No main/);
  g.budget.remaining.main = 1;
  g.usePower("power-ember-lance", e.id);
  assert.equal(R.conditionSummary(e.conditions).burning.rating, 2);
  g.powerCondition(e, "burning", 2, h.id);
  assert.equal(R.conditionSummary(e.conditions).burning.rating, 4);
  assert.equal(h.powerUses["power-ember-lance"], undefined);
});
test("wall slams deal collision damage and impact investments amplify it", () => {
  const g = arena(),
    h = g.active,
    e = g.enemies[0];
  delete g.map.tiles["3,5"];
  g.powerForceMove(e, { x: -1, z: 0 }, 2, h);
  assert.equal(e.hp, 97); // Dummy has physical DR 1: 4 impact becomes 3.
  assert.equal(e.x, 4);
  h.build = { talents: { crash: 1 }, specializations: {} };
  g.powerForceMove(e, { x: -1, z: 0 }, 2, h);
  assert.equal(e.hp, 92); // Impact mastery raises 4 to 6, before DR.
});
test("mastery spending, capstones, refunds and specialization costs are enforced", () => {
  const g = fresh(),
    h = g.active;
  assert.equal(masteryBudget(h), 2);
  g.editBuild(0, { talent: "heavy-hands", delta: 1 });
  g.editBuild(0, { talent: "heavy-hands", delta: 1 });
  assert.equal(g.buildStat(h, "physical"), 2);
  assert.throws(() => g.editBuild(0, { talent: "stride", delta: 1 }), /budget/);
  assert.equal(masterySpent(h), 2);
  assert.throws(
    () => g.editBuild(0, { talent: "colossus", delta: 1 }),
    /rank|prerequisites/,
  );
  g.editBuild(0, { reset: true });
  const id = g
    .powerIds(h)
    .find((id) => POWERS[id]?.effects.some((e) => e.kind === "damage"));
  g.editBuild(0, { power: id, specialization: "sweeping" });
  assert.equal(g.powerSpec(id).radius, (POWERS[id].radius ?? 0) + 1);
  assert.equal(g.powerSpec(id).damageModifier, -2);
  assert.equal(masterySpent(h), 1);
  const saved = deserialize(serialize(g.snapshot())),
    copy = fresh();
  copy.load(saved, { resume: false });
  assert.deepEqual(copy.party[0].build, h.build);
  const bad = deserialize(serialize(g.snapshot()));
  bad.party[0].build.talents = { "heavy-hands": 99 };
  assert.throws(() => copy.load(bad), /mastery/);
});
test("specialized attacks use their actual area, tradeoff and action cost", () => {
  const g = arena(),
    h = g.active,
    e = g.enemies[0];
  h.preview.state.abilities.push("power-ember-lance");
  const second = { ...e, id: "other", x: 3, conditions: [] };
  g.enemies.push(second);
  g.encounter.roster.push({
    id: second.id,
    side: "opposition",
    withdrawn: false,
  });
  h.build = {
    talents: {},
    specializations: { "power-ember-lance": "sweeping" },
  };
  g.usePower("power-ember-lance", e.id);
  assert.ok(e.hp < 100);
  assert.ok(second.hp < 100);
  const move = arena();
  move.active.preview.state.abilities.push("power-vault");
  move.active.build = {
    talents: {},
    specializations: { "power-vault": "longstride" },
  };
  move.usePower("power-vault", { x: 8, z: 5 });
  assert.equal(move.budget.remaining.main, 0);
  assert.equal(move.budget.remaining.maneuver, 1);
});
test("shatter, wet lightning chains, concealment bonuses and healing support are real effects", () => {
  const g = arena(),
    h = g.active,
    e = g.enemies[0];
  h.build = { talents: { fracture: 1 }, specializations: {} };
  g.powerCondition(e, "freezing", 2, h.id);
  assert.equal(g.buildDamage(h, e, {}, "physical", 1), 4);
  assert.equal(R.conditionSummary(e.conditions).freezing.rating, 1);
  const second = { ...e, id: "other", x: 3, hp: 20, conditions: [] };
  g.enemies.push(second);
  g.createSurface("water", [{ x: e.x, z: e.z }], h);
  g.buildAfterHit(h, e, {}, "lightning");
  assert.equal(second.hp, 18);
  h.build = { talents: { ambusher: 1 }, specializations: {} };
  assert.equal(g.buildDamage(h, e, {}, "mental", 1, true), 6);
  h.build = {
    talents: { renewal: 1, "rallying-care": 1 },
    specializations: {},
  };
  h.preview.state.abilities.push("power-vital-spark");
  const ally = g.party[1],
    hp = ally.survival.hp;
  ally.survival.hp -= 5;
  g.usePower("power-vital-spark", ally.id);
  assert.equal(ally.survival.hp, hp - 2);
  assert.equal(g.powerStat(ally, "movement"), 1);
});
test("field healing is at will but checks supplies instead of creating free rest loops", () => {
  const g = fresh(),
    h = g.active;
  h.preview.state.abilities.push("power-vital-spark");
  h.survival.hp -= 4;
  assert.match(g.powerReason("power-vital-spark"), /field dressing/);
  (h.treasure ??= []).push(
    ordinaryItem(g.C, "item-field-dressing", "test-dressing"),
  );
  g.refreshHero(h);
  h.preview.state.abilities.push("power-vital-spark");
  let checked = false;
  g.checkSupply = () => {
    checked = true;
  };
  g.usePower("power-vital-spark", h.id);
  assert.equal(checked, true);
});
test("creation equipment can be handed over and dropped, without duplication or supply refills", () => {
  const g = fresh(),
    h = g.party[0],
    target = g.party[1];
  const item = h.preview.inventory.items.find(
    (i) => i.catalogId === "item-food-bundle",
  );
  assert.ok(item);
  const before = h.preview.inventory.bulk;
  h.supplies[item.instanceId] = 2;
  g.transferTreasure(0, item.instanceId, 1);
  assert.equal(
    h.preview.inventory.items.some((i) => i.instanceId === item.instanceId),
    false,
  );
  assert.ok(h.preview.inventory.bulk < before);
  const moved = target.treasure.find((i) =>
    i.instanceId.includes(item.instanceId),
  );
  assert.equal(target.supplies[moved.instanceId], 2);
  g.mode = "exploration";
  g.dropItem(1, moved.instanceId);
  const pile = g.map.chests.find((c) => c.dropped);
  assert.equal(pile.items[0].supplyRemaining, 2);
  const saved = deserialize(serialize(g.snapshot())),
    copy = fresh();
  copy.load(saved, { resume: false });
  copy.mode = "exploration";
  copy.takeTreasure(`coffer:${pile.id}`, moved.instanceId, 1);
  assert.equal(copy.party[1].supplies[moved.instanceId], 2);
  assert.equal(
    copy.party[0].preview.inventory.items.some(
      (i) => i.instanceId === item.instanceId,
    ),
    false,
  );
  assert.equal(copy.map.chests.find((c) => c.id === pile.id).items.length, 0);
});
test("named magical finds and boss relics never repeat within a saved run", () => {
  const g = fresh(),
    seen = new Set();
  for (let n = 0; n < 100; n++) {
    const i = g.uniqueMagic(42, 5);
    assert.ok(i);
    assert.equal(seen.has(i.definition.name), false);
    seen.add(i.definition.name);
  }
  const relics = [];
  for (let n = 0; n < Object.keys(RELICS).length; n++) {
    const i = g.uniqueMagic(99, 5, { boss: true });
    assert.ok(i.relic);
    relics.push(i.relic);
  }
  assert.equal(new Set(relics).size, Object.keys(RELICS).length);
  const copy = fresh();
  copy.load(deserialize(serialize(g.snapshot())), { resume: false });
  assert.equal(seen.has(copy.uniqueMagic(42, 5).definition.name), false);
  assert.equal(copy.uniqueMagic(99, 5, { boss: true }).relic, null);
});
test("relic effects require disciplines, survive reload, and modify build statistics", () => {
  const g = fresh(),
    h = g.active,
    i = magicItem(123, 5, { relic: "cinder-crown" });
  i.worn = true;
  (h.treasure ??= []).push(i);
  g.refreshHero(h);
  assert.equal(g.buildStat(h, "wildfire"), 0);
  h.preview.state.ranks["discipline-flame"] = 1;
  // Refreshing acquisition effects follows the same discipline gates as ordinary enchantments.
  h.draft.purchases[1].push({ id: "discipline-flame", rank: 1 });
  // A deliberately full example draft may not have DP; use a clean creation pool.
  h.draft.purchases[1] = [{ id: "discipline-flame", rank: 1 }];
  g.refreshHero(h);
  assert.equal(h.preview.valid, true);
  assert.equal(g.buildStat(h, "wildfire"), 1);
  const copy = fresh();
  copy.load(deserialize(serialize(g.snapshot())), { resume: false });
  assert.equal(copy.buildStat(copy.active, "wildfire"), 1);
});
test("earned levels can actually be committed, unlock mastery, and preserve missing HP", () => {
  const g = fresh(),
    h = g.active;
  h.survival.hp -= 4;
  const hp = h.survival.hp;
  g.awardXP("level-test", xpForLevel(2), "First expedition");
  assert.equal(h.earnedLevel, 2);
  const d = structuredClone(h.draft);
  d.progression = { level: 2, levels: { 2: R.emptyLevelDraft() } };
  g.develop(0, d);
  assert.equal(h.preview.state.level, 2);
  assert.equal(masteryBudget(h), 4);
  assert.equal(h.survival.hp, hp);
  assert.ok(h.preview.development.current > 0);
  const saved = deserialize(serialize(g.snapshot()));
  delete saved.xpCurve;
  saved.party[0].xp = 2250;
  const copy = fresh();
  copy.load(saved, { resume: false });
  assert.equal(copy.party[0].xp, 2250);
  assert.ok(copy.party[0].earnedLevel > 2);
});

test("overlapping at-will fields cannot multiply ticks or healing, including after reload", () => {
  const g = arena(),
    h = g.active,
    e = g.enemies[0];
  const cell = [{ x: e.x, z: e.z }];
  g.createSurface("fire", cell, h, 3);
  assert.equal(e.hp, 98);
  g.createSurface("fire", cell, h, 3);
  g.createSurface("fire", cell, g.party[1], 3);
  assert.equal(e.hp, 98);
  assert.equal(g.map.zones.length, 2);
  h.survival.hp = 1;
  const home = [{ x: h.x, z: h.z }];
  g.createSurface("healing", home, h, 3);
  g.createSurface("healing", home, g.party[1], 3);
  g.surfaceContact(h);
  assert.equal(h.survival.hp, 3);
  g.createSurface("healing", home, h, 3);
  g.surfaceContact(h);
  assert.equal(h.survival.hp, 3);
  const copy = fresh();
  copy.load(deserialize(serialize(g.snapshot())), { resume: false });
  copy.surfaceContact(copy.active);
  assert.equal(copy.active.survival.hp, 3);
});
test("damage tradeoffs cannot create negative components or damage through immunity", () => {
  const g = arena(),
    h = g.active;
  h.build = { talents: { "glass-cannon": 1 }, specializations: {} };
  assert.equal(g.absorbPowerDamage(h, 0, "fire"), 0);
  assert.equal(g.absorbPowerDamage(h, 1, "physical"), 3);
});

test("every offered specialization changes playable effects, not just its action label", () => {
  const g = fresh(),
    h = g.active;
  for (const p of Object.values(POWERS))
    for (const choice of specializationOptions(p)) {
      h.build = { talents: {}, specializations: { [p.id]: choice.id } };
      const spec = g.powerSpec(p.id, h);
      const behavior = (p) => ({
        effects: p.effects,
        range: p.range,
        radius: p.radius,
        shape: p.shape,
        damage: p.damageModifier,
      });
      assert.notDeepEqual(behavior(spec), behavior(p), `${p.id}: ${choice.id}`);
    }
});

test("elemental bows amplify their enchantment and conduct on basic and learned weapon attacks", () => {
  for (const action of ["ability-basic-ranged", "power-leg-shot"]) {
    const g = arena(),
      h = g.active,
      e = g.enemies[0];
    g.mode = "town";
    for (const i of [...h.preview.inventory.items].filter((i) => i.held))
      g.equip(0, i.instanceId, "stow");
    const bow = magicItem(50500, 5, { relic: "thunderwake" });
    h.treasure ??= [];
    h.treasure.push(
      bow,
      ordinaryItem(g.C, "item-ammunition-bundle", "test-arrows"),
    );
    g.refreshHero(h);
    g.equip(0, bow.instanceId, "ready");
    // Qualified combat fixture; persistence/gating is separately checked with legal drafts.
    h.preview.state.ranks["discipline-storm"] = 2;
    h.preview.equipmentEffects = bow.effects;
    h.preview.state.abilities.push(action);
    h.build = { talents: { voltage: 1 }, specializations: {} };
    assert.equal(g.enchantmentDamage(h, bow.effects[0], "physical"), 4);
    const second = { ...e, id: "wet-neighbor", x: 3, conditions: [] };
    g.enemies.push(second);
    g.encounter.roster.push({
      id: second.id,
      side: "opposition",
      withdrawn: false,
    });
    g.createSurface("water", [{ x: e.x, z: e.z }], h);
    g.mode = "combat";
    g.useAbility(action, e.id);
    assert.ok(e.hp < 100, action);
    assert.equal(second.hp, 95, `${action} must conduct 2 + relic chain 3`);
  }
});
