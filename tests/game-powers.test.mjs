import { purchaseEligibility } from "../public/vendor/hol/rules/development.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { R, C, drafts } from "./game-fixture.mjs";
import { Game } from "../src/core/game.mjs";
import {
  POWERS,
  gameCatalog,
  isTrainable,
  gamePurchaseEligibility,
} from "../src/core/powers.mjs";
import { ordinaryItem } from "../src/core/treasure.mjs";
import { serialize, deserialize } from "../src/core/save.mjs";
import { RECIPES } from "../src/core/recipes.mjs";
import {
  normalizeAppearance,
  ANCESTRY_LOOKS,
  LOOK_OPTIONS,
} from "../src/core/identity.mjs";
import { neighbors, lineOfSight, key } from "../src/core/dungeon.mjs";
import { surfaceAt } from "../src/core/battlefield.mjs";
import { reachableCells } from "../src/core/movement.mjs";
function fresh() {
  const g = new Game(R, gameCatalog(C));
  g.fresh(drafts);
  g.pause();
  return g;
}
function arena() {
  const g = fresh();
  g.suspended = false;
  g.advance = () => {};
  g.map = {
    ...g.map,
    tiles: {},
    obstacles: {},
    lights: [{ x: 6, z: 6, radius: 12 }],
    rooms: [],
    chests: [],
    zones: [],
    entrance: { x: 0, z: 0 },
    exit: { x: 12, z: 12 },
  };
  for (let x = 0; x < 15; x++)
    for (let z = 0; z < 15; z++) g.map.tiles[key(x, z)] = { x, z };
  g.party.forEach((h, i) =>
    Object.assign(h, { x: 5 + (i % 2), z: 5 + Math.floor(i / 2) }),
  );
  g.enemies = [
    {
      id: "target",
      name: "Sentry",
      x: 4,
      z: 5,
      hp: 100,
      maxHp: 100,
      conditions: [],
      reactionUsed: true,
    },
  ];
  g.mode = "combat";
  g.encounter = R.startEncounter(
    [
      ...g.party.map((h) => ({ id: h.id, side: "players" })),
      { id: "target", side: "opposition" },
    ],
    [6, 6, 6],
  );
  g.dice = (n = 3) => Array(n).fill(6);
  return g;
}
function grant(g, id) {
  g.active.preview.state.abilities.push(id);
}
function item(g, id) {
  const i = ordinaryItem(g.C, id, `test-${crypto.randomUUID()}`);
  (g.active.treasure ??= []).push(i);
  g.refreshHero(g.active);
  return i;
}
function wound(g, h, exceptional = false) {
  const record = C.wounds.records.find((w) =>
    exceptional ? !w.recoveryValue : w.recoveryValue,
  );
  const w = { id: crypto.randomUUID(), record, effects: [], applied: true };
  h.wounds.push(w);
  return w;
}

