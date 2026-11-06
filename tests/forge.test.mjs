import test from "node:test";
import assert from "node:assert/strict";
import { R, C, drafts, learn, fresh, arena } from "./forge-fixture.mjs";
import {
  FORGE_NODES as NODES,
  FORGE_NODE as NODE,
  FORGE_DISCIPLINES as DISCIPLINES,
  FORGE_PATHS as PATHS,
  nodePosition,
  disciplinePosition,
} from "../src/core/forge-catalog.mjs";
import {
  newForgeDraft,
  forgeCharacter,
  forgeBudget,
  forgeSpent,
  forgeOwned,
  forgeRequirements,
  validateForge,
  forgeRefundPlan,
  forgePower,
} from "../src/core/forge.mjs";
import { POWERS } from "../src/core/powers.mjs";
import { xpForLevel, levelForXP } from "../src/core/experience.mjs";
import { serialize, deserialize } from "../src/core/save.mjs";
import { ordinaryItem } from "../src/core/treasure.mjs";
function high(i = 0) {
  const d = structuredClone(drafts[i]);
  d.progression.level = 30;
  d.forge.nodes = [];
  return d;
}
test("forge catalog: 18 independent origins, 72 circular paths, 33 AND-gated intersections, no dangling contacts", () => {
  assert.equal(DISCIPLINES.length, 18);
  assert.equal(PATHS.length, 72);
  assert.equal(NODES.filter((n) => n.kind === "intersection").length, 33);
  assert.equal(new Set(NODES.map((n) => n.id)).size, NODES.length);
  for (const d of DISCIPLINES) {
    assert.equal(PATHS.filter((p) => p.discipline === d.id).length, 4);
    assert.equal(NODE[d.id + ":origin"].requires.length, 0);
  }
  for (const n of NODES) {
    for (const id of n.requires) assert.ok(NODE[id], id);
    if (n.power) assert.ok(POWERS[n.power], n.id);
    assert.ok(Number.isFinite(nodePosition(n).x));
  }
  const f = disciplinePosition("flame"),
    ice = disciplinePosition("frost"),
    a = disciplinePosition("armor"),
    guard = disciplinePosition("guard");
  assert.ok(Math.hypot(f.x + ice.x, f.y + ice.y) < 0.001);
  assert.ok(Math.hypot(a.x - guard.x, a.y - guard.y) < 650);
  for (const n of NODES.filter((n) => n.kind === "intersection")) {
    const p = nodePosition(n);
    for (const d of DISCIPLINES) {
      const c = disciplinePosition(d.id);
      assert.ok(Math.hypot(p.x - c.x, p.y - c.y) >= 345 - 0.001);
    }
  }
});
test("every forge circle is reachable by a legal level-30 build within its DP budget", () => {
  for (const n of NODES) {
    const d = high();
    learn(d, n.id);
    assert.deepEqual(validateForge(d, C), [], n.id);
    assert.ok(forgeSpent(d) <= forgeBudget(d, C), n.id);
    assert.ok(forgeOwned(d, C).has(n.id));
  }
});
test("every upgrade changes the actual power effects or targeting, and every stat is a supported engine benefit", () => {
  const supported = new Set(
    "rangedRange bleeding moveDamage impact critical flanker killMove hp capacity barrier reduction burning wildfire fire cold shatter permafrost movement heal healingWard craftSpeed craftDiscount lightning chain ambush damage venom rallyMove physical spell radiant freezing burningDamage mental killHeal dr defense attack poisoned dazed slowed".split(
      " ",
    ),
  );
  for (const n of NODES) {
    for (const k of Object.keys(n.stats ?? {}))
      assert.ok(supported.has(k), n.id + ": " + k);
    if (n.upgrade) {
      const h = {
        draft: { forge: {} },
        preview: { forge: { stats: {}, profiles: {}, upgrades: [] } },
      };
      const a = forgePower(POWERS[n.upgrade.power], h);
      h.preview.forge.upgrades = [n.upgrade];
      assert.notDeepEqual(forgePower(POWERS[n.upgrade.power], h), a, n.id);
    }
  }
});
test("blank creation, origins, nonexpiring DP, level gates, duplicate refunds and rank investments", () => {
  const blank = newForgeDraft();
  assert.equal(blank.name, "");
  assert.equal(blank.forge.nodes.length, 0);
  assert.equal(forgeCharacter(blank, C).valid, false);
  for (const d of drafts) {
    assert.equal(forgeCharacter(d, C).valid, true);
    assert.equal(forgeSpent(d), 8);
    assert.equal(forgeBudget(d, C), 8);
  }
  const d = structuredClone(drafts[0]);
  assert.match(
    forgeRequirements(NODE["flame:origin"], d, C).join(" "),
    /level 2/,
  );
  d.progression.level = 2;
  assert.equal(forgeBudget(d, C), 12);
  assert.deepEqual(forgeRequirements(NODE["flame:origin"], d, C), []);
  learn(d, "flame:origin");
  assert.match(
    forgeRequirements(NODE["arms:rank2"], d, C).join(" "),
    /level 3/,
  );
  d.progression.level = 3;
  assert.equal(forgeBudget(d, C) - forgeSpent(d), 5);
  learn(d, "arms:rank2");
  const duplicate = high();
  duplicate.classDisciplines = ["discipline-armor"];
  assert.equal(forgeBudget(duplicate, C), 127);
  assert.equal(forgeCharacter(duplicate, C).state.ranks["discipline-armor"], 1);
  assert.equal(levelForXP(xpForLevel(30) + 1e9), 30);
});
test("confluences require exact touching nodes, including all three or four disciplines; rank alone never bypasses a gate", () => {
  for (const n of NODES.filter((n) => n.kind === "intersection")) {
    const d = high();
    for (const id of n.requires.slice(0, -1)) learn(d, id);
    assert.ok(forgeRequirements(n, d, C).length, n.id);
    learn(d, n.requires.at(-1));
    assert.deepEqual(forgeRequirements(n, d, C), [], n.id);
    learn(d, n.id);
    const plan = forgeRefundPlan(d, C, n.requires[0]);
    assert.ok(plan.removed.includes(n.id));
    assert.ok(plan.refund >= n.cost);
    assert.deepEqual(validateForge(plan.draft, C), []);
  }
});
test("refunds cascade through profile upgrades and rank investments but retain independent paths", () => {
  const d = high(1);
  learn(d, "marksmanship:0:4");
  learn(d, "marksmanship:1:2");
  const p = forgeRefundPlan(d, C, "marksmanship:0:1");
  assert.ok(p.removed.includes("marksmanship:0:4"));
  assert.ok(p.draft.forge.nodes.includes("marksmanship:1:0"));
  assert.deepEqual(validateForge(p.draft, C), []);
  assert.throws(() => forgeRefundPlan(d, C, "marksmanship:origin"), /Starting/);
});
test("bow and melee profiles replace previous profiles, range applies to all bow powers and reactions use the same training", () => {
  const d = high(1);
  learn(d, "marksmanship:0:4");
  learn(d, "marksmanship:1:1");
  const g = arena(d);
  assert.deepEqual(
    g.powerSpec("power-forge-shot").effects[0].amount,
    [2, 3, 5],
  );
  assert.deepEqual(
    g.powerSpec("power-barbed-arrow").effects[0].amount,
    [2, 3, 5],
  );
  assert.equal(g.powerSpec("power-forge-shot").range, 6);
  assert.deepEqual(
    g.powerSpec("power-forge-twin-shot").effects[0].amount,
    [2, 3, 5],
  );
});
test("Twin Shot spends one Action, rolls two separate attacks, checks two arrows, and emits two arrow events", () => {
  const d = high(1);
  learn(d, "marksmanship:0:4");
  const g = arena(d),
    events = [];
  const emit = g.emit.bind(g);
  g.emit = (type, data) => {
    if (type === "attack") events.push(data);
    emit(type, data);
  };
  let rolls = 0,
    checks = 0;
  const roll = g.heroRoll.bind(g),
    check = g.checkSupply.bind(g);
  g.heroRoll = (...a) => {
    rolls++;
    return roll(...a);
  };
  g.checkSupply = (...a) => {
    checks++;
    return check(...a);
  };
  g.usePower("power-forge-twin-shot", "target");
  assert.equal(g.budget.remaining.main, 0);
  assert.equal(rolls, 2);
  assert.equal(checks, 2);
  assert.equal(events.length, 2);
  assert.ok(events.every((e) => e.ranged));
  assert.equal(g.enemies[0].hp, 192);
});
test("an exhausted first arrow stops Twin Shot before dealing free second-shot damage", () => {
  const d = high(1);
  learn(d, "marksmanship:0:4");
  const g = arena(d);
  const ammo = g.supplyItem(g.active, "item-ammunition-bundle");
  g.active.supplies[ammo.instanceId] = 4;
  g.supplyDie = () => 1;
  g.usePower("power-forge-twin-shot", "target");
  assert.equal(g.enemies[0].hp, 196);
  assert.equal(g.supplyItem(g.active, "item-ammunition-bundle"), undefined);
});
test("every learned active node can execute its actual effects in a valid arena", () => {
  for (const n of NODES.filter(
    (n) => n.power && POWERS[n.power].category !== "passive",
  )) {
    const d = high();
    learn(d, n.id);
    const g = arena(d),
      h = g.active,
      p = g.powerSpec(n.power),
      e = g.enemies[0];
    if (p.weapon) {
      for (const i of h.preview.inventory.items)
        if (i.held) h.draft.loadout[i.instanceId] = { held: false };
      const gear = ordinaryItem(
        C,
        `item-ordinary-${p.weapon}-weapon`,
        "test-weapon",
      );
      gear.held = true;
      gear.hands = p.weapon === "ranged" ? 2 : 1;
      (h.treasure ??= []).push(gear);
    }
    for (const id of [
      p.supply,
      p.weapon === "ranged" ? "item-ammunition-bundle" : null,
    ].filter(Boolean))
      (h.treasure ??= []).push(ordinaryItem(C, id, "test-" + id));
    g.refreshHero(h);
    g.beginHero();
    h.survival.hp -= 6;
    g.party[1].survival.hp -= 6;
    for (const effect of p.effects.filter((e) => e.kind === "cleanse"))
      for (const k of effect.keys)
        g.powerCondition(p.target === "self" ? h : g.party[1], k, 1, "test");
    if (p.effects.some((e) => e.kind === "wound")) {
      const record = C.wounds.records.find((w) => w.recoveryValue);
      g.party[1].wounds.push({ id: "w", record, effects: [], applied: true });
    }
    if (p.effects.some((e) => e.kind === "resource")) {
      g.budgets[g.party[1].id] = R.startTurn({ turnId: "ally", speed: 5 });
      g.budgets[g.party[1].id].remaining.reaction = 0;
    }
    let target =
      p.target === "self"
        ? h.id
        : p.target === "enemy"
          ? e.id
          : p.target === "ally"
            ? g.party[1].id
            : { x: 3, z: 5 };
    if (p.shape === "wall") target = { x: 9, z: 5 };
    if (p.effects.some((e) => e.kind === "move")) target = { x: 5, z: 4 };
    assert.equal(g.actionReason(n.power), "", n.id);
    assert.doesNotThrow(() => g.useAbility(n.power, target), n.id);
    assert.equal(g.budget.remaining[p.category], 0, n.id + " pays");
    if (p.effects.some((e) => e.kind === "damage"))
      assert.ok(e.hp < 200, n.id + " damages");
  }
});
test("a combined barrier and movement buff survive together and shield block requires its node", () => {
  const d = high();
  learn(d, "intersection:unbroken-company");
  const g = arena(d);
  g.usePower("power-forge-unbroken-company", g.active.id);
  assert.ok(g.powerStat(g.active, "absorb") >= 12);
  assert.equal(g.powerStat(g.active, "movement") >= 1, true);
  const h = g.active;
  h.preview.state.abilities = [];
  assert.equal(!!g.canBlock(h), false);
});
test("training and full respec preserve inventory, missing HP, spent Grit, XP and earned DP across save/load", () => {
  const g = fresh(),
    h = g.active;
  h.survival.hp -= 5;
  h.survival.gritAvailable -= 1;
  g.awardXP("test-train", xpForLevel(7), "test");
  const items = h.preview.inventory.items.map((i) => i.instanceId),
    xp = h.xp,
    hp = h.survival.hp;
  g.trainForge(0);
  assert.equal(g.active.preview.state.level, 7);
  assert.equal(g.active.preview.development.current, 24);
  assert.equal(g.active.survival.hp, hp);
  assert.equal(g.active.survival.gritAvailable, 3);
  const d = g.newRespecDraft(0);
  assert.equal(d.forge.nodes.length, 0);
  Object.assign(d, structuredClone(drafts[1]), {
    name: h.name,
    progression: { level: 7 },
  });
  g.respec(0, d, h.heroId);
  assert.equal(g.active.xp, xp);
  assert.deepEqual(
    g.active.preview.inventory.items.map((i) => i.instanceId),
    items,
  );
  assert.ok(g.active.survival.hp <= hp);
  const next = fresh();
  next.load(deserialize(serialize(g.snapshot())));
  assert.deepEqual(next.active.draft.forge, g.active.draft.forge);
  assert.equal(next.active.preview.development.current, 24);
});
test("invalid purchases are atomic and older-edition saves are rejected without rewriting their data", () => {
  const g = fresh(),
    before = serialize(g.snapshot());
  assert.throws(() => g.editForge(0, { buy: "intersection:fourfold-aegis" }));
  assert.equal(
    serialize(g.snapshot()).replace(/"savedAt":"[^"]+"/, ""),
    before.replace(/"savedAt":"[^"]+"/, ""),
  );
  const old = JSON.parse(before);
  old.version = 1;
  assert.throws(() => deserialize(JSON.stringify(old)), /supported/);
  assert.equal(old.version, 1);
});

