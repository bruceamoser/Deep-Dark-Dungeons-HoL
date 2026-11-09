import test from "node:test";
import assert from "node:assert/strict";
import { arena, C, R } from "./forge-fixture.mjs";
import { Game } from "../src/core/game.mjs";
import { CREATURE_ROSTER } from "../src/core/creature-roster.mjs";
import { CREATURE_GOALS, coneCells } from "../src/core/creature-ai.mjs";
import { distance, key } from "../src/core/dungeon.mjs";

function enemy(g, type, id = "foe", x = 4, z = 5) {
  const c = C.creatures.creatures.find((c) => c.id === `creature-${type}`);
  return {
    id,
    type: c.id,
    name: c.name,
    x,
    z,
    group: 1,
    hp: c.hp.max,
    maxHp: c.hp.max,
    stability: c.defenses.stability,
    ammunition: 6,
    conditions: [],
    powerTurn: 1,
    aiState: {},
  };
}
function combat(type = "wolf") {
  const g = arena();
  g.map.lights[0].radius = 12;
  const e = enemy(g, type);
  g.enemies = [e];
  g.party.forEach((h, i) => Object.assign(h, { x: 10 + i, z: 12 }));
  g.encounter = R.startEncounter(
    [
      ...g.party.map((h) => ({ id: h.id, side: "players" })),
      { id: e.id, side: "opposition" },
    ],
    [1, 1, 1],
  );
  g.advance = () => {};
  g.canBlock = () => false;
  g.canOpportunity = () => false;
  g.enemyManeuver(e);
  return { g, e };
}
function condition(key, rating = 1, source = "test") {
  return {
    id: `test-${key}`,
    key,
    rating,
    source,
    persistence: key === "prone" ? "binary" : "temporary",
    order: 0,
  };
}

test("all 58 roster creatures have goals and every printed main action is selectable", () => {
  const { g } = combat();
  assert.equal(Object.keys(CREATURE_ROSTER).length, 58);
  for (const type of Object.keys(CREATURE_ROSTER)) {
    const e = enemy(g, type.replace("creature-", ""));
    assert.ok(CREATURE_GOALS[g.enemyPersonality(e)], type);
    const actions = g.creatureActions(e),
      card = g.creature(e);
    assert.equal(actions.length, card.actions.main.actions.length, type);
    for (const a of actions) {
      assert.ok(a.available, type + ":" + a.name);
      assert.ok(a.range >= 1);
      assert.deepEqual(a.outcomes, card.actions.main.actions[a.index].outcomes);
    }
  }
});

test("pack hunters choose a shared quarry instead of the nearest hero", () => {
  const { g, e } = combat();
  Object.assign(e, { x: 5, z: 5 });
  const [near, quarry] = g.party;
  Object.assign(near, { x: 6, z: 5 });
  Object.assign(quarry, { x: 9, z: 5 });
  const ally = enemy(g, "wolf", "packmate", 10, 5);
  ally.aiState.target = quarry.id;
  g.enemies.push(ally);
  assert.equal(g.enemyTarget(e), quarry);
});

test("duelists spread across opponents and retain their own duel", () => {
  const { g, e } = combat("masked-duelist");
  Object.assign(e, { x: 5, z: 5 });
  const [first, second] = g.party;
  Object.assign(first, { x: 6, z: 5 });
  Object.assign(second, { x: 8, z: 5 });
  const other = enemy(g, "masked-duelist", "other", 6, 4);
  other.aiState.target = first.id;
  g.enemies.push(other);
  assert.equal(g.enemyTarget(e), second);
  e.aiState.target = second.id;
  other.aiState.target = undefined;
  assert.equal(g.enemyTarget(e), second);
});

test("taunts override personality while hidden and wall-occluded heroes are not tracked", () => {
  const { g, e } = combat();
  const [a, b] = g.party;
  Object.assign(a, { x: 5, z: 5 });
  Object.assign(b, { x: 8, z: 5 });
  g.powerBuff(a, e, { taunt: true }, 3, "taunt-test");
  assert.equal(g.enemyTarget(e), a);
  a.powerEffects = [
    {
      id: "hidden",
      source: a.id,
      expiresAt: 1000,
      expiresTurn: 10,
      stats: { hidden: true },
    },
  ];
  Object.assign(a, { x: 6, z: 5 });
  assert.equal(g.enemyVisibleTargets(e).includes(a), false);
  delete g.map.tiles[key(5, 5)];
  assert.equal(g.enemyVisibleTargets(e).includes(b), false);
});