test("new training uses game designs while originals and legacy heroes remain valid", () => {
  const g = fresh();
  assert.equal(Object.keys(POWERS).length, 263);
  assert.equal(
    C.choices.some((c) => c.gamePower),
    false,
  );
  for (const h of g.party) {
    assert.equal(h.preview.valid, true);
    assert.ok(g.availableActions(h).some((c) => c.gamePower));
  }
  assert.equal(
    isTrainable(
      C.choices.find((c) => c.id === "ability-cinder-cast"),
      g.C,
    ),
    false,
  );
  for (const o of g.C.choices.filter((c) => c.kind === "origin"))
    for (const pair of o.pairs.filter((p) => p.gamePower))
      assert.ok(POWERS[pair.abilityId]);
  for (const cls of g.C.choices.filter((c) => c.kind === "class"))
    for (const tier of [1, 3, 7])
      assert.equal(cls.signatures[tier].filter((id) => POWERS[id]).length, 3);
});
test("every active game power validates a target and executes its declared effects", () => {
  for (const p of Object.values(POWERS).filter(
    (p) => p.category !== "passive",
  )) {
    const g = arena(),
      h = g.active,
      e = g.enemies[0];
    if (p.weapon) {
      const i = item(g, `item-ordinary-${p.weapon}-weapon`);
      i.held = true;
      i.hands = p.weapon === "ranged" ? 2 : 1;
      g.refreshHero(h);
    }
    if (p.weapon === "ranged") item(g, "item-ammunition-bundle");
    if (p.supply) item(g, p.supply);
    grant(g, p.id);
    g.beginHero();
    h.survival.hp -= 10;
    g.party[1].survival.hp -= 10;
    for (const effect of p.effects.filter((e) => e.kind === "cleanse"))
      for (const target of [
        p.target === "self" || p.effects.some((e) => e.kind === "move")
          ? h
          : g.party[1],
      ])
        for (const key of effect.keys) g.powerCondition(target, key, 2, e.id);
    if (p.effects.some((e) => e.kind === "wound")) wound(g, g.party[1]);
    if (p.effects.some((e) => e.kind === "resource")) {
      g.budgets[g.party[1].id] = R.startTurn({ turnId: "ally", speed: 5 });
      g.budgets[g.party[1].id].remaining[
        p.effects.find((e) => e.kind === "resource").resource
      ] = 0;
    }
    let target =
      p.target === "self"
        ? h.id
        : p.target === "enemy"
          ? e.id
          : p.target === "ally"
            ? g.party[1].id
            : { x: 3, z: 5 };
    if (p.effects.some((e) => e.kind === "damage") && p.target === "ground")
      target = { x: e.x, z: e.z };
    if (p.shape === "wall") target = { x: 8, z: 5 };
    if (p.effects.some((e) => e.kind === "move")) target = { x: 5, z: 4 };
    const reason = g.actionReason(p.id);
    assert.equal(reason, "", `${p.id}: ${reason}`);
    assert.doesNotThrow(() => g.useAbility(p.id, target), p.id);
    assert.equal(g.budget.remaining[p.category], 0, p.id + " pays action");
    if (p.limit) assert.equal(h.powerUses[p.id], 1, p.id + " records usage");
    if (p.restLimit)
      assert.equal(h.restPowerUses[p.id], 1, p.id + " records rest charges");
    if (p.effects.some((e) => e.kind === "damage"))
      assert.ok(e.hp < 100, p.id + " actually damages");
  }
});
test("invalid targeting never spends actions, charges or ammunition", () => {
  const g = arena(),
    h = g.active;
  grant(g, "power-firebreak");
  g.beginHero();
  const before = structuredClone(g.budget);
  assert.throws(() => g.useAbility("power-firebreak", { x: 100, z: 100 }));
  assert.deepEqual(g.budget, before);
  assert.equal(h.powerUses?.["power-firebreak"], undefined);
  grant(g, "power-vault");
  assert.throws(() => g.useAbility("power-vault", g.party[1]));
  assert.deepEqual(g.budget, before);
});
test("starter techniques apply movement, conditions and damage reduction at will", () => {
  const g = arena(),
    h = g.active,
    e = g.enemies[0];
  const weapon = item(g, "item-ordinary-melee-weapon");
  weapon.held = true;
  weapon.hands = 1;
  g.refreshHero(h);
  grant(g, "power-hamstring");
  grant(g, "power-plated-advance");
  h.preview.state.abilities = ["power-hamstring", "power-plated-advance"];
  g.beginHero();
  const movement = g.movementLeft();
  g.useAbility("power-plated-advance", h.id);
  assert.equal(g.movementLeft(), movement + 2);
  const hp = h.survival.hp;
  g.suffer(h, 3, "fire");
  assert.equal(h.survival.hp, hp - 2);
  g.useAbility("power-hamstring", e.id);
  assert.ok(e.hp < 100);
  assert.equal(R.conditionSummary(e.conditions).slowed.rating, 1);
  assert.match(g.actionReason("power-plated-advance"), /No maneuver/);
  g.budget.remaining.maneuver = 1;
  assert.equal(g.actionReason("power-plated-advance"), "");
});
test("condition care rejects useless targets but works on full-HP poisoned companions", () => {
  const g = arena(),
    h = g.active,
    ally = g.party[1];
  grant(g, "power-cool-blood");
  grant(g, "power-field-antidote");
  g.beginHero();
  const before = structuredClone(g.budget);
  assert.throws(
    () => g.useAbility("power-cool-blood", ally.id),
    /temporary condition/,
  );
  assert.deepEqual(g.budget, before);
  assert.equal(h.powerUses?.["power-cool-blood"], undefined);
  g.powerCondition(ally, "poisoned", 2, "venom");
  const hp = ally.survival.hp;
  g.useAbility("power-field-antidote", ally.id);
  assert.equal(ally.survival.hp, hp);
  assert.equal(R.conditionSummary(ally.conditions).poisoned.rating, 0);
  assert.equal(h.restPowerUses["power-field-antidote"], undefined);
});
test("damage bonus, DR, reduction and absorption have bounded nonstacking effects", () => {
  const g = arena(),
    h = g.active,
    e = g.enemies[0];
  h.preview.state.abilities = [];
  g.powerBuff(h, h, { damage: 4, attack: 1 }, 2, "a");
  g.powerBuff(h, h, { damage: 2, attack: 2 }, 2, "b");
  assert.equal(g.consumeDamageBonus(h), 4);
  assert.equal(g.consumeDamageBonus(h), 0);
  assert.equal(g.powerStat(h, "attack"), 2);
  g.powerBuff(h, h, { reduction: 2, absorb: 4 }, 2, "guard");
  const hp = h.survival.hp;
  g.suffer(h, 8, "fire");
  assert.equal(h.survival.hp, hp - 2);
  g.suffer(h, 3, "fire");
  assert.equal(h.survival.hp, hp - 3);
  g.powerBuff(h, e, { dr: -1 }, 2, "weak");
  assert.equal(
    g.absorbPowerDamage(e, 4, "physical"),
    4,
    "negative DR cannot create vulnerability below zero",
  );
});
test("surfaces interact on entry for both sides; walls and smoke obey visibility", () => {
  const g = arena(),
    h = g.active,
    e = g.enemies[0],
    p = { x: 3, z: 5 };
  g.createSurface("fire", [p], h);
  const hp = e.hp;
  g.powerForceMove(e, { x: -1, z: 0 }, 1);
  assert.equal(e.x, 3);
  assert.ok(e.hp < hp);
  assert.ok(e.conditions.some((c) => c.key === "burning"));
  g.createSurface("water", [p], h);
  assert.equal(surfaceAt(g.map, p, "fire"), false);
  assert.equal(
    e.conditions.some((c) => c.key === "burning"),
    false,
  );
  g.createSurface("wall", [{ x: 7, z: 5 }], h);
  assert.equal(lineOfSight(g.map, h, { x: 8, z: 5 }), false);
  assert.equal(
    neighbors(g.map, { x: 6, z: 5 }).some((p) => p.x === 7 && p.z === 5),
    false,
  );
  g.createSurface("smoke", [{ x: 5, z: 4 }], h);
  assert.equal(lineOfSight(g.map, h, { x: 5, z: 3 }), false);
  assert.equal(lineOfSight(g.map, h, { x: 5, z: 4 }), true);
  g.advanceTime(19);
  assert.equal(g.map.zones.length, 0);
});
test("concealment prevents distant targeting and ends on damage; magical light reveals", () => {
  const g = arena(),
    h = g.active,
    e = { ...g.enemies[0], x: 1 };
  g.powerBuff(h, h, { hidden: true }, 2, "hide");
  assert.equal(g.powerTargetable(h, e), false);
  g.suffer(h, 1, "physical");
  assert.equal(g.powerTargetable(h, e), true);
  g.powerBuff(h, h, { hidden: true }, 2, "hide");
  g.createSurface("light", [{ x: h.x, z: h.z }], h);
  assert.equal(g.powerTargetable(h, e), true);
});
test("recipe book learns independently, consumes exact batches, replenishes without duplicate items", () => {
  const g = fresh(),
    h = g.active;
  g.campaign.bank = 500;
  item(g, "item-craft-tools");
  const r = RECIPES[0];
  g.buyRecipeMaterials(0, r.id);
  const coins = g.campaign.bank;
  const made = g.craftRecipe(0, r.id);
  assert.equal(g.campaign.bank, coins);
  assert.equal(h.supplies[made.instanceId], 6);
  assert.equal(h.recipeMaterials[r.id], 0);
  assert.throws(() => g.craftRecipe(0, r.id));
  h.supplies[made.instanceId] = 0;
  g.buyRecipeMaterials(0, r.id);
  const n = h.treasure.length;
  g.craftRecipe(0, r.id, made.instanceId);
  assert.equal(h.treasure.length, n);
  assert.equal(h.supplies[made.instanceId], 6);
  g.learnRecipe(0, "recipe-lesser-healing-bottle");
  assert.ok(g.knownRecipes(h).has("recipe-lesser-healing-bottle"));
  assert.throws(() => g.learnRecipe(0, "recipe-lesser-healing-bottle"));
  assert.ok(g.campaign.supplyNotices.length);
});
test("wound treatment has clear costs, clears linked penalties, keeps HP, Grit and history", () => {
  const g = fresh(),
    h = g.active,
    w = wound(g, h);
  h.conditions.push({
    id: "wound-penalty",
    key: "slowed",
    rating: 1,
    persistence: "starred",
    woundId: w.id,
    source: w.id,
  });
  const before = {
    hp: h.survival.hp,
    grit: h.survival.gritAvailable,
    count: h.wounds.length,
  };
  item(g, "item-field-dressing");
  g.treatGameWound(0, w.id);
  assert.equal(w.treatment.completed, true);
  assert.equal(h.conditions.length, 0);
  assert.deepEqual(
    {
      hp: h.survival.hp,
      grit: h.survival.gritAvailable,
      count: h.wounds.length,
    },
    before,
  );
  const severe = wound(g, h, true);
  g.campaign.bank = 100;
  g.treatGameWound(0, severe.id, "town");
  assert.equal(g.campaign.bank, 0);
  assert.equal(severe.treatment.completed, true);
  assert.throws(() => g.treatGameWound(0, severe.id, "town"));
});
test("all appearance choices, recipes, charges and surfaces survive save/load", () => {
  const g = fresh(),
    h = g.active;
  g.setAppearance(0, {
    sex: "female",
    hair: "braid",
    beard: "braided",
    eyeColor: "#22aaee",
    clothColor: "#445566",
  });
  h.recipeBook = ["recipe-smoke-flask"];
  h.recipeMaterials = { "recipe-smoke-flask": 2 };
  h.restPowerUses = { "power-mending-touch": 2 };
  g.createSurface("fire", [{ x: h.x + 1, z: h.z }], h);
  const loaded = new Game(R, gameCatalog(C));
  loaded.load(deserialize(serialize(g.snapshot())), { resume: false });
  assert.deepEqual(loaded.party[0].draft.appearance, h.draft.appearance);
  assert.deepEqual(loaded.party[0].recipeBook, h.recipeBook);
  assert.deepEqual(loaded.party[0].recipeMaterials, h.recipeMaterials);
  assert.deepEqual(loaded.party[0].restPowerUses, h.restPowerUses);
  assert.deepEqual(loaded.map.zones, g.map.zones);
  for (const ancestry of Object.keys(ANCESTRY_LOOKS))
    for (const sex of LOOK_OPTIONS.sex) {
      const a = normalizeAppearance({ sex }, ancestry, "Ada");
      assert.equal(a.sex, sex);
      assert.ok(ANCESTRY_LOOKS[ancestry].skins.includes(a.skin));
    }
});
test("rest charges require eight hours sleep, not a breath or one-hour wait", () => {
  const g = fresh(),
    h = g.active;
  h.restPowerUses = { "power-mending-touch": 3 };
  g.advanceTime(3600);
  assert.equal(h.restPowerUses["power-mending-touch"], 3);
  for (let n = 0; n < 7; n++) g.sleepHour();
  assert.equal(h.restPowerUses["power-mending-touch"], 3);
  g.sleepHour();
  assert.deepEqual(h.restPowerUses, {});
});
test("movement overlay uses weighted routes and distinguishes pass-through allies", () => {
  const g = arena(),
    h = g.active;
  g.beginHero();
  const cells = g.movementRange(),
    ally = cells.find((p) => p.x === 6 && p.z === 5);
  assert.equal(ally.canEnd, false);
  assert.ok(cells.some((p) => p.x === 7 && p.z === 5 && p.canEnd));
  g.map.tiles["5,4"].difficult = true;
  const next = g.movementRange().find((p) => p.x === 5 && p.z === 4);
  assert.equal(next.cost, 2);
  for (const p of g.movementRange().filter((p) => p.canEnd && p.cost > 0))
    assert.equal(
      g.route(p).reduce((n, q) => n + g.moveCost(q), 0),
      p.cost,
    );
  g.budget.movementSpent = 999;
  assert.equal(
    g.movementRange().some((p) => p.cost > 0),
    false,
  );
});
test("new game creation validates actual acquisition and signature choices", () => {
  const catalogs = gameCatalog(C),
    d = structuredClone(drafts[0]);
  d.purchases = { 0: [], 1: [] };
  d.acquisitions = { "power-driving-cut": { meleeHands: 1 } };
  d.culture = { id: "origin-culture-walled-communities", pair: 2 };
  d.background = { id: "origin-background-household-guard", pair: 2 };
  d.signatureId = "power-signature-sworn-guardian";
  const p = R.workshopCharacter(d, catalogs);
  assert.equal(p.valid, true, JSON.stringify(p.errors));
  assert.ok(p.state.abilities.includes("power-driving-cut"));
  assert.ok(
    p.inventory.items.some((i) => i.catalogId === "item-ordinary-melee-weapon"),
  );
  const g = new Game(R, catalogs);
  g.fresh([d, ...drafts.slice(1)]);
  g.pause();
  assert.ok(
    g.availableActions(g.active).some((c) => c.id === "power-driving-cut"),
  );
});

