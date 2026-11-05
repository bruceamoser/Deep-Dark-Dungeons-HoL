import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { generate, pathfind, key, neighbors } from "../src/core/dungeon.mjs";
import { Game } from "../src/core/game.mjs";
import { serialize, deserialize } from "../src/core/save.mjs";
const R = {};
for (const name of [
  "workshop-character",
  "creation",
  "portable-character",
  "roll",
  "damage",
  "survival",
  "wounds",
  "encounter",
  "actions",
  "conditions",
  "inventory",
  "passive-defenses",
])
  Object.assign(R, await import(`../public/vendor/hol/rules/${name}.mjs`));
const data = (n) =>
  JSON.parse(
    fs.readFileSync(
      new URL(`../public/vendor/hol/data/${n}.json`, import.meta.url),
    ),
  );
const C = {
  choices: data("choices").records,
  inventory: data("inventory"),
  wounds: data("wounds"),
  commit: data("choices").sourceCommit,
};
const drafts = [
  "borin-bridgekeeper",
  "lira-ashbow",
  "pip-copperwink",
  "vaelis-emberglass",
].map((id) => data("party").find((p) => p.id === id).draft);
const fresh = () => {
  const g = new Game(R, C);
  g.fresh(drafts);
  return g;
};
test("100 generated floors have connected rooms, valid exits and reproducible topology", () => {
  for (let seed = 0; seed < 100; seed++) {
    const m = generate(seed, 1 + (seed % 12));
    assert.ok(m.rooms.length >= 5);
    assert.ok(pathfind(m, m.start, m.exit).length);
    for (const r of m.rooms)
      assert.ok(
        pathfind(m, m.start, { x: r.cx, z: r.cz }).length || r === m.rooms[0],
      );
    for (const e of m.enemies) assert.ok(m.tiles[key(e.x, e.z)]);
    assert.deepEqual(m, generate(seed, 1 + (seed % 12)));
  }
});
test("pathfinding cannot squeeze diagonally through a blocked corner", () => {
  const m = { tiles: { "0,0": { x: 0, z: 0 }, "1,1": { x: 1, z: 1 } } };
  assert.deepEqual(pathfind(m, { x: 0, z: 0 }, { x: 1, z: 1 }), []);
});
test("all four starting heroes pass complete upstream creation validation", () => {
  const g = fresh();
  assert.deepEqual(
    g.party.map((h) => h.preview.valid),
    [true, true, true, true],
  );
  assert.equal(g.party[0].survival.maxHp, 25);
  assert.equal(g.party[2].preview.summary.speed, 7);
  assert.throws(() =>
    g.hero(
      { ...drafts[0], attributes: { ...drafts[0].attributes, brawn: 5 } },
      0,
    ),
  );
});
test("all 280 wound results and five distinct tables remain bundled", () => {
  assert.equal(C.wounds.records.length, 280);
  for (const table of ["physical", "elemental", "mental", "radiant", "life"])
    assert.equal(C.wounds.records.filter((w) => w.table === table).length, 56);
});
test("net Boons cap at three; natural extremes override attribute total", () => {
  assert.equal(R.rollPlan({ attribute: 2, boons: 8, banes: 1 }).count, 6);
  assert.equal(R.classifyRoll([1, 1, 1], 9).tier, "weak");
  assert.equal(R.classifyRoll([6, 6, 6], -9).tier, "strong");
});
test("safe breath restores HP but never Grit; unresolved wounds block approximation", () => {
  const g = fresh();
  g.descend();
  g.enemies = [];
  g.party[0].survival.hp = 3;
  g.party[0].survival.gritAvailable = 0;
  g.rest();
  assert.equal(g.party[0].survival.hp, 25);
  assert.equal(g.party[0].survival.gritAvailable, 0);
  g.party[0].wounds.push({});
  assert.throws(() => g.rest(), /wounds/);
});
test("combat movement rejects overspending and the second main action", () => {
  const g = fresh();
  g.mode = "combat";
  g.encounter = R.startEncounter(
    [
      { id: g.active.id, side: "players" },
      { id: "e0-0", side: "opposition" },
    ],
    [6, 6, 6],
  );
  g.beginHero();
  g.spend("main", "ability-basic-melee");
  assert.throws(() => g.spend("main", "ability-basic-melee"), /No main/);
  assert.throws(
    () => R.spendMovement(g.budget, { operationId: "overspend", amount: 100 }),
    /Movement/,
  );
});
test("save/load preserves expedition map, bank, wounds and spent Grit", () => {
  const g = fresh();
  g.campaign.bank = 31;
  g.party[0].survival.gritAvailable = 0;
  const text = serialize(g.snapshot());
  const restored = deserialize(text);
  const g2 = new Game(R, C);
  g2.load(restored);
  assert.equal(g2.campaign.bank, 31);
  assert.equal(g2.party[0].survival.gritAvailable, 0);
  assert.deepEqual(g2.map, g.map);
  assert.throws(() => deserialize('{"version":9}'));
});
test("town recruitment validates before replacing a character", () => {
  const g = fresh();
  const before = g.party[0];
  assert.throws(() => g.replace(0, { ...drafts[0], name: "" }));
  assert.equal(g.party[0], before);
  const position = { x: before.x, z: before.z };
  g.replace(0, drafts[1]);
  assert.deepEqual({ x: g.party[0].x, z: g.party[0].z }, position);
  g.descend();
  assert.throws(() => g.replace(0, drafts[1]), /town/);
});

