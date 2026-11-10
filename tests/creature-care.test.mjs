import test from "node:test";
import assert from "node:assert/strict";
import { arena, C, R } from "./forge-fixture.mjs";
import { safestReachableCells, traversalCost } from "../src/core/movement.mjs";
import { surfaceAt } from "../src/core/battlefield.mjs";
import { key, distance } from "../src/core/dungeon.mjs";

function enemy(type = "wolf", id = "foe", x = 5, z = 5) {
  const c = C.creatures.creatures.find((c) => c.id === `creature-${type}`);
  return {
    id,
    type: c.id,
    name: c.name,
    x,
    z,
    hp: c.hp.max,
    maxHp: c.hp.max,
    conditions: [],
    group: 1,
    aiState: {},
    powerTurn: 0,
  };
}
function fixture(type) {
  const g = arena(),
    e = enemy(type);
  g.party.forEach((h, i) => Object.assign(h, { x: 10 + i, z: 12 }));
  g.enemies = [e];
  g.canBlock = () => false;
  g.canOpportunity = () => false;
  g.encounter = R.startEncounter(
    [
      ...g.party.map((h) => ({ id: h.id, side: "players" })),
      { id: e.id, side: "opposition" },
    ],
    [1, 1, 1],
  );
  g.enemyManeuver(e);
  return { g, e };
}
const condition = (key, rating = 2, persistence = "temporary") => ({
  id: key,
  key,
  rating,
  persistence,
  source: "test",
  order: 0,
});
function field(g, cells, kind = "fire") {
  g.map.zones.push({
    id: kind,
    kind,
    cells,
    source: "test",
    expires: null,
    hits: {},
  });
}

test("safer detours obey the actual movement budget, retaining a shorter risky fallback", () => {
  const map = { tiles: {}, obstacles: {}, zones: [] };
  for (let x = 0; x <= 4; x++)
    for (let z = 0; z <= 1; z++) map.tiles[key(x, z)] = { x, z };
  const start = { x: 0, z: 1 },
    blocked = new Set(),
    cost = (p) => (p.x === 2 && p.z === 0 ? 2 : 1),
    risk = (p) => (p.x === 2 && p.z === 1 ? 1 : 0);
  const to = (budget) =>
    safestReachableCells(map, start, budget, blocked, cost, risk).find(
      (p) => p.x === 4 && p.z === 1,
    );
  assert.equal(to(4).risk, 1);
  assert.equal(to(4).cost, 4);
  assert.equal(to(5).risk, 0);
  assert.equal(to(5).cost, 5);
  assert.ok(to(5).points.every((p) => !risk(p)));
});

test("leaving a harmful field outranks staying adjacent to attack, even without a visible hero", () => {
  for (const visible of [true, false]) {
    const { g, e } = fixture();
    Object.assign(g.party[0], visible ? { x: 6, z: 5 } : { x: 50, z: 50 });
    field(g, [{ x: 5, z: 5 }]);
    g.enemyTurn();
    assert.ok(!surfaceAt(g.map, e, "fire"));
    assert.ok(distance(e, { x: 5, z: 5 }) <= g.enemySpeed(e));
  }
});

test("creature routes avoid fire detours and stay within difficult-ground budgets", () => {
  const { g, e } = fixture("bone-archer");
  Object.assign(g.party[0], { x: 10, z: 5 });
  field(g, [
    { x: 6, z: 5 },
    { x: 7, z: 5 },
    { x: 8, z: 5 },
  ]);
  g.map.tiles[key(6, 4)].difficult = true;
  const points = g.enemyPlanMovement(e, g.party[0], g.creatureAction(e));
  assert.ok(points.every((p) => !surfaceAt(g.map, p, "fire")));
  assert.ok(
    points.reduce((n, p) => n + traversalCost(g.map, [...g.party, e], p), 0) <=
      g.enemySpeed(e),
  );
});

test("burning creatures seek reachable water and extinguish through normal surface contact", () => {
  const { g, e } = fixture();
  Object.assign(g.party[0], { x: 6, z: 5 });
  e.conditions = [condition("burning", 3)];
  field(g, [{ x: 4, z: 5 }], "water");
  const points = g.enemyPlanMovement(e, g.party[0], g.creatureAction(e));
  assert.deepEqual(points.at(-1), { x: 4, z: 5 });
  g.encounter = R.chooseParticipant(g.encounter, e.id);
  g.enemyTravel(e, g.party[0], points);
  assert.equal(R.conditionSummary(e.conditions).burning.rating, 0);
});