test("invalid new save state is rejected without replacing the active campaign", () => {
  const g = fresh(),
    previous = g.campaign;
  for (const edit of [
    (c) => {
      c.party[0].recipeMaterials = { "recipe-bound-torches": -1 };
    },
    (c) => {
      c.party[0].powerEffects = [{ stats: { movement: 100 } }];
    },
    (c) => {
      c.floor.map.zones = [
        { id: "bad", kind: "fire", cells: [{ x: NaN, z: 0 }] },
      ];
    },
  ]) {
    const saved = deserialize(serialize(g.snapshot()));
    edit(saved);
    assert.throws(() => g.load(saved), /Saved/);
    assert.equal(g.campaign, previous);
  }
});
test("first-turn movement preview honors Slowed and movement buffs before selecting the turn", () => {
  const g = arena(),
    h = g.active;
  g.powerBuff(h, h, { movement: 2 }, 2, "fleet");
  g.powerCondition(h, "slowed", 1, h.id);
  const preview = g.movementLeft();
  assert.equal(preview, g.speed(h) + 1);
  g.beginHero();
  assert.equal(g.movementLeft(), preview);
});
test("one-use traps trigger once, and a healing field heals on the next ally turn", () => {
  const g = arena(),
    h = g.active,
    e = g.enemies[0];
  g.createSurface("trap", [{ x: 3, z: 5 }], h);
  g.powerForceMove(e, { x: -1, z: 0 }, 1);
  const hp = e.hp;
  g.surfaceContact(e, { entry: true });
  assert.equal(e.hp, hp);
  h.survival.hp -= 8;
  g.createSurface("healing", [{ x: h.x, z: h.z }], h);
  const before = h.survival.hp;
  g.surfaceContact(h);
  assert.ok(h.survival.hp > before);
});