test("every vendored HoL input matches its pinned source hash", async () => {
  const { createHash } = await import("node:crypto");
  const manifest = JSON.parse(
    fs.readFileSync(new URL("../docs/hol-source-lock.json", import.meta.url)),
  );
  for (const record of manifest.records) {
    const bytes = fs.readFileSync(
      new URL("../public/vendor/hol/" + record.destination, import.meta.url),
    );
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      record.sha256,
      record.destination,
    );
  }
});
test("malformed saved hero coordinates are rejected before loading", () => {
  const g = fresh(),
    saved = g.snapshot();
  saved.party[0].x = 999;
  assert.throws(() => deserialize(serialize(saved)), /party data/);
});

const combatFixture = (selected = 0) => {
  const g = fresh();
  g.map = { ...g.map, tiles: {}, obstacles: {}, chests: [] };
  for (let x = 0; x < 12; x++)
    for (let z = 0; z < 12; z++) g.map.tiles[key(x, z)] = { x, z };
  g.party.forEach((h, i) => Object.assign(h, { x: 4 + i, z: 6 }));
  g.enemies = [
    {
      id: "sentry",
      name: "Bone sentry",
      x: 4,
      z: 5,
      hp: 30,
      maxHp: 30,
      conditions: [],
    },
  ];
  g.mode = "combat";
  g.selected = selected;
  g.encounter = R.startEncounter(
    [
      ...g.party.map((h) => ({ id: h.id, side: "players" })),
      { id: "sentry", side: "opposition" },
    ],
    [6, 6, 6],
  );
  g.dice = (n = 3) => Array(n).fill(6);
  g.advance = () => {};
  return g;
};
test("combat walking moves only the acting hero and uses movement independently of actions", () => {
  const g = combatFixture(),
    before = g.party.slice(1).map((h) => ({ x: h.x, z: h.z }));
  g.move({ x: 3, z: 6 });
  g.step();
  assert.deepEqual(
    g.party.slice(1).map((h) => ({ x: h.x, z: h.z })),
    before,
  );
  assert.equal(g.active.x, 3);
  assert.equal(g.movementLeft(), g.active.preview.summary.speed - 1);
  assert.equal(g.budget.remaining.main, 1);
});
test("formations honor marching order, reach distinct slots and survive save/load", () => {
  const g = combatFixture();
  g.mode = "exploration";
  g.enemies = [];
  const order = [...g.party.map((h) => h.id)].reverse();
  g.setFormation("column", order);
  g.move({ x: 7, z: 1 });
  for (let i = 0; i < 60; i++) g.step();
  assert.deepEqual({ x: g.party[3].x, z: g.party[3].z }, { x: 7, z: 1 });
  assert.equal(new Set(g.party.map((h) => key(h.x, h.z))).size, 4);
  const restored = new Game(R, C);
  restored.load(deserialize(serialize(g.snapshot())));
  assert.equal(restored.campaign.formation, "column");
  assert.deepEqual(restored.campaign.order, order);
  assert.throws(() =>
    g.setFormation("column", [order[0], order[0], order[2], order[3]]),
  );
});
test("Cinder Cast uses Knowledge, applies Burning and ticks before decay", () => {
  const g = combatFixture(3),
    e = g.enemies[0];
  g.useAbility("ability-cinder-cast", e.id);
  assert.equal(e.hp, 25);
  assert.equal(e.conditions[0].key, "burning");
  assert.equal(e.conditions[0].rating, 2);
  g.finishEnemyConditions(e);
  assert.equal(e.hp, 23);
  assert.equal(e.conditions[0].rating, 1);
  g.finishEnemyConditions(e);
  assert.equal(e.hp, 22);
  assert.equal(e.conditions.length, 0);
  assert.equal(g.budget.remaining.main, 0);
  assert.throws(() => g.useAbility("ability-rime-grip", e.id), /No main/);
});
test("Rime Grip slows the NPC before Freezing damage and severity decay", () => {
  const g = combatFixture(3),
    e = g.enemies[0];
  g.useAbility("ability-rime-grip", e.id);
  assert.equal(g.enemySpeed(e), 4);
  assert.equal(e.hp, 25);
  g.finishEnemyConditions(e);
  assert.equal(e.hp, 24);
  assert.equal(g.enemySpeed(e), 5);
});
test("unknown cards, missing equipment and invalid targets spend no action", () => {
  const g = combatFixture();
  g.beginHero();
  assert.throws(
    () => g.useAbility("ability-cinder-cast", "sentry"),
    /not learned/,
  );
  assert.throws(() => g.useAbility("ability-basic-ranged", "sentry"), /weapon/);
  assert.throws(
    () => g.useAbility("ability-stabilize", g.party[1].id),
    /Dying/,
  );
  assert.equal(g.budget.remaining.main, 1);
  assert.equal(g.budget.remaining.maneuver, 1);
});
test("Defend stacks with Shield Block, spends the defender's Reaction, and expires at next own turn", () => {
  const g = combatFixture(),
    h = g.active;
  const shield = h.preview.inventory.items.find(
    (i) => i.catalogId === "item-ordinary-shield",
  );
  assert.ok(shield);
  h.draft.loadout = {
    ...h.draft.loadout,
    [shield.instanceId]: { held: true, carried: true },
  };
  h.preview = R.workshopCharacter(h.draft, C);
  g.useAbility("ability-defend");
  assert.equal(h.buffs.defend, true);
  g.encounter = R.finishTurn(g.encounter);
  g.encounter = R.chooseParticipant(g.encounter, "sentry");
  g.pendingDefense = { attacker: "sentry", target: h.id };
  let observed;
  g.roll = (attribute, boons, banes) => {
    observed = { attribute, boons, banes };
    return { ...R.classifyRoll([6, 6, 6], attribute), retained: [6, 6, 6] };
  };
  g.resolveReaction(true);
  assert.equal(observed.boons, 2);
  assert.equal(g.budgets[h.id].remaining.reaction, 0);
  assert.equal(h.buffs.shield, true);
  g.encounter = R.startEncounter(
    [
      { id: h.id, side: "players" },
      { id: "sentry", side: "opposition" },
    ],
    [6, 6, 6],
  );
  g.beginHero();
  assert.deepEqual(h.buffs, {});
});
test("Stabilize clears death marks without restoring HP, Grit or wounds", () => {
  const g = combatFixture(),
    ally = g.party[1];
  ally.survival = R.survivalState({
    hp: 0,
    maxHp: 20,
    marks: 2,
    wounds: 1,
    gritAvailable: 0,
  });
  ally.wounds = [{ test: true }];
  g.useAbility("ability-stabilize", ally.id);
  assert.equal(ally.survival.status, "stable");
  assert.equal(ally.survival.hp, 0);
  assert.equal(ally.survival.marks, 0);
  assert.equal(ally.survival.gritAvailable, 0);
  assert.equal(ally.wounds.length, 1);
});
test("Last Words permits neither movement nor action conversion", () => {
  const g = combatFixture();
  g.active.survival = R.enterLastWords(g.active.survival);
  assert.deepEqual(g.route({ x: 3, z: 6 }), []);
  assert.throws(() => g.convert(), /active hero/);
  assert.throws(() => g.useAbility("ability-defend"), /cannot act/);
});
test("development uses earned levels, preserves creation and spent resources, and cannot refund commitments", () => {
  const g = fresh(),
    h = g.active;
  h.earnedLevel = 2;
  h.survival.hp = 3;
  h.survival.gritAvailable = 0;
  const proposal = structuredClone(h.draft);
  proposal.attributes.brawn = 99;
  proposal.progression = {
    level: 2,
    levels: { 2: { purchases: [], signatures: {}, acquisitions: {} } },
  };
  g.develop(0, proposal);
  assert.equal(h.preview.state.level, 2);
  assert.equal(h.preview.development.current, 10);
  assert.equal(h.draft.attributes.brawn, 1);
  assert.equal(h.survival.hp, 3);
  assert.equal(h.survival.gritAvailable, 0);
  const buy = structuredClone(h.draft);
  buy.progression.levels[2].purchases.push({ id: "ability-conditioned-body" });
  g.develop(0, buy);
  assert.equal(h.survival.hp, 3);
  assert.equal(h.survival.maxHp, 26);
  assert.throws(() => g.develop(0, proposal), /rewritten/);
  const excess = structuredClone(h.draft);
  excess.progression.level = 3;
  assert.throws(() => g.develop(0, excess), /earned level/);
});
test("ranged attacks use the last ammunition before exhausting its die", () => {
  const g = combatFixture(1),
    h = g.active;
  const bow = h.preview.inventory.items.find(
      (i) => i.catalogId === "item-ordinary-ranged-weapon",
    ),
    ammo = h.preview.inventory.items.find(
      (i) => i.catalogId === "item-ammunition-bundle",
    );
  assert.ok(bow);
  assert.ok(ammo);
  g.mode = "exploration";
  g.equip(1, bow.instanceId);
  g.mode = "combat";
  h.supplies[ammo.instanceId] = 4;
  const random = Math.random;
  Math.random = () => 0;
  try {
    g.useAbility("ability-pinning-shot", "sentry");
  } finally {
    Math.random = random;
  }
  assert.equal(g.enemies[0].hp, 26);
  assert.equal(h.supplies[ammo.instanceId], 0);
  assert.equal(g.enemies[0].conditions[0].rating, 2);
});
test("mid-turn save restores the acting caster, spent actions and active conditions", () => {
  const g = combatFixture(3);
  g.useAbility("ability-cinder-cast", "sentry");
  const restored = new Game(R, C);
  restored.load(deserialize(serialize(g.snapshot())));
  assert.equal(restored.selected, 3);
  assert.equal(restored.encounter.current, restored.active.id);
  assert.equal(restored.budget.remaining.main, 0);
  assert.equal(restored.enemies[0].conditions[0].rating, 2);
});
test("pending reaction survives save/load without resolving or duplicating the attack", () => {
  const g = combatFixture();
  g.beginHero();
  g.encounter = R.finishTurn(g.encounter);
  g.encounter = R.chooseParticipant(g.encounter, "sentry");
  g.pendingDefense = { attacker: "sentry", target: g.party[0].id };
  const before = g.party[0].survival.hp;
  const restored = new Game(R, C);
  let prompted = 0;
  restored.listeners.push((type) => {
    if (type === "reaction") prompted++;
  });
  restored.load(deserialize(serialize(g.snapshot())));
  assert.equal(prompted, 1);
  assert.equal(restored.busy, true);
  assert.equal(restored.party[0].survival.hp, before);
  assert.deepEqual(restored.pendingDefense, g.pendingDefense);
});
test("each cleared-depth extraction awards one milestone and never awards it twice", () => {
  const g = fresh();
  g.mode = "exploration";
  g.enemies.forEach((e) => (e.hp = 0));
  g.extract();
  assert.ok(g.party.every((h) => h.earnedLevel === 2));
  g.descend();
  g.extract();
  assert.ok(g.party.every((h) => h.earnedLevel === 2));
});
test("favorite actions are per hero, bounded, validated and survive saves", () => {
  const g = fresh(),
    id = "ability-basic-unarmed",
    before = g.party[0].favorites.includes(id);
  g.favorite(0, id);
  assert.equal(g.party[0].favorites.includes(id), !before);
  assert.throws(() => g.favorite(0, "ability-cinder-cast"), /playable/);
  const copy = fresh();
  copy.load(deserialize(serialize(g.snapshot())));
  assert.deepEqual(copy.party[0].favorites, g.party[0].favorites);
  assert.deepEqual(copy.party[1].favorites, g.party[1].favorites);
});
test("armor wear checks training and swaps resistance without granting HP or Grit", () => {
  const g = fresh(),
    h = g.party[0],
    armor = h.preview.inventory.items.find((i) =>
      /light-armor/.test(i.catalogId),
    );
  h.survival.hp = 3;
  h.survival.gritAvailable = 0;
  g.equip(0, armor.instanceId, "wear");
  assert.equal(h.preview.resistances.physical, 1);
  g.equip(0, armor.instanceId, "remove");
  assert.equal(h.preview.resistances.physical ?? 0, 0);
  assert.equal(h.survival.hp, 3);
  assert.equal(h.survival.gritAvailable, 0);
  const invalid = {
    id: "item-ordinary-heavy-armor",
    quantity: 1,
    hands: 0,
    instanceId: "test-heavy",
  };
  h.draft.shopping.push(invalid);
  h.draft.coinOverride = true;
  h.preview = R.workshopCharacter(h.draft, C);
  assert.match(g.gearReason(0, "test-heavy", "wear"), /training/);
});
