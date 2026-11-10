import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Game } from "../src/core/game.mjs";
import { generate, key } from "../src/core/dungeon.mjs";
import {
  populateEncounters,
  encounterBudget,
  CREATURE_ROSTER,
} from "../src/core/bestiary.mjs";
import {
  magicItem,
  recallScroll,
  ordinaryItem,
  ITEM_BASES,
  activeItemEffects,
  effectStatus,
} from "../src/core/treasure.mjs";
import { MERCHANTS } from "../src/core/market.mjs";
import { combatFeedback } from "../src/core/feedback.mjs";
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
};
const drafts = [
  "borin-bridgekeeper",
  "lira-ashbow",
  "pip-copperwink",
  "vaelis-emberglass",
].map((id) => data("party").find((p) => p.id === id).draft);
function fresh() {
  const g = new Game(R, C);
  g.fresh(drafts);
  return g;
}
function fight(index = 0, type = null) {
  const g = fresh();
  g.selected = index;
  g.map = {
    ...g.map,
    tiles: {},
    obstacles: {},
    chests: [],
    lights: [{ x: 4, z: 4, radius: 9 }],
  };
  for (let x = 0; x < 12; x++)
    for (let z = 0; z < 12; z++) g.map.tiles[key(x, z)] = { x, z };
  g.party.forEach((h, i) => Object.assign(h, { x: 3 + i, z: 6 }));
  g.enemies = [
    {
      id: "foe",
      type,
      name: "Test foe",
      x: 3 + index,
      z: 5,
      hp: 60,
      maxHp: 60,
      conditions: [],
    },
  ];
  g.encounter = R.startEncounter(
    [
      ...g.party.map((h) => ({ id: h.id, side: "players" })),
      { id: "foe", side: "opposition" },
    ],
    [6, 6, 6],
  );
  g.mode = "combat";
  g.dice = (n = 3) => Array(n).fill(6);
  g.advance = () => {};
  return g;
}
function give(g, index, item) {
  (g.party[index].treasure ??= []).push(item);
  g.refreshHero(g.party[index]);
  return item;
}