test("new spell interruption spends its action once and preserves uncast charges", () => {
  const g = arena(),
    h = g.active,
    e = g.enemies[0];
  grant(g, "power-ember-lance");
  e.reactionUsed = false;
  h.survival.hp = 1;
  g.dice = (n = 3) => Array(n).fill(2);
  g.useAbility("power-ember-lance", e.id);
  if (g.pendingDefense) g.resolveReaction(false);
  assert.equal(e.reactionUsed, true);
  assert.equal(e.hp, 100);
  assert.equal(h.survival.status, "dying");
  assert.equal(g.budget.remaining.main, 0);
  assert.equal(h.powerUses?.["power-ember-lance"], undefined);
});
test("an at-will spell resumes after a saved shield decision spending its action exactly once", () => {
  const g = arena(),
    h = g.active,
    e = g.enemies[0];
  grant(g, "power-ember-lance");
  e.reactionUsed = false;
  const shield = item(g, "item-ordinary-shield");
  shield.held = true;
  shield.hands = 1;
  g.refreshHero(h);
  grant(g, "power-ember-lance");
  // A held shield opens a reaction before the spell resolves.
  g.useAbility("power-ember-lance", e.id);
  assert.ok(g.pendingDefense);
  const saved = deserialize(serialize(g.snapshot()));
  const copy = new Game(R, gameCatalog(C));
  copy.load(saved, { resume: false });
  copy.active.preview.state.abilities.push("power-ember-lance");
  copy.advance = () => {};
  copy.dice = (n = 3) => Array(n).fill(6);
  copy.suspended = false;
  copy.resolveReaction(false);
  assert.equal(copy.pendingProvocation, null);
  assert.equal(copy.budget.remaining.main, 0);
  assert.equal(copy.active.powerUses["power-ember-lance"], undefined);
  assert.ok(copy.enemies[0].hp < 100);
});

