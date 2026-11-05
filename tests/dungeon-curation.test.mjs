import test from "node:test";
import assert from "node:assert/strict";
import { fresh, R, C } from "./game-fixture.mjs";
import { ABILITIES, coverage } from "../src/core/abilities.mjs";
import { DUNGEON_TRAITS } from "../src/core/ancestry-game.mjs";
import { ordinaryItem } from "../src/core/treasure.mjs";
import { heroCanSee, visionPenalty } from "../src/core/lighting.mjs";
import { Game } from "../src/core/game.mjs";
import { serialize, deserialize } from "../src/core/save.mjs";
function arena() {
  const g = fresh();
  g.pause();
  g.suspended = false;
  g.advance = () => {};
  g.map = {
    ...g.map,
    tiles: {},
    obstacles: {},
    lights: [{ x: 6, z: 6, radius: 12 }],
    chests: [],
    rooms: [],
  };
  for (let x = 0; x < 15; x++)
    for (let z = 0; z < 15; z++) g.map.tiles[`${x},${z}`] = { x, z };
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
  g.selected = 0;
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
function equip(g, id) {
  const i = ordinaryItem(C, id, `test-${crypto.randomUUID()}`);
  (g.active.treasure ??= []).push(i);
  g.refreshHero(g.active);
  return i;
}
test("all source traits, signatures and origin grants have a concrete dungeon decision", () => {
  const traits = C.choices.filter((c) => c.kind === "ancestryTrait"); // catalog kind asserted through actual ancestry membership below
  const ids = C.choices
    .filter((c) => c.kind === "ancestry")
    .flatMap((c) => c.traits);
  assert.equal(ids.length, 50);
  assert.deepEqual(new Set(ids), new Set(Object.keys(DUNGEON_TRAITS)));
  const signatures = C.choices.filter(
    (c) => c.classId && c.id.startsWith("ability-signature-"),
  );
  assert.equal(signatures.length, 90);
  for (const c of signatures)
    assert.equal(coverage(c.id).status, "included", c.id);
  for (const p of C.choices.flatMap((c) => c.pairs ?? []))
    assert.equal(coverage(p.abilityId).status, "included", p.abilityId);
  for (const c of C.choices.filter((c) => c.kind === "ability"))
    assert.ok(["included", "retired"].includes(coverage(c.id).status), c.id);
});
test("every active class signature resolves its action and survives a save round trip", () => {
  for (const c of C.choices.filter((c) => c.classId && ABILITIES[c.id])) {
    const g = arena(),
      h = g.active,
      a = ABILITIES[c.id];
    if (a.weapon) {
      const i = equip(g, `item-ordinary-${a.weapon}-weapon`);
      i.held = true;
      g.refreshHero(h);
    }
    if (a.weapon === "ranged") equip(g, "item-ammunition-bundle");
    grant(g, c.id);
    let target =
      a.target === "enemy"
        ? g.enemies[0]
        : a.target === "self"
          ? h
          : g.party[1];
    if (target !== h)
      target.conditions = [
        {
          id: "test-daze",
          key: "dazed",
          rating: 2,
          persistence: "temporary",
          source: "target",
        },
      ];
    if (a.healing) target.survival.hp = 1;
    const before = g.log.length;
    try {
      g.useAbility(c.id, target.id);
    } catch (e) {
      throw new Error(`${c.id}: ${e.message}`, { cause: e });
    }
    assert.ok(g.log.length > before, c.id);
    assert.equal(g.budget.remaining[a.category], 0, c.id);
    const loaded = new Game(R, C);
    loaded.load(deserialize(serialize(g.snapshot())), { resume: false });
    assert.equal(loaded.encounter.current, h.id);
  }
});
test("prepared ancestry bonuses apply only to eligible rolls once daily; oath debt limits healing until dawn", () => {
  const g = arena(),
    h = g.active;
  h.draft.traitIds = [
    "trait-gnome-bright-idea",
    "trait-oath-bound-the-debt-comes-due",
  ];
  let args;
  g.roll = (attribute, boons, banes) => (
    (args = { attribute, boons, banes }),
    { tier: "standard", retained: [4, 4, 4], total: 12 }
  );
  g.prepareTrait(0, "trait-gnome-bright-idea");
  g.heroRoll(h, "brawn");
  assert.equal(args.boons, 0);
  assert.equal(h.preparedTraits.length, 1);
  g.heroRoll(h, "knowledge");
  assert.equal(args.boons, 2);
  g.heroRoll(h, "knowledge");
  assert.equal(args.boons, 0);
  assert.throws(
    () => g.prepareTrait(0, "trait-gnome-bright-idea"),
    /used today/,
  );
  g.prepareTrait(0, "trait-oath-bound-the-debt-comes-due");
  let rolls = 0;
  g.roll = () => ({
    tier: ++rolls === 1 ? "weak" : "strong",
    retained: [6, 6, 6],
    total: 18,
  });
  const hp = h.survival.hp;
  g.heroRoll(h, "fortitude");
  assert.equal(rolls, 2);
  assert.equal(h.survival.hp, hp - 1);
  assert.equal(g.healingMaximum(h), h.survival.maxHp - 1);
  const until = h.unavailableHp.until;
  g.advanceTime(until - g.clock().seconds);
  assert.equal(g.healingMaximum(h), h.survival.maxHp);
});
test("low-light vision reduces illumination Banes without darkvision; seismic sense detects grounded creatures only", () => {
  const g = arena(),
    h = g.active,
    p = { x: 9, z: 5, hp: 10 };
  g.map.lights = [];
  g.party.forEach((a) => {
    a.torch = { held: false, lit: false, seconds: 0 };
  });
  h.torch.lit = true;
  h.draft.traitIds = [];
  assert.equal(visionPenalty(g.map, g.party, h, p), 2);
  h.draft.traitIds = ["trait-deep-dwarf-eyes-for-the-dark"];
  assert.equal(visionPenalty(g.map, g.party, h, p), 0);
  h.torch.lit = false;
  assert.equal(heroCanSee(g.map, g.party, h, p), false);
  h.draft.traitIds = ["trait-deep-dwarf-stone-tells-you"];
  assert.equal(heroCanSee(g.map, g.party, h, p), true);
  assert.equal(heroCanSee(g.map, g.party, h, { ...p, flying: true }), false);
  assert.equal(heroCanSee(g.map, g.party, h, { x: 9, z: 5 }), false);
});
test("support effects use real turn duration; intercept spends Reaction and last stand never restores Grit", () => {
  const g = arena(),
    h = g.active,
    ally = g.party[1];
  grant(g, "ability-signature-protector-between-them");
  g.useAbility("ability-signature-protector-between-them", ally.id);
  const hp = h.survival.hp,
    allyHp = ally.survival.hp;
  g.suffer(ally, 2, "physical", g.enemies[0]);
  assert.equal(ally.survival.hp, allyHp);
  assert.equal(h.survival.hp, hp - 2);
  assert.equal(g.budget.remaining.reaction, 0);
  g.addTactic(h, ally, { lastStand: true }, "save");
  const grit = ally.survival.gritAvailable;
  g.suffer(ally, 100, "physical");
  assert.equal(ally.survival.hp, 1);
  assert.equal(ally.survival.gritAvailable, grit);
  assert.equal(g.tacticValue(ally, "lastStand"), 0);
  g.addTactic(h, ally, { defense: 2 }, "guard");
  assert.equal(g.tacticValue(ally, "defense"), 2);
  ally.survival.ownTurn++;
  assert.equal(g.tacticValue(ally, "defense"), 2);
  ally.survival.ownTurn++;
  assert.equal(g.tacticValue(ally, "defense"), 0);
});
test("retired purchases retrain only in town at the original stage and preserve inventory, XP and injuries", () => {
  const g = fresh();
  g.pause();
  const h = g.party[0],
    receipt = g.retiredPurchases(h)[0],
    choices = g.retrainingOptions(0, receipt);
  assert.ok(choices.length);
  const xp = h.xp,
    owned = h.preview.inventory.items.map((i) => i.catalogId).sort(),
    survival = structuredClone(h.survival);
  g.retrain(0, receipt, choices[0].id);
  assert.equal(h.xp, xp);
  assert.deepEqual(h.survival, survival);
  assert.deepEqual(
    h.preview.inventory.items.map((i) => i.catalogId).sort(),
    owned,
  );
  assert.equal(h.retraining.length, 1);
  assert.throws(
    () => g.retrain(0, receipt, choices[0].id),
    /supported replacement/,
  );
});
test("field harvesting costs time, advances a real supply and exhausts the floor patch", () => {
  const g = arena();
  g.mode = "exploration";
  g.enemies = [];
  grant(g, "ability-forage-woodland");
  g.useAbility("ability-forage-woodland");
  assert.equal(g.clock().seconds, 3600);
  assert.equal(g.map.foraged, true);
  assert.ok(
    g.active.preview.inventory.items.some(
      (i) =>
        i.catalogId === "item-food-bundle" && g.supplyValue(g.active, i) === 8,
    ),
  );
  assert.throws(() => g.useAbility("ability-forage-woodland"), /harvested/);
});

test("a tactical spell survives opportunity resolution without charging its Maneuver twice", () => {
  const g = arena(),
    h = g.active,
    e = g.enemies[0];
  grant(g, "ability-signature-arcanist-arcane-deflection");
  e.reactionUsed = false;
  h.survival.hp = h.survival.maxHp;
  g.useAbility("ability-signature-arcanist-arcane-deflection", g.party[1].id);
  if (g.pendingDefense) g.resolveDefense(false);
  assert.equal(g.pendingProvocation, null);
  assert.equal(g.budget.remaining.maneuver, 0);
  assert.equal(g.tacticValue(g.party[1], "defense"), 2);
  assert.equal(e.reactionUsed, true);
});
test("poison tolerance cancels only its poison Bane and never creates an invalid resistance type", () => {
  const g = arena(),
    h = g.active;
  h.draft.traitIds = ["trait-deep-dwarf-holds-its-own"];
  g.refreshHero(h);
  h.conditions = [
    {
      id: "venom",
      key: "poisoned",
      rating: 2,
      source: "target",
      persistence: "temporary",
    },
  ];
  let received;
  g.roll = (attr, boons, banes) => (
    (received = banes),
    { tier: "standard", retained: [4, 4, 4], total: 12 }
  );
  g.heroRoll(h, "brawn");
  assert.equal(received, 1);
  assert.equal(h.preview.resistances.poison, undefined);
});
