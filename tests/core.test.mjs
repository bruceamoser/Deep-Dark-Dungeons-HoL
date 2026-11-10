import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { generate, pathfind, key, neighbors } from "../src/core/dungeon.mjs";
import { Game } from "../src/core/game.mjs";
import { serialize, deserialize } from "../src/core/save.mjs";
import { xpForLevel, levelForXP } from "../src/core/experience.mjs";
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
  "potions",
  "treatment",
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
  creatures: data("creatures"),
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
test("removed Safe Breath cannot heal or restore Grit", () => {
  const g = fresh();
  g.descend();
  g.enemies = [];
  g.party[0].survival.hp = 3;
  g.party[0].survival.gritAvailable = 0;
  assert.throws(() => g.rest(), /removed/);
  assert.equal(g.party[0].survival.hp, 3);
  assert.equal(g.party[0].survival.gritAvailable, 0);
  g.party[0].wounds.push({});
  assert.throws(() => g.rest(), /removed/);
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
  g.map = {
    ...g.map,
    tiles: {},
    obstacles: {},
    chests: [],
    lights: [{ x: 4, z: 4, radius: 9 }],
  };
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
test("returning from a cleared floor no longer invents a milestone level", () => {
  const g = fresh();
  g.mode = "exploration";
  g.enemies.forEach((e) => (e.hp = 0));
  g.extract();
  assert.ok(g.party.every((h) => h.earnedLevel === 1));
  g.descend();
  g.extract();
  assert.ok(g.party.every((h) => h.earnedLevel === 1));
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
test("new wounds apply conditions and penalties; sleeping preserves scars and Grit", () => {
  const g = fresh(),
    h = g.party[0];
  g.enemies = [];
  g.dice = (n) => Array(n).fill(2);
  h.survival.hp = 1;
  h.survival.gritAvailable = 0;
  g.suffer(h, 3, "physical", "fixture");
  assert.equal(h.survival.status, "dying");
  assert.equal(h.wounds.length, 1);
  assert.equal(h.survival.wounds, 1);
  assert.ok(h.wounds[0].applied);
  assert.equal(g.woundNotices.length, 1);
  g.acknowledgeWound({ x: 1, z: 0 });
  assert.equal(g.woundNotices.length, 0);
  h.survival = R.receiveHealing(h.survival, 1);
  g.mode = "exploration";
  g.enemies = [];
  h.conditions = [];
  g.campWanderers = () => [];
  g.startCamp(
    Object.fromEntries(g.party.map((p) => [p.heroId, ["guard", "guard"]])),
  );
  for (let i = 0; i < 8; i++) g.campHour();
  assert.equal(h.survival.hp, Math.min(h.survival.maxHp, 13));
  assert.equal(h.survival.gritAvailable, 0);
  assert.equal(h.survival.wounds, 1);
  assert.equal(h.wounds.length, 1);
});
test("hero turn-end harm uses separate damage events, Bleeding bypasses resistance, and stars persist", () => {
  const g = fresh(),
    h = g.party[0];
  h.preview.resistances.physical = 3;
  h.preview.resistances.fire = 2;
  const hp = h.survival.hp;
  h.conditions = [
    {
      id: "burn",
      key: "burning",
      rating: 3,
      persistence: "temporary",
      source: "fire",
    },
    {
      id: "bleed",
      key: "bleeding",
      rating: 2,
      persistence: "temporary",
      source: "blade",
    },
    {
      id: "blind",
      key: "blinded",
      rating: 1,
      persistence: "starred",
      source: "scar",
    },
  ];
  g.tickHeroConditions(h);
  assert.equal(h.survival.hp, hp - 3);
  assert.equal(h.conditions.find((c) => c.key === "burning").rating, 2);
  assert.equal(h.conditions.find((c) => c.key === "bleeding").rating, 1);
  assert.equal(h.conditions.find((c) => c.key === "blinded").rating, 1);
});
test("potion use checks hands and applies the final healing before d4 exhaustion", () => {
  const g = fresh(),
    h = g.party[0],
    i = h.preview.inventory.items.find(
      (i) => i.catalogId === "item-lesser-healing-bottle",
    );
  h.survival.hp = 2;
  h.survival.gritAvailable = 0;
  g.supplyDie = () => 1;
  // Fresh test drafts have free hands; printed lesser healing is six.
  g.drinkPotion(0, i.instanceId);
  assert.equal(h.survival.hp, 8);
  assert.equal(h.supplies[i.instanceId], 0);
  assert.equal(h.survival.gritAvailable, 0);
  assert.throws(() => g.drinkPotion(0, i.instanceId), /exhausted/);
  assert.equal(h.survival.hp, 8);
});
test("daily treatment uses correct capability, keeps scar count and cannot be repeated by another healer", () => {
  const g = fresh(),
    h = g.party[0],
    record = C.wounds.records.find(
      (w) =>
        w.table === "physical" &&
        w.capability === "Soft Tissue" &&
        w.recoveryValue >= 3 &&
        w.effects.some((e) => e.kind === "movementPenalty"),
    );
  const w = {
    ...R.woundResult(C.wounds, "physical", record.key),
    id: "injury-test",
    applied: true,
  };
  h.wounds = [w];
  h.survival.wounds = 1;
  h.survival.gritAvailable = 0;
  const speed = g.speed(h);
  g.dice = (n) => Array(n).fill(4);
  g.treatWound(0, w.id, 0, "treat-soft-tissue");
  assert.equal(w.treatment.progress, 2);
  assert.equal(g.campaign.hours, 1);
  assert.throws(
    () => g.treatWound(0, w.id, 0, "treat-soft-tissue"),
    /campaign day/,
  );
  assert.equal(w.treatment.progress, 2);
  while (!w.treatment.completed) {
    g.nextTreatmentDay();
    g.treatWound(0, w.id, 0, "treat-soft-tissue");
  }
  assert.ok(g.speed(h) > speed);
  assert.equal(h.survival.wounds, 1);
  assert.equal(h.wounds.length, 1);
  assert.equal(h.survival.gritAvailable, 0);
  const loaded = fresh();
  loaded.load(deserialize(serialize(g.snapshot())));
  assert.deepEqual(loaded.party[0].wounds[0].treatment, w.treatment);
});
test("forced movement consumes Stability once and uses remaining budget on collision before resistance", () => {
  const g = fresh(),
    h = g.party[0];
  g.map = {
    tiles: Object.fromEntries(
      Array.from({ length: 8 }, (_, x) => [`${x},0`, { x, z: 0 }]),
    ),
    obstacles: {},
  };
  g.enemies = [];
  g.party.forEach((p, i) => Object.assign(p, { x: i ? 6 : 1, z: i ? 10 : 0 }));
  h.preview.summary.stability = 1;
  g.forceMove(h, { x: 1, z: 0 }, 3);
  assert.equal(h.x, 3);
  const hp = h.survival.hp;
  g.map.obstacles["4,0"] = true;
  g.forceMove(h, { x: 1, z: 0 }, 3);
  assert.equal(h.survival.hp, hp - 3);
  assert.equal(h.x, 2);
});
test("Dazed retains chosen categories; helpless actors cannot convert or use an action", () => {
  const g = combatFixture(),
    h = g.active;
  h.conditions = [
    {
      id: "daze",
      key: "dazed",
      rating: 2,
      persistence: "temporary",
      source: "test",
    },
  ];
  assert.throws(() => g.beginHero(), /categories/);
  assert.equal(g.encounter.current, null);
  g.beginHero(["main"]);
  assert.deepEqual(g.budget.remaining, { main: 1, maneuver: 0, reaction: 0 });
  assert.throws(() => g.convert("main"), /not retained/);
  assert.equal(g.budget.remaining.main, 1);
  h.conditions.push({
    id: "sleep",
    key: "asleep",
    rating: 1,
    persistence: "temporary",
    source: "test",
  });
  assert.throws(
    () => g.useAbility("ability-basic-unarmed", "sentry"),
    /cannot act/,
  );
  assert.equal(g.budget.remaining.main, 1);
  assert.equal(g.movementLeft(), 0);
});
test("spell healing pays HP first, needs a free hand, respects Life resistance and never removes wounds", () => {
  const g = combatFixture(3),
    h = g.active,
    target = g.party[2];
  h.preview.state.abilities.push("ability-shared-breath");
  Object.assign(target, { x: h.x + 1, z: h.z });
  target.survival.hp = 1;
  target.survival.wounds = 2;
  target.preview.resistances.life = 3;
  const before = h.survival.hp;
  g.useAbility("ability-shared-breath", target.id);
  assert.equal(h.survival.hp, before - 1);
  assert.equal(target.survival.hp, 7);
  assert.equal(target.survival.wounds, 2);
  assert.equal(g.budget.remaining.main, 0);
  const second = combatFixture(3);
  second.active.preview.state.abilities.push("ability-shared-breath");
  second.active.survival.hp = 1;
  assert.throws(
    () => second.useAbility("ability-shared-breath", second.active.id),
    /above 0/,
  );
  assert.equal(second.active.survival.hp, 1);
});
test("final enemy death retains turn order until Dying and ongoing harm resolve", () => {
  const g = combatFixture(),
    h = g.active;
  delete g.advance;
  g.enemies[0].hp = 0;
  g.defeatEnemy(g.enemies[0]);
  h.survival = R.survivalState({
    hp: 0,
    maxHp: h.survival.maxHp,
    gritAvailable: 1,
    status: "dying",
  });
  g.advance();
  assert.equal(g.mode, "combat");
  g.beginHero();
  g.survivalChoice("grit");
  g.endTurn();
  assert.equal(g.mode, "exploration");
  assert.equal(h.survival.gritAvailable, 0);
});
test("wound acknowledgement and daily treatment survive saves without duplicate penalties", () => {
  const g = combatFixture(),
    h = g.active;
  h.survival.hp = 1;
  g.dice = (n) => Array(n).fill(3);
  g.suffer(h, 3, "physical", "sentry");
  const saved = deserialize(serialize(g.snapshot())),
    copy = fresh();
  copy.load(saved);
  assert.equal(copy.woundNotices.length, 1);
  assert.deepEqual(copy.party[0].conditions, h.conditions);
  copy.acknowledgeWound({ x: 1, z: 0 });
  assert.equal(copy.party[0].wounds.length, 1);
  assert.equal(copy.party[0].survival.wounds, 1);
});
test("a two-item stow is atomic and costs two Maneuvers, while a one-handed swap keeps the shield", () => {
  const g = combatFixture(),
    h = g.active,
    items = h.preview.inventory.items,
    weapon = items.find((i) => i.catalogId === "item-ordinary-melee-weapon"),
    shield = items.find((i) => i.catalogId === "item-ordinary-shield");
  weapon.held = true;
  shield.held = true;
  items.push({
    instanceId: "bow-fixture",
    catalogId: "item-ordinary-ranged-weapon",
    carried: true,
    hands: 2,
    held: false,
  });
  assert.equal(g.gearPlan(0, "bow-fixture").cost, 2);
  assert.equal(g.gearPlan(0, "bow-fixture").stow.length, 2);
  assert.throws(() => g.equip(0, "bow-fixture"), /Requires 2/);
  assert.equal(g.encounter.current, null);
  items.push({
    instanceId: "sword-fixture",
    catalogId: "item-ordinary-melee-weapon",
    carried: true,
    hands: 1,
    held: false,
  });
  assert.deepEqual(g.gearPlan(0, "sword-fixture"), {
    stow: [weapon.instanceId],
    cost: 1,
  });
});
test("death of the entire company reaches defeat even when the final enemy also dies", () => {
  const g = combatFixture();
  delete g.advance;
  g.party.forEach((h) => {
    h.survival.status = "dead";
    h.survival.hp = 0;
  });
  g.enemies[0].hp = 0;
  g.advance();
  assert.equal(g.mode, "defeat");
  assert.equal(g.campaign.memorial.length, 1);
});
test("potion recipient Reaction and free-hand failures spend no action or supply", () => {
  const g = combatFixture(),
    h = g.active,
    target = g.party[1],
    potion = h.preview.inventory.items.find(
      (i) => i.catalogId === "item-lesser-healing-bottle",
    );
  target.survival.hp = 2;
  g.beginHero();
  target.conditions = [
    {
      id: "paralyzed",
      key: "paralyzed",
      rating: 1,
      persistence: "temporary",
      source: "test",
    },
  ];
  assert.throws(
    () => g.drinkPotion(0, potion.instanceId, target.id),
    /Reaction/,
  );
  assert.equal(g.budget.remaining.maneuver, 1);
  assert.equal(h.supplies[potion.instanceId], undefined);
  target.conditions = [];
  const held = h.preview.inventory.items.find(
    (i) => i.catalogId === "item-ordinary-melee-weapon",
  );
  held.held = true;
  held.hands = 2;
  assert.throws(
    () => g.drinkPotion(0, potion.instanceId, target.id),
    /free hand/,
  );
  assert.equal(g.budget.remaining.maneuver, 1);
  held.held = false;
  g.supplyDie = () => 1;
  g.drinkPotion(0, potion.instanceId, target.id);
  assert.equal(target.survival.hp, 8);
  assert.equal(g.budget.remaining.maneuver, 0);
  assert.equal(g.budgets[target.id].remaining.reaction, 0);
  assert.equal(h.supplies[potion.instanceId], 0);
});
test("legacy wound-review saves migrate the original injury exactly once", () => {
  const g = combatFixture(),
    h = g.active;
  h.survival.hp = 1;
  g.dice = (n) => Array(n).fill(3);
  g.suffer(h, 3, "physical", "sentry");
  delete h.wounds[0].applied;
  delete h.wounds[0].id;
  h.conditions = [];
  g.woundNotices = [];
  g.mode = "wound-review";
  const copy = fresh();
  copy.load(deserialize(serialize(g.snapshot())));
  assert.equal(copy.mode, "combat");
  assert.equal(copy.party[0].wounds.length, 1);
  assert.equal(copy.woundNotices.length, 1);
  const conditions = structuredClone(copy.party[0].conditions);
  const next = fresh();
  next.load(deserialize(serialize(copy.snapshot())));
  assert.deepEqual(next.party[0].conditions, conditions);
  assert.equal(next.party[0].survival.wounds, 1);
});
test("forced collision damage precedes the contacted creature Stability deduction", () => {
  const g = fresh(),
    [a, b] = g.party;
  g.enemies = [];
  g.map = {
    tiles: Object.fromEntries(
      Array.from({ length: 8 }, (_, x) => [`${x},0`, { x, z: 0 }]),
    ),
    obstacles: {},
  };
  g.party.forEach((p, i) =>
    Object.assign(p, { x: i === 0 ? 1 : i === 1 ? 3 : 7, z: i < 2 ? 0 : 10 }),
  );
  a.preview.summary.stability = 1;
  b.preview.summary.stability = 2;
  const hp = [a.survival.hp, b.survival.hp];
  g.forceMove(a, { x: 1, z: 0 }, 5);
  assert.equal(a.survival.hp, hp[0] - 3);
  assert.equal(b.survival.hp, hp[1] - 3);
  assert.equal(a.x, 2);
  assert.equal(b.x, 4);
});

function corridorFixture() {
  const g = combatFixture();
  g.map.tiles = Object.fromEntries(
    Array.from({ length: 14 }, (_, x) => [key(x, 0), { x, z: 0 }]),
  );
  g.map.obstacles = {};
  g.map.lights = [{ x: 6, z: 0, radius: 9 }];
  g.map.chests = [];
  g.map.start = { x: 0, z: 0 };
  g.map.exit = { x: 13, z: 0 };
  g.party.forEach((h, i) => Object.assign(h, { x: i, z: 0 }));
  g.enemies[0].x = 13;
  g.enemies[0].z = 0;
  return g;
}
test("combat crosses willing companions, preserves their squares and never saves stacked actors", () => {
  const g = corridorFixture(),
    before = g.party.slice(1).map((h) => [h.x, h.z]);
  assert.equal(g.route({ x: 4, z: 0 }).length, 4);
  g.move({ x: 4, z: 0 });
  assert.equal(g.movementLeft(), 1);
  g.step();
  assert.equal(g.active.x, 4);
  assert.deepEqual(
    g.party.slice(1).map((h) => [h.x, h.z]),
    before,
  );
  assert.equal(g.budget.remaining.main, 1);
  const save = deserialize(serialize(g.snapshot()));
  assert.equal(new Set(save.party.map((h) => key(h.x, h.z))).size, 4);
  assert.throws(() => g.move({ x: 1, z: 0 }), /empty square/);
});
test("prone occupied squares and difficult terrain cost two, standing enemies still block", () => {
  const g = corridorFixture();
  g.party[1].conditions = [
    {
      id: "down",
      key: "prone",
      rating: 1,
      persistence: "binary",
      source: "fixture",
    },
  ];
  g.map.tiles["3,0"].difficult = true;
  assert.throws(() => g.move({ x: 4, z: 0 }), /costs 6/);
  assert.equal(g.movementLeft(), g.active.preview.summary.speed);
  g.map.tiles["3,0"].difficult = false;
  g.move({ x: 4, z: 0 });
  assert.equal(g.movementLeft(), 0);
  g.step();
  const blocked = corridorFixture();
  blocked.enemies[0].x = 4;
  assert.deepEqual(blocked.route({ x: 5, z: 0 }), []);
  blocked.enemies[0].conditions = [
    {
      id: "enemy-down",
      key: "prone",
      rating: 1,
      persistence: "binary",
      source: "fixture",
    },
  ];
  assert.equal(blocked.route({ x: 5, z: 0 }).length, 5);
  assert.deepEqual(blocked.route({ x: 4, z: 0 }), []);
});
test("collecting coins and reversing a formation in a corridor do not deadlock", () => {
  const g = corridorFixture();
  g.mode = "exploration";
  g.enemies = [];
  g.setFormation(
    "column",
    g.party.map((h) => h.id),
  );
  g.map.chests = [{ id: "coins", x: 5, z: 0, coins: 17, opened: false }];
  const before = g.campaign.haul;
  g.move({ x: 5, z: 0 });
  for (let i = 0; i < 20; i++) g.step();
  assert.equal(g.campaign.haul, before);
  g.interact("coffer:coins");
  for (const x of [9, 0, 10, 1]) {
    g.move({ x, z: 0 });
    for (let i = 0; i < 60; i++) {
      g.step();
      assert.equal(new Set(g.party.map((h) => key(h.x, h.z))).size, 4);
    }
    assert.equal(g.party[0].x, x);
    assert.ok([...g.paths.values()].every((p) => !p.length));
  }
  assert.equal(g.campaign.haul, before + 17);
  assert.throws(() => g.interact("coffer:coins"), /Already collected/);
});
test("companions can atomically trade occupied destinations without overlapping", () => {
  const g = corridorFixture();
  g.mode = "exploration";
  g.enemies = [];
  g.paths.set("hero-0", [{ x: 1, z: 0 }]);
  g.paths.set("hero-1", [{ x: 0, z: 0 }]);
  g.step();
  assert.deepEqual(
    g.party.map((h) => h.x),
    [1, 0, 2, 3],
  );
});
test("a new round selects the next eligible hero and shows fresh movement instead of an old budget", () => {
  const g = combatFixture();
  delete g.advance;
  g.enemies[0].hp = 100;
  for (const h of g.party) {
    g.encounter = R.chooseParticipant(g.encounter, h.id);
    g.encounter = R.finishTurn(g.encounter);
    if (g.encounter.nextSide === "opposition") {
      g.encounter = R.chooseParticipant(g.encounter, "sentry");
      g.encounter = R.finishTurn(g.encounter);
    }
  }
  assert.equal(g.encounter.round, 2);
  g.selected = 3;
  g.budgets["hero-0"] = {
    remaining: { main: 0, maneuver: 0, reaction: 0 },
    speed: 5,
    movementSpent: 5,
  };
  g.advance();
  assert.equal(g.selected, 0);
  assert.equal(g.budget, undefined);
  assert.equal(g.movementLeft(), g.active.preview.summary.speed);
  assert.equal(g.actionReason("ability-basic-unarmed"), "");
  g.beginHero();
  g.encounter = R.finishTurn(g.encounter);
  // Keep the fixture on the player side to test an already-acted selection.
  g.encounter.nextSide = "players";
  g.advance();
  assert.equal(g.selected, 1);
  assert.throws(() => g.select(0), /already acted/);
  assert.equal(g.selected, 1);
});
test("all formations continue through generated floors after successive loot destinations", () => {
  for (const seed of [7, 17, 29])
    for (const formation of ["square", "column", "wedge", "line"]) {
      const g = fresh();
      g.campaign.seed = seed;
      g.newFloor();
      g.enemies = [];
      g.mode = "exploration";
      g.setFormation(
        formation,
        g.party.map((h) => h.id),
      );
      for (const room of [g.map.rooms[1], g.map.rooms[0], g.map.rooms[2]]) {
        const dest = { x: room.cx, z: room.cz };
        g.move(dest);
        for (
          let i = 0;
          i < 300 && [...g.paths.values()].some((p) => p.length);
          i++
        ) {
          g.step();
          assert.equal(new Set(g.party.map((h) => key(h.x, h.z))).size, 4);
        }
        assert.deepEqual(
          { x: g.party[0].x, z: g.party[0].z },
          dest,
          `${seed} ${formation}`,
        );
      }
    }
});

test("world loot requires deliberate nearby interaction and survives save/load without duplication", () => {
  const g = corridorFixture();
  g.mode = "exploration";
  g.enemies = [];
  g.map.chests = [{ id: "sealed", x: 8, z: 0, coins: 21, opened: false }];
  const before = g.campaign.haul;
  assert.throws(() => g.interact("coffer:sealed"), /beside/);
  const arrivals = [];
  g.listeners.push((type, data) => {
    if (type === "interact-ready") arrivals.push(data.id);
  });
  g.approachInteraction("coffer:sealed");
  for (let i = 0; i < 50; i++) g.step();
  assert.deepEqual(arrivals, ["coffer:sealed"]);
  assert.equal(g.campaign.haul, before);
  g.mode = "combat";
  assert.throws(() => g.interact("coffer:sealed"), /Finish combat/);
  g.mode = "exploration";
  g.interact("coffer:sealed");
  const loaded = fresh();
  loaded.load(deserialize(serialize(g.snapshot())));
  assert.equal(loaded.campaign.haul, before + 21);
  assert.throws(() => loaded.interact("coffer:sealed"), /Already collected/);
});

test("lost caches are recoverable once on the matching floor and stairs enforce gathering", () => {
  const g = fresh();
  g.descend();
  g.enemies = [];
  g.campaign.caches = [
    {
      x: g.active.x,
      z: g.active.z,
      depth: 1,
      coins: 9,
      expedition: 1,
      recovered: false,
    },
    {
      x: g.active.x,
      z: g.active.z,
      depth: 2,
      coins: 50,
      expedition: 2,
      recovered: false,
    },
  ];
  g.interact("cache:0");
  assert.equal(g.campaign.haul, 9);
  assert.equal(
    g.worldInteractions().some((i) => i.kind === "cache"),
    false,
  );
  assert.throws(() => g.interact("cache:0"), /no longer here/);
  assert.throws(() => g.interact("cache:1"), /no longer here/);
  assert.throws(() => g.interact("stairs:descent"), /Gather/);
  g.interact("stairs:entrance");
  assert.equal(g.mode, "town");
  assert.equal(g.campaign.bank, 9);
});

test("created heroes stay in reserve and party swaps preserve identity, injuries, supplies and XP", () => {
  const g = fresh(),
    previous = g.party[0];
  const recruit = g.createRecruit({ ...drafts[1], name: "Repository recruit" });
  assert.equal(g.party[0], previous);
  assert.equal(g.livingRoster().length, 5);
  previous.survival.hp = 3;
  previous.survival.gritAvailable = 0;
  previous.supplies["test-arrow"] = 4;
  previous.xp = 450;
  const old = JSON.stringify({
    draft: previous.draft,
    survival: previous.survival,
    supplies: previous.supplies,
    xp: previous.xp,
  });
  g.assignHero(0, recruit.heroId);
  assert.equal(g.campaign.reserve[0].heroId, previous.heroId);
  assert.equal(g.party[0].heroId, recruit.heroId);
  g.assignHero(0, previous.heroId);
  assert.equal(
    JSON.stringify({
      draft: g.party[0].draft,
      survival: g.party[0].survival,
      supplies: g.party[0].supplies,
      xp: g.party[0].xp,
    }),
    old,
  );
  const loaded = fresh();
  loaded.load(deserialize(serialize(g.snapshot())));
  assert.equal(loaded.livingRoster().length, 5);
  assert.equal(loaded.campaign.reserve[0].name, "Repository recruit");
  assert.equal(loaded.party[0].heroId, previous.heroId);
  loaded.assignHero(1, previous.heroId);
  assert.equal(loaded.party[1].heroId, previous.heroId);
  assert.equal(new Set(loaded.party.map((h) => h.id)).size, 4);
});

test("only final death archives an individual hero, once, and the fallen cannot be recruited", () => {
  const g = fresh(),
    h = g.party[0];
  h.survival = R.enterLastWords(h.survival);
  g.emit("change");
  assert.equal(g.campaign.fallenHeroes.length, 0);
  while (h.survival.status === "lastWords") {
    h.survival = R.startSurvivalTurn(h.survival, h.survival.ownTurn + 1);
    h.survival = R.endSurvivalTurn(h.survival, h.survival.ownTurn);
  }
  g.emit("change");
  assert.equal(h.survival.status, "dead");
  assert.equal(g.campaign.fallenHeroes.length, 1);
  g.emit("change");
  g.snapshot();
  assert.equal(g.campaign.fallenHeroes.length, 1);
  assert.equal(g.livingRoster().length, 3);
  assert.throws(() => g.assignHero(1, h.heroId), /no longer available/);
  const originalName = g.campaign.fallenHeroes[0].hero.name;
  h.name = "Changed corpse fixture";
  assert.equal(g.campaign.fallenHeroes[0].hero.name, originalName);
  const loaded = fresh();
  loaded.load(deserialize(serialize(g.snapshot())));
  assert.equal(loaded.campaign.fallenHeroes.length, 1);
});

test("a defeated company returns to the repository without recreating its dead heroes", () => {
  const g = fresh(),
    reserve = g.createRecruit({ ...drafts[1], name: "Town reserve" });
  g.mode = "combat";
  g.party.forEach((h) => {
    h.survival.status = "dead";
    h.survival.hp = 0;
  });
  g.fail();
  g.fail();
  assert.equal(g.campaign.fallenHeroes.length, 4);
  assert.equal(g.campaign.memorial.length, 1);
  g.returnAfterDefeat();
  assert.equal(g.mode, "town");
  assert.equal(g.livingRoster().length, 1);
  g.assignHero(0, reserve.heroId);
  assert.equal(g.party[0].name, "Town reserve");
  assert.throws(() => g.descend(), /Replace or resolve/);
});

test("legacy saves migrate earned milestone levels without erasing heroes or inventing individual deaths", () => {
  const g = fresh(),
    saved = g.snapshot();
  delete saved.reserve;
  delete saved.fallenHeroes;
  delete saved.pendingTreasureXP;
  saved.memorial = [{ names: ["Old expedition"], depth: 2, expedition: 1 }];
  for (const h of saved.party) {
    delete h.heroId;
    delete h.xp;
    delete h.xpHistory;
    h.earnedLevel = 2;
  }
  g.load(deserialize(serialize(saved)));
  assert.equal(g.livingRoster().length, 4);
  assert.ok(
    g.party.every((h) => h.xp === xpForLevel(2) && h.earnedLevel === 2),
  );
  assert.equal(g.campaign.fallenHeroes.length, 0);
  assert.equal(g.campaign.memorial.length, 1);
});

test("XP thresholds unlock multiple levels but do not spend training points or heal", () => {
  assert.deepEqual([1, 2, 3, 4].map(xpForLevel), [0, 10000, 32500, 85000]);
  assert.equal(levelForXP(9999), 1);
  assert.equal(levelForXP(10000), 2);
  const g = fresh(),
    h = g.party[0],
    level = h.preview.state.level;
  h.survival.hp = 3;
  h.survival.gritAvailable = 0;
  g.awardXP("test-journey", 85000, "A long expedition");
  assert.equal(h.earnedLevel, 4);
  assert.equal(h.preview.state.level, level);
  assert.equal(h.survival.hp, 3);
  assert.equal(h.survival.gritAvailable, 0);
  g.awardXP("test-journey", 85000, "Duplicate event");
  assert.equal(h.xp, 85000);
});

test("discovery XP is shared by survivors, excludes reserves and persists its once-only claim", () => {
  const g = fresh(),
    reserve = g.createRecruit(drafts[0]);
  g.mode = "exploration";
  const room = g.map.rooms[1];
  Object.assign(g.party[0], { x: room.cx, z: room.cz });
  g.party[3].survival.status = "dead";
  g.party[3].survival.hp = 0;
  g.discoverRooms();
  g.discoverRooms();
  assert.deepEqual(
    g.party.map((h) => h.xp),
    [60, 60, 60, 0],
  );
  assert.equal(reserve.xp, 0);
  const loaded = fresh();
  loaded.load(deserialize(serialize(g.snapshot())));
  loaded.discoverRooms();
  assert.equal(loaded.party[0].xp, 60);
});

test("resolved encounters grant per-enemy XP even after their roster entries are withdrawn", () => {
  const g = combatFixture();
  delete g.advance;
  g.enemies[0].hp = 0;
  g.encounter = R.changeRoster(g.encounter, {
    id: "sentry",
    mode: "withdraw",
    reason: "Defeated",
  });
  g.advance();
  assert.equal(g.mode, "exploration");
  assert.ok(g.party.every((h) => h.xp === 100));
  g.awardEncounterXP(["sentry"]);
  assert.ok(g.party.every((h) => h.xp === 100));
});

test("treasure XP is earned on safe return, lost on defeat, and not repeated for death caches", () => {
  const g = fresh();
  g.descend();
  g.enemies = [];
  g.map.chests = [
    { id: "xp-coins", x: g.active.x, z: g.active.z, coins: 20, opened: false },
  ];
  g.interact("coffer:xp-coins");
  assert.equal(g.party[0].xp, 0);
  assert.equal(g.campaign.pendingTreasureXP, 100);
  g.extract();
  assert.ok(g.party.every((h) => h.xp === 100));
  g.descend();
  g.extract();
  assert.equal(g.party[0].xp, 100);
  g.descend();
  g.campaign.pendingTreasureXP = 100;
  g.campaign.haul = 20;
  g.fail();
  assert.equal(g.campaign.pendingTreasureXP, 0);
  g.returnAfterDefeat();
  g.descend();
  const cache = g.campaign.caches[0];
  Object.assign(g.party[0], { x: cache.x, z: cache.z });
  g.interact("cache:0");
  assert.equal(g.campaign.pendingTreasureXP, 0);
  assert.equal(g.party[0].xp, 100);
});

test("invalid repository identities and XP cannot silently duplicate or resurrect heroes", () => {
  const g = fresh(),
    saved = g.snapshot();
  saved.reserve.push(structuredClone(saved.party[0]));
  assert.throws(() => g.load(saved), /more than one/);
  const wrongXP = fresh().snapshot();
  wrongXP.party[0].xp = -1;
  assert.throws(() => g.load(wrongXP), /identity or experience/);
});