test("converted legacy powers cannot be bought a second time", () => {
  const g = fresh(),
    h = g.party[3];
  const id = g.powerIds(h).find((id) => POWERS[id] && !POWERS[id].classId);
  const result = gamePurchaseEligibility(
    g.C.choices.find((c) => c.id === id),
    h.preview.state,
    g.C,
    { ...R, purchaseEligibility },
  );
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.some((r) => r.code === "already-known"));
});

test("bonus Maneuver is saved for the recipient's next eligible turn and can actually be used", () => {
  const g = arena(),
    h = g.active,
    ally = g.party[1];
  grant(g, "power-second-wind");
  g.useAbility("power-second-wind", ally.id);
  assert.equal(ally.powerPendingManeuver, true);
  assert.deepEqual(ally.powerResourceUsed, ["maneuver"]);
  // Begin the recipient's next turn, as a new alternating phase would.
  g.encounter = R.startEncounter(
    [
      ...g.party.map((h) => ({ id: h.id, side: "players" })),
      { id: g.enemies[0].id, side: "opposition" },
    ],
    [6, 6, 6],
  );
  g.selected = 1;
  g.beginHero();
  assert.equal(g.budget.remaining.maneuver, 2);
  g.spend("maneuver", "ability-defend");
  g.spend("maneuver", "ability-defend");
  assert.equal(g.budget.remaining.maneuver, 0);
  assert.equal(ally.powerPendingManeuver, false);
  assert.throws(() => g.spend("maneuver", "ability-defend"), /No maneuver/);
});

test("a saved hazard remains safe after its owner leaves the active party", () => {
  const g = arena(),
    e = g.enemies[0];
  e.reactionUsed = false;
  g.map.zones = [
    {
      id: "orphan",
      kind: "fire",
      source: "former-companion",
      cells: [{ x: e.x, z: e.z }],
      expires: 18,
      hits: {},
    },
  ];
  assert.doesNotThrow(() => g.surfaceContact(e, { entry: true }));
  assert.ok(e.hp < 100);
});