test("archers seek firing distance through legal weighted terrain and keep within movement budget", () => {
  const { g, e } = combat("bone-archer");
  Object.assign(e, { x: 5, z: 5 });
  Object.assign(g.party[0], { x: 6, z: 5 });
  const action = g.creatureAction(e),
    points = g.enemyPlanMovement(e, g.party[0], action);
  assert.ok(points.length > 0);
  assert.ok(points.length <= g.enemySpeed(e));
  assert.ok(distance(points.at(-1), g.party[0]) >= 3);
  assert.ok(distance(points.at(-1), g.party[0]) <= action.range);
  for (const p of points) {
    assert.ok(g.map.tiles[key(p.x, p.z)]);
    assert.ok(!g.occupied(e.id).has(key(p.x, p.z)));
  }
  e.conditions = [condition("slowed", 3)];
  const slow = g.enemyPlanMovement(e, g.party[0], action);
  assert.ok(slow.length <= g.enemySpeed(e));
});

test("third specialty actions are used and nonconsecutive attacks respect their cooldown regardless of defense", () => {
  const { g, e } = combat("crypt-ghoul");
  const h = g.party[0];
  Object.assign(h, { x: 5, z: 5 });
  const special = g.enemyChooseAction(e, h);
  assert.equal(special.name, "Grave touch");
  e.aiState.action = special.name;
  g.resolveEnemyHit(e, h);
  e.powerTurn = 2;
  assert.equal(
    g.creatureActions(e).find((a) => a.name === "Grave touch").available,
    false,
  );
  assert.equal(g.enemyChooseAction(e, h).name, "Raking claws");
  e.powerTurn = 3;
  assert.equal(
    g.creatureActions(e).find((a) => a.name === "Grave touch").available,
    true,
  );
});

test("ammunition exhaustion disables projectile actions without disabling innate ranged attacks", () => {
  const { g, e } = combat("bone-archer");
  e.ammunition = 0;
  assert.equal(g.creatureAction(e).name, "Basic Melee");
  const air = enemy(g, "air-elemental");
  air.ammunition = 0;
  assert.equal(g.creatureAction(air).name, "Hammering gust");
});

test("support maneuvers help a hearing afflicted ally and spend only one maneuver", () => {
  const { g, e } = combat("orc-warcaller"),
    ally = enemy(g, "orc-shieldbreaker", "ally", 5, 5);
  g.enemies.push(ally);
  ally.conditions = [condition("dazed", 2)];
  Object.assign(g.party[0], { x: 8, z: 5 });
  g.enemyTacticalManeuver(e, g.party[0]);
  assert.equal(R.conditionSummary(ally.conditions).dazed.rating, 1);
  g.enemyTacticalManeuver(e, g.party[0]);
  assert.equal(R.conditionSummary(ally.conditions).dazed.rating, 1);
  assert.ok(g.log.some((s) => s.includes("Keep the Rhythm")));
});

test("offensive maneuvers apply printed conditions and are withheld when incapacitated", () => {
  const { g, e } = combat("goblin-firestarter");
  Object.assign(g.party[0], { x: 5, z: 5 });
  g.enemyTacticalManeuver(e, g.party[0]);
  assert.equal(R.conditionSummary(g.party[0].conditions).burning.rating, 1);
  const { g: disabled, e: stunned } = combat("goblin-firestarter");
  Object.assign(disabled.party[0], { x: 5, z: 5 });
  stunned.conditions = [condition("paralyzed")];
  disabled.enemyTacticalManeuver(stunned, disabled.party[0]);
  assert.equal(disabled.party[0].conditions.length, 0);
});

test("terrain maneuvers create legal connected fields and once-scene use persists", () => {
  const { g, e } = combat("kobold-trapkeeper");
  Object.assign(g.party[0], { x: 7, z: 5 });
  g.enemyTacticalManeuver(e, g.party[0]);
  const zone = g.map.zones.find((z) => z.source === e.id);
  assert.equal(zone.kind, "difficult");
  assert.equal(zone.cells.length, 2);
  assert.equal(distance(zone.cells[0], zone.cells[1]), 1);
  for (const p of zone.cells) assert.ok(!g.occupied().has(key(p.x, p.z)));
  assert.ok(e.aiState.sceneUsed.includes("Scatter caltrops"));
  e.powerTurn++;
  g.enemyManeuver(e);
  g.enemyTacticalManeuver(e, g.party[0]);
  assert.equal(g.map.zones.filter((z) => z.source === e.id).length, 1);
});

test("temporary terrain expires on its owner's next turn", () => {
  const { g, e } = combat("icebound-warden");
  Object.assign(g.party[0], { x: 7, z: 5 });
  g.enemyTacticalManeuver(e, g.party[0]);
  assert.ok(g.map.zones.some((z) => z.source === e.id));
  e.powerTurn++;
  g.enemyManeuver(e);
  assert.equal(g.map.zones.filter((z) => z.source === e.id).length, 0);
});