test("recipe paths stack time reductions and a confluence reduces material prices even when recipes overlap", () => {
  const d = high();
  learn(d, "craft:0:0");
  const g = arena(d),
    baseTime = g.recipeTime(g.active, { minutes: 120 }),
    basePrice = g.recipePrice(g.active, { materialPrice: 100 });
  learn(d, "intersection:alchemical-insight");
  g.party[0] = g.hero(d, 0);
  assert.ok(g.recipeTime(g.active, { minutes: 120 }) < baseTime);
  assert.ok(g.recipePrice(g.active, { materialPrice: 100 }) < basePrice);
  assert.ok(g.knownRecipes(g.active).has("recipe-restoration-draught"));
});
test("new equipment purchases begin stowed and adding a duplicate weapon cannot consume extra hands", () => {
  const d = structuredClone(drafts[0]);
  d.shopping.push({
    id: "item-ordinary-melee-weapon",
    instanceId: "extra:blade",
    quantity: 1,
    hands: 1,
  });
  const p = forgeCharacter(d, C);
  assert.equal(p.valid, true);
  assert.equal(
    p.inventory.items.find((i) => i.instanceId === "extra:blade").held,
    false,
  );
});
test("default enemy clicks use learned forge attacks rather than removed legacy basic actions", () => {
  const g = arena(drafts[1]);
  const before = g.enemies[0].hp;
  g.attack("target");
  assert.ok(g.enemies[0].hp < before);
  assert.equal(g.budget.remaining.main, 0);
});
test("the starting company puts learned attacks and spells on the combat bar before generic actions", () => {
  const g = fresh();
  assert.equal(g.party[0].favorites[0], "power-forge-strike");
  assert.equal(g.party[1].favorites[0], "power-forge-shot");
  assert.ok(g.party[3].favorites.includes("power-ember-lance"));
  assert.ok(g.party.every((h) => h.favorites.length <= 6));
});