test("broad deterministic roster uses exact book cards and reachable creature pools", () => {
  assert.equal(Object.keys(CREATURE_ROSTER).length, 58);
  const seen = new Set(),
    template = generate(42);
  for (let seed = 0; seed < 1200; seed++) {
    const m = structuredClone(template);
    m.seed = seed;
    m.depth = 1 + (seed % 30);
    const enemies = populateEncounters(m, C.creatures, [1, 3, 5, 7]);
    for (const e of enemies) {
      const c = C.creatures.creatures.find((c) => c.id === e.type);
      assert.equal(e.hp, c.hp.max);
      assert.equal(e.maxHp, c.hp.max);
      assert.equal(e.cv, c.cv);
      assert.equal(e.name, c.name);
      assert.ok(!m.obstacles[key(e.x, e.z)]);
      seen.add(e.type);
    }
    assert.equal(
      new Set(enemies.map((e) => key(e.x, e.z))).size,
      enemies.length,
    );
    assert.equal(
      enemies.filter((e) => e.boss).length,
      m.depth % 5 === 0 ? 1 : 0,
    );
    for (const encounter of m.encounters)
      assert.equal(
        encounter.actual,
        enemies
          .filter((e) => e.group === encounter.group)
          .reduce((n, e) => n + e.cv, 0),
      );
  }
  assert.equal(seen.size, 58);
  const a = generate(12, 5),
    b = generate(12, 5);
  assert.deepEqual(
    populateEncounters(a, C.creatures, [2, 2, 2, 2]),
    populateEncounters(b, C.creatures, [2, 2, 2, 2]),
  );
});
test("encounter budgets use mixed player levels and independent dungeon depth pressure", () => {
  assert.equal(encounterBudget([1, 1, 3, 3], 1).party, 48);
  assert.ok(
    encounterBudget([1, 1, 1, 1], 6).target >
      encounterBudget([1, 1, 1, 1], 1).target,
  );
  assert.ok(
    encounterBudget([5, 5, 5, 5], 6).target >
      encounterBudget([1, 1, 1, 1], 6).target,
  );
});
test("all selected primary creature attacks are supported single-target printed outcomes", () => {
  const g = fresh();
  for (const id of Object.keys(CREATURE_ROSTER)) {
    const c = C.creatures.creatures.find((c) => c.id === id),
      a = g.creatureAction({ type: id });
    assert.equal(c.size.value, 1);
    assert.equal(a.name, c.actions.main.actions[1].name);
    assert.ok(
      [
        "physical",
        "fire",
        "cold",
        "lightning",
        "mental",
        "radiant",
        "life",
      ].includes(a.type),
      id,
    );
    for (const text of Object.values(a.outcomes))
      assert.match(
        text,
        /^\d+(?:\s*\+\s*(?:Push|Pull|Burning|Bleeding|Freezing|Poisoned|Slowed|Dazed|Paralyzed|Frightened|Prone|Blinded|Deafened)(?:\s+\d+)?(?: of this creature)?)?$/i,
        id,
      );
  }
});
test("creature defenses, reactions, immunity, speed and printed damage affect combat", () => {
  const g = fight(0, "creature-bone-sentry"),
    e = g.enemies[0];
  assert.equal(g.creatureResistances(e)[0].value, 1);
  const defense = g.creatureDefense(e, g.active, {
    type: "physical",
    weapon: "melee",
  });
  assert.equal(Math.max(...defense.resistances.map((r) => r.value)), 3);
  assert.ok(defense.collapse);
  assert.ok(e.reactionUsed);
  assert.equal(
    g.creatureDefense(e, g.active, { type: "physical" }).collapse,
    false,
  );
  const rat = {
    type: "creature-giant-rat",
    id: "rat",
    x: 3,
    z: 5,
    conditions: [],
  };
  g.dice = (n = 3) => Array(n).fill(1);
  g.resolveEnemyHit(rat, g.active);
  assert.ok(
    g.active.conditions.some((c) => c.key === "bleeding" && c.rating === 2),
  );
  const archer = {
    type: "creature-bone-archer",
    id: "archer",
    x: 3,
    z: 1,
    conditions: [],
    ammunition: 6,
  };
  assert.equal(g.creatureAction(archer).range, 8);
  assert.ok(g.creatureAction(archer).ammunition);
  const elemental = {
    type: "creature-air-elemental",
    id: "air",
    conditions: [],
    ammunition: 0,
  };
  assert.equal(g.creatureAction(elemental).name, "Hammering gust");
  assert.equal(g.creatureAction(elemental).ammunition, false);
});
test("every requested equipment form generates deterministically with distinct real slots", () => {
  for (const base of Object.keys(ITEM_BASES)) {
    const item = magicItem(123, 12, { base });
    assert.deepEqual(item, magicItem(123, 12, { base }));
    assert.ok(item.slot);
    assert.ok(item.effects.length);
    assert.ok(item.definition.name.includes(ITEM_BASES[base].name));
  }
  assert.throws(() =>
    magicItem(1, 1, { revision: 2, base: "ring", affixes: ["ember"] }),
  );
});
test("legacy elemental receipts use approved weapon damage without a discipline gate", () => {
  for (const index of [0, 3]) {
    const g = fight(index),
      h = g.active,
      item = give(
        g,
        index,
        magicItem(100 + index, 1, {
          revision: 2,
          base: "blade",
          affixes: ["ember"],
        }),
      );
    g.mode = "town";
    g.equip(index, item.instanceId, "ready");
    g.mode = "combat";
    const unlocked = true;
    assert.equal(effectStatus(h, item.effects[0]).active, unlocked);
    g.useAbility("ability-basic-melee", "foe");
    assert.equal(60 - g.enemies[0].hp, unlocked ? 5 : 4);
    assert.equal(
      g.enemies[0].conditions.some((c) => c.key === "burning"),
      unlocked,
    );
  }
});
test("wearables replace only matching slots, support two rings and use highest bonuses", () => {
  const g = fresh(),
    h = g.party[0];
  const belt = give(
      g,
      0,
      magicItem(1, 1, { revision: 2, base: "belt", affixes: ["might"] }),
    ),
    left = give(
      g,
      0,
      magicItem(2, 1, { revision: 2, base: "ring", affixes: ["might"] }),
    ),
    right = give(
      g,
      0,
      magicItem(3, 1, { revision: 2, base: "ring", affixes: ["grave"] }),
    );
  const baseBrawn = h.draft.attributes.brawn,
    dp = h.preview.summary.creationDp;
  g.equip(0, belt.instanceId, "wear");
  g.equip(0, left.instanceId, "wear", "ring-left");
  g.equip(0, right.instanceId, "wear", "ring-right");
  assert.equal(g.attribute(h, "brawn"), baseBrawn + 1);
  assert.equal(h.draft.attributes.brawn, baseBrawn);
  assert.equal(h.preview.summary.creationDp, dp);
  assert.equal(h.preview.resistances.life, 2);
  assert.equal(
    h.preview.inventory.items.filter((i) => i.base && i.worn).length,
    3,
  );
  const newer = give(
    g,
    0,
    magicItem(4, 1, { revision: 2, base: "belt", affixes: ["grave"] }),
  );
  g.equip(0, newer.instanceId, "wear");
  assert.equal(
    h.preview.inventory.items.find((i) => i.instanceId === belt.instanceId)
      .worn,
    false,
  );
  assert.equal(h.preview.resistances.life, 2);
  assert.equal(
    R.healingPlan({
      amount: 6,
      current: 1,
      max: 20,
      lifeResistances: [h.preview.resistances.life],
    }).restored,
    4,
  );
  g.transferTreasure(0, left.instanceId, 1);
  assert.equal(g.attribute(h, "brawn"), baseBrawn);
  assert.equal(
    g.party[1].preview.inventory.items.find(
      (i) => i.instanceId === left.instanceId,
    ).worn,
    false,
  );
});
test("magical bow uses ordinary ammunition and two hands; shield swaps cleanly", () => {
  const g = fresh(),
    h = g.party[0],
    bow = give(g, 0, magicItem(40, 1, { revision: 2, base: "bow" })),
    shield = give(g, 0, magicItem(41, 1, { revision: 2, base: "shield" }));
  g.equip(0, bow.instanceId, "ready");
  assert.equal(g.held(h, "item-ordinary-ranged-weapon").hands, 2);
  g.equip(0, shield.instanceId, "ready");
  assert.equal(g.held(h, "item-ordinary-ranged-weapon"), undefined);
  assert.ok(g.held(h, "item-ordinary-shield"));
});
test("loot is claimed once and cannot duplicate coins when revisiting an opened coffer", () => {
  const g = fresh();
  g.mode = "exploration";
  g.enemies = [];
  const c = g.map.chests[0];
  Object.assign(g.active, { x: c.x + 1, z: c.z });
  const id = "coffer:" + c.id,
    item = c.items[0];
  g.interact(id);
  const haul = g.campaign.haul;
  g.takeTreasure(id, item.instanceId, 0);
  assert.throws(() => g.takeTreasure(id, item.instanceId, 0), /already/);
  g.interact(id);
  assert.equal(g.campaign.haul, haul);
  assert.ok(g.active.treasure.some((i) => i.instanceId === item.instanceId));
});
test("boss floors gate their treasure and descent until the actual guardian dies", () => {
  const g = fresh();
  g.campaign.depth = 5;
  g.newFloor();
  g.mode = "exploration";
  const boss = g.enemies.find((e) => e.boss);
  assert.ok(boss);
  assert.throws(() => g.deeper(), /guardian/);
  const c = g.map.chests.at(-1);
  Object.assign(g.active, { x: c.x + 1, z: c.z });
  assert.throws(() => g.interact("coffer:" + c.id), /guardian/);
  boss.hp = 0;
  g.interact("coffer:" + c.id);
  assert.equal(c.items[0].power, 2);
});
test("six merchants persist finite stock, charge correctly and sell at half value without regranting", () => {
  const g = fresh();
  g.campaign.bank = 1000;
  assert.equal(MERCHANTS.length, 6);
  const stock = g.market().stock.arcana,
    entry = stock.find((e) => e.item.base === "ring"),
    price = entry.item.definition.price;
  g.buy("arcana", entry.id, 0);
  assert.equal(g.campaign.bank, 1000 - price);
  assert.throws(() => g.buy("arcana", entry.id, 0), /unavailable/);
  g.sell("arcana", 0, entry.item.instanceId);
  assert.equal(g.campaign.bank, 1000 - price + Math.floor(price / 2));
  assert.throws(() => g.sell("arcana", 0, entry.item.instanceId));
  const ordinary = g
    .market()
    .stock.weapons.find(
      (e) => e.item.catalogId === "item-ordinary-ranged-weapon",
    );
  g.buy("weapons", ordinary.id, 0);
  assert.ok(
    g.party[0].preview.inventory.items.some(
      (i) => i.kind === "ordinary" && i.catalogId === ordinary.item.catalogId,
    ),
  );
});
test("scroll returns to town, survives save/reload and resumes exactly the same floor without farming XP", () => {
  const g = fresh();
  g.descend();
  g.campaign.depth = 5;
  g.newFloor();
  g.mode = "exploration";
  g.party[0].survival.hp -= 3;
  g.enemies[0].hp = 1;
  g.map.chests[0].opened = true;
  g.map.chests[0].items = [];
  g.map.xpClaims.push("room:1");
  g.campaign.haul = 30;
  g.campaign.pendingTreasureXP = 150;
  const scroll = give(g, 0, recallScroll(55));
  g.party[0].preview.inventory.items
    .filter((i) => i.held)
    .forEach((i) => g.equip(0, i.instanceId, "stow"));
  const hp = g.party[0].survival.hp;
  g.useRecall(0, scroll.instanceId);
  assert.equal(g.mode, "town");
  assert.equal(g.campaign.bank, 30);
  assert.ok(!g.party[0].treasure.some((i) => i.kind === "scroll"));
  const xp = g.party[0].xp;
  const loaded = new Game(R, C);
  loaded.load(deserialize(serialize(g.snapshot())));
  loaded.returnThroughPassage();
  assert.equal(loaded.campaign.depth, 5);
  assert.equal(loaded.enemies[0].hp, 1);
  assert.ok(loaded.map.chests[0].opened);
  assert.deepEqual(loaded.map.chests[0].items, []);
  assert.ok(loaded.map.xpClaims.includes("room:1"));
  assert.equal(loaded.party[0].survival.hp, hp);
  assert.equal(loaded.party[0].xp, xp);
  assert.equal(loaded.campaign.returnPassage, null);
});
test("floating feedback reports actual HP changes and changed statuses once", () => {
  const g = fresh(),
    h = g.active;
  let before = combatFeedback(null, [h], R).next;
  h.survival.hp -= 4;
  h.conditions.push({
    id: "burn",
    key: "burning",
    rating: 2,
    persistence: "temporary",
    source: "enemy",
  });
  const result = combatFeedback(before, [h], R);
  assert.deepEqual(
    result.events.map((e) => e.text),
    ["−4", "Burning 2"],
  );
  assert.equal(combatFeedback(result.next, [h], R).events.length, 0);
  h.survival.hp += 2;
  h.conditions = [];
  const heal = combatFeedback(result.next, [h], R);
  assert.deepEqual(
    heal.events.map((e) => e.text),
    ["+2", "Burning cleared"],
  );
});