test("Roll Away follows a straight legal route and does not grant wall traversal", () => {
  const { g, e } = combat("goblin-spearhand");
  Object.assign(g.party[0], { x: 5, z: 5 });
  // Spear reach makes gaining separation useful after its ordinary move.
  const m = g.enemyMobilityManeuver(e, g.party[0], ["Roll Away"]);
  assert.ok(m);
  assert.equal(m.ignore, "all");
  assert.ok(m.points.length <= 2);
  const dx = m.points[0].x - e.x,
    dz = m.points[0].z - e.z;
  m.points.forEach((p, i) =>
    assert.deepEqual(p, { x: e.x + dx * (i + 1), z: e.z + dz * (i + 1) }),
  );
});

test("wolf holds bind both sides, cannot stack their own contribution, and can be broken with a paid action", () => {
  const { g, e } = combat();
  const h = g.party[0];
  Object.assign(h, { x: 5, z: 5 });
  g.creatureHold(e, h, 1);
  g.creatureHold(e, h, 1);
  assert.equal(R.conditionSummary(h.conditions).grappled.rating, 1);
  assert.equal(R.conditionSummary(e.conditions).grappled.rating, 1);
  assert.equal(g.enemySpeed(e), 0);
  g.encounter = R.startEncounter(
    [
      ...g.party.map((h) => ({ id: h.id, side: "players" })),
      { id: e.id, side: "opposition" },
    ],
    [6, 6, 6],
  );
  g.beginHero(["main", "maneuver"]);
  g.useAbility("power-break-free", h.id);
  assert.equal(g.budget.remaining.main, 0);
  assert.equal(R.conditionSummary(h.conditions).grappled.rating, 0);
  assert.equal(R.conditionSummary(e.conditions).grappled.rating, 0);
  g.creatureHold(e, h, 1);
  e.hp = 0;
  g.emit("change");
  assert.equal(R.conditionSummary(h.conditions).grappled.rating, 0);
});

test("cone attacks hit each occupied square once including allies and respect walls", () => {
  const { g, e } = combat("winter-wolf");
  Object.assign(e, { x: 4, z: 5 });
  const [a, b] = g.party;
  Object.assign(a, { x: 5, z: 5 });
  Object.assign(b, { x: 6, z: 5 });
  const ally = enemy(g, "wolf", "ally", 6, 6);
  ally.hp = 100;
  g.enemies.push(ally);
  const hits = [];
  g.suffer = (h, damage) => hits.push([h.id, damage]);
  g.dice = (n = 3) => Array(n).fill(1);
  const action = g.creatureAction(e);
  assert.equal(action.area, "cone");
  assert.equal(coneCells(e, a).length, 9);
  g.enemyConeAttack(e, a, action);
  assert.equal(hits.length, 2);
  assert.equal(new Set(hits.map((h) => h[0])).size, 2);
  assert.ok(ally.hp < 100);
  assert.equal(e.aiState.lastActions[action.name], 1);
  hits.length = 0;
  delete g.map.tiles[key(5, 5)];
  g.enemyConeAttack(e, a, action);
  assert.ok(!hits.some((h) => h[0] === b.id));
});

test("tactical choices and cooldowns survive saves and malformed state is rejected", () => {
  const { g, e } = combat("crypt-ghoul");
  e.aiState = {
    target: g.party[1].id,
    action: "Grave touch",
    lastActions: { "Grave touch": 1 },
    sceneUsed: [],
  };
  const saved = structuredClone(g.snapshot()),
    copy = new Game(R, C);
  copy.load(saved, { resume: false });
  assert.deepEqual(copy.enemies[0].aiState, e.aiState);
  saved.floor.enemies[0].aiState.lastActions["Grave touch"] = -1;
  assert.throws(() => copy.load(saved, { resume: false }), /tactics/);
});

test("a complete archer turn repositions and fires instead of defaulting to point-blank melee", () => {
  const { g, e } = combat("bone-archer");
  Object.assign(e, { x: 5, z: 5 });
  Object.assign(g.party[0], { x: 6, z: 5 });
  g.enemyTurn();
  assert.equal(e.aiState.action, "Dusty arrow");
  assert.ok(distance(e, g.party[0]) >= 3);
  assert.ok(g.log.some((s) => s.includes("Dusty arrow")));
  assert.equal(g.encounter.current, null);
});

test("creatures unable to retain a Main cannot attack or gain a free maneuver", () => {
  const { g, e } = combat("goblin-firestarter");
  Object.assign(g.party[0], { x: 5, z: 5 });
  e.conditions = [condition("dazed", 3)];
  const before = g.party.map((h) => h.survival.hp);
  g.enemyTurn();
  assert.deepEqual(
    g.party.map((h) => h.survival.hp),
    before,
  );
  assert.equal(e.retained.length, 0);
});