test("water does not attract creatures whose Burning comes only from a starred wound", () => {
  const { g, e } = fixture();
  Object.assign(g.party[0], { x: 6, z: 5 });
  e.conditions = [condition("burning", 3, "starred")];
  field(g, [{ x: 4, z: 5 }], "water");
  const points = g.enemyPlanMovement(e, g.party[0], g.creatureAction(e));
  assert.ok(!points.length || points.at(-1).x !== 4 || points.at(-1).z !== 5);
});

test("condition aid costs the Main action, supports an adjacent ally and preserves persistent sources", () => {
  const { g, e } = fixture("orc-warcaller"),
    ally = enemy("orc-shieldbreaker", "ally", 6, 5);
  ally.conditions = [
    condition("burning", 3),
    { ...condition("burning", 1, "starred"), id: "injury" },
  ];
  g.enemies.push(ally);
  assert.equal(g.enemyCare(e), true);
  assert.equal(R.conditionSummary(ally.conditions).burning.rating, 3);
  assert.equal(ally.conditions.find((c) => c.id === "injury").rating, 1);
  assert.ok(!e.retained.includes("main"));
  assert.equal(g.enemyCare(e), false);
  assert.ok(g.log.some((s) => s.includes("Smother flames")));
});

test("incapacity, missing action, ally range/line of sight and persistent-only conditions constrain aid", () => {
  for (const reason of [
    "paralyzed",
    "no-main",
    "range",
    "wall",
    "persistent",
  ]) {
    const { g, e } = fixture(),
      ally = enemy("wolf", "ally", 6, 5);
    ally.conditions = [
      condition(
        "burning",
        3,
        reason === "persistent" ? "starred" : "temporary",
      ),
    ];
    g.enemies.push(ally);
    if (reason === "paralyzed") e.conditions = [condition("paralyzed", 1)];
    if (reason === "no-main") e.retained = ["maneuver"];
    if (reason === "range") ally.x = 9;
    if (reason === "wall") delete g.map.tiles[key(6, 5)];
    assert.equal(g.enemyCare(e), false, reason);
  }
});

test("grappled creatures cannot gain escape movement and paid care cannot restore ally HP", () => {
  const { g, e } = fixture(),
    ally = enemy("wolf", "ally", 6, 5);
  g.enemies.push(ally);
  e.conditions = [
    condition("grappled", 2, "maintained"),
    condition("burning", 3),
  ];
  field(g, [{ x: 5, z: 5 }]);
  assert.deepEqual(g.enemyPlanMovement(e, g.party[0], g.creatureAction(e)), []);
  ally.hp = 1;
  const hp = ally.hp;
  g.enemyCare(e);
  assert.equal(ally.hp, hp);
  assert.ok(!e.retained.includes("main"));
});

test("printed support chooses a temporary condition it can actually reduce", () => {
  const { g, e } = fixture("orc-warcaller"),
    ally = enemy("orc-shieldbreaker", "ally", 6, 5);
  ally.conditions = [
    condition("dazed", 2, "starred"),
    condition("frightened", 2),
  ];
  g.enemies.push(ally);
  g.enemyTacticalManeuver(e, g.party[0]);
  assert.equal(R.conditionSummary(ally.conditions).frightened.rating, 1);
  assert.equal(R.conditionSummary(ally.conditions).dazed.rating, 2);
});

test("a full enemy turn aids an adjacent burning ally before moving away to attack", () => {
  const { g, e } = fixture("orc-warcaller"),
    ally = enemy("orc-shieldbreaker", "ally", 6, 6);
  Object.assign(g.party[0], { x: 8, z: 5 });
  ally.conditions = [condition("burning", 3)];
  g.enemies.push(ally);
  const hp = g.party[0].survival.hp;
  g.enemyTurn();
  assert.equal(e.aiState.action, "Smother flames");
  assert.equal(R.conditionSummary(ally.conditions).burning.rating, 2);
  assert.equal(g.party[0].survival.hp, hp);
  assert.ok(!e.retained.includes("main"));
});

test("escape still provokes a normal melee reaction, and prone escape works without a visible target", () => {
  const { g, e } = fixture();
  Object.assign(g.party[0], { x: 6, z: 5 });
  g.canOpportunity = () => true;
  field(
    g,
    Object.values(g.map.tiles).filter((p) => distance(p, e) <= 2),
  );
  g.enemyTurn();
  assert.equal(g.pendingProvocation?.operation.kind, "enemy-move");
  assert.equal(g.pendingProvocation?.actor, e.id);
  const hidden = fixture();
  hidden.g.party.forEach((h) => Object.assign(h, { x: 50, z: 50 }));
  hidden.e.conditions = [condition("prone", 1, "binary")];
  field(hidden.g, [{ x: 5, z: 5 }]);
  assert.doesNotThrow(() => hidden.g.enemyTurn());
  assert.ok(!surfaceAt(hidden.g.map, hidden.e, "fire"));
});