test("pausing cancels scheduled opposition; resume schedules exactly one turn", async () => {
  const g = fresh();
  g.mode = "combat";
  g.encounter = R.startEncounter(
    [
      ...g.party.map((h) => ({ id: h.id, side: "players" })),
      { id: g.enemies[0].id, side: "opposition" },
    ],
    [1, 1, 1],
  );
  assert.equal(g.encounter.nextSide, "opposition");
  let turns = 0;
  g.enemyTurn = () => {
    turns++;
  };
  g.advance();
  g.pause();
  const snapshot = serialize(g.snapshot());
  await new Promise((r) => setTimeout(r, 700));
  assert.equal(turns, 0);
  assert.equal(
    serialize({ ...g.snapshot() }).replace(/"savedAt":"[^"]+"/, ""),
    snapshot.replace(/"savedAt":"[^"]+"/, ""),
  );
  g.resume();
  g.resume();
  await new Promise((r) => setTimeout(r, 700));
  assert.equal(turns, 1);
  g.pause();
});
test("a mid-movement combat save restores its route and already-spent budget", () => {
  const g = fight();
  g.move({ x: 2, z: 6 });
  const remaining = g.movementLeft();
  const route = structuredClone([...g.paths]);
  const saved = deserialize(serialize(g.snapshot()));
  const restored = fresh();
  restored.load(saved, { resume: false });
  assert.equal(restored.suspended, true);
  assert.deepEqual([...restored.paths], route);
  assert.equal(restored.movementLeft(), remaining);
  const x = restored.active.x;
  restored.step();
  assert.equal(restored.active.x, x);
  restored.resume();
  restored.step();
  assert.equal(restored.active.x, 2);
  assert.equal(restored.movementLeft(), remaining);
  restored.pause();
});

test("regenerated floors give new treasure identities without rerolling restored floors", () => {
  const g = fresh();
  const item = structuredClone(g.map.chests[0].items[0]);
  give(g, 0, item);
  const before = g.snapshot();
  const copy = fresh();
  copy.load(deserialize(serialize(before)), { resume: false });
  assert.equal(copy.map.chests[0].items[0].instanceId, item.instanceId);
  g.newFloor();
  assert.notEqual(g.map.chests[0].items[0].instanceId, item.instanceId);
});
test("loading between town and combat never publishes an incomplete encounter", () => {
  const g = fight();
  const town = fresh();
  g.listeners.push(() => {
    if (g.mode === "combat") assert.ok(g.encounter);
  });
  g.load(deserialize(serialize(town.snapshot())), { resume: false });
  assert.equal(g.mode, "town");
  g.load(deserialize(serialize(fight().snapshot())), { resume: false });
  assert.equal(g.mode, "combat");
});