test("an evasive maneuver ignores only its printed chosen opponent, not every opportunity attack", () => {
  const { g, e } = combat("bandit-bow");
  Object.assign(g.party[0], { x: 5, z: 5 });
  Object.assign(g.party[1], { x: 5, z: 6 });
  g.canOpportunity = (a) => !!a.survival;
  e.aiState.evade = g.party[0].id;
  assert.equal(
    g.provoke(
      e,
      { kind: "enemy-move", target: g.party[0].id, points: [{ x: 3, z: 5 }] },
      [{ x: 3, z: 5 }],
    ),
    true,
  );
  assert.deepEqual(g.pendingProvocation.attackers, [g.party[1].id]);
});

test("blood-trail maneuvers search by direction without attacking unseen prey", () => {
  const { g, e } = combat("dire-wolf");
  Object.assign(g.party[0], { x: 8, z: 5 });
  g.party[0].conditions = [condition("bleeding", 1)];
  g.party[0].powerEffects = [
    {
      id: "concealed",
      source: g.party[0].id,
      expiresAt: 1000,
      expiresTurn: 100,
      stats: { hidden: true },
    },
  ];
  const before = g.party[0].survival.hp;
  g.party.slice(1).forEach(
    (h) =>
      (h.powerEffects = [
        {
          id: "concealed",
          source: h.id,
          expiresAt: 1000,
          expiresTurn: 100,
          stats: { hidden: true },
        },
      ]),
  );
  g.enemyTurn();
  assert.ok(e.x > 4);
  assert.equal(g.party[0].survival.hp, before);
  assert.ok(g.log.some((s) => s.includes("Read the Blood Trail")));
});

test("smoke pots clear on the owner's next turn while caltrops have a paid counterplay action", () => {
  const { g, e } = combat("goblin-smoke-slinger");
  Object.assign(g.party[0], { x: 7, z: 5 });
  g.enemyTacticalManeuver(e, g.party[0]);
  assert.ok(g.map.zones.some((z) => z.kind === "smoke"));
  e.powerTurn++;
  g.enemyManeuver(e);
  assert.equal(
    g.map.zones.some((z) => z.kind === "smoke"),
    false,
  );
  const h = g.party[0];
  g.createSurface("difficult", [{ x: 7, z: 6 }], e, 10);
  g.map.zones.at(-1).caltrops = true;
  g.encounter = R.startEncounter(
    [
      ...g.party.map((h) => ({ id: h.id, side: "players" })),
      { id: e.id, side: "opposition" },
    ],
    [6, 6, 6],
  );
  g.beginHero();
  g.useAbility("power-clear-caltrops", { x: 7, z: 6 });
  assert.equal(g.budget.remaining.main, 0);
  assert.equal(
    g.map.zones.some((z) => z.caltrops),
    false,
  );
});

test("opportunity strikes use the creature's own printed Basic Melee profile", () => {
  const { g, e } = combat("bone-archer");
  let received;
  g.rollFor = () => ({ tier: "weak", retained: [1, 1, 1], total: 3 });
  g.suffer = (_h, n) => (received = n);
  g.party[0].preview.resistances = {};
  g.resolveEnemyHit(e, g.party[0], true);
  assert.equal(received, 4);
});

test("Shambling Advance crosses difficult ground at its printed cost", () => {
  const { g, e } = combat("crypt-ghoul");
  Object.assign(g.party[0], { x: 8, z: 5 });
  Object.values(g.map.tiles).forEach((p) => (p.difficult = true));
  const maneuver = g.enemyMobilityManeuver(e, g.party[0], [
    "Shambling Advance",
  ]);
  assert.ok(maneuver);
  assert.equal(maneuver.points.length, 2);
  assert.equal(maneuver.ignore, null);
});

test("expiring creature light relights a readied torch without movement or extra supplies", () => {
  const { g, e } = combat("grave-wisp"),
    h = g.party[0];
  g.map.lights = [];
  Object.assign(h, { x: 5, z: 5 });
  h.preview.inventory.items.forEach((i) => (i.held = false));
  g.syncTorches();
  h.torch.held = true;
  g.syncTorches();
  assert.equal(h.torch.lit, true);
  const before = structuredClone(h.supplies);
  g.enemyTacticalManeuver(e, h);
  // A naturally lit target is not needed; the held torch already provides light,
  // so create the printed temporary field explicitly to exercise its expiry.
  g.createSurface("light", [{ x: h.x, z: h.z }], e, 10);
  g.map.zones.at(-1).npcUntilTurn = 2;
  assert.equal(h.torch.lit, false);
  e.powerTurn = 2;
  g.enemyManeuver(e);
  assert.equal(h.torch.lit, true);
  assert.deepEqual(h.supplies, before);
});
