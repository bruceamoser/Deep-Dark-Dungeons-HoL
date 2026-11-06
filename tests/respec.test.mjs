import test from "node:test";
import assert from "node:assert/strict";
import { R, C, drafts } from "./game-fixture.mjs";
import { Game } from "../src/core/game.mjs";
import { gameCatalog, POWERS, isTrainable } from "../src/core/powers.mjs";
import { magicItem, ordinaryItem } from "../src/core/treasure.mjs";
import { serialize, deserialize } from "../src/core/save.mjs";
import { xpForLevel } from "../src/core/experience.mjs";
import { masteryBudget, masterySpent } from "../src/core/builds.mjs";
function fresh() {
  const g = new Game(R, gameCatalog(C));
  g.fresh(drafts);
  g.pause();
  return g;
}
function build(g, cls = "class-shadow") {
  const h = g.active,
    d = g.newRespecDraft(g.selected),
    c = g.C.choices.find((c) => c.id === cls);
  d.attributes = {
    brawn: 1,
    fortitude: 1,
    agility: 1,
    guile: 0,
    knowledge: 0,
    reason: 0,
  };
  d.ancestryId = h.draft.ancestryId;
  d.traitIds = [...h.draft.traitIds];
  d.languages = structuredClone(h.draft.languages);
  for (const k of ["culture", "background"]) {
    const origin = g.C.choices.find((c) => c.id === h.draft[k].id);
    d[k] = { id: origin.id, pair: origin.pairs.findIndex((p) => p.gamePower) };
  }
  d.classId = cls;
  d.classDisciplines = c.startingDisciplines.slice(0, 2);
  for (const level of [1, 3, 7])
    if (level <= h.preview.state.level) {
      const signature = c.signatures[level].filter((id) => POWERS[id])[2];
      if (level === 1) d.signatureId = signature;
      else d.progression.levels[level].signatures[level] = signature;
    }
  g.prepareRespecChoices(g.selected, d);
  return d;
}
function train(g, level) {
  const d = structuredClone(g.active.draft),
    c = g.C.choices.find((c) => c.id === d.classId);
  d.progression = { level, levels: {} };
  for (let n = 2; n <= level; n++) {
    d.progression.levels[n] = R.emptyLevelDraft();
    if ([3, 7].includes(n))
      d.progression.levels[n].signatures[n] = c.signatures[n].find(
        (id) => POWERS[id],
      );
  }
  g.active.xp = xpForLevel(level);
  g.active.earnedLevel = level;
  g.develop(g.selected, d);
}
test("respec begins with a blank build and does not change the living hero", () => {
  const g = fresh(),
    before = serialize(g.snapshot()),
    d = g.newRespecDraft(0);
  assert.equal(d.name, g.active.name);
  assert.deepEqual(d.appearance, g.active.draft.appearance);
  assert.deepEqual(Object.values(d.attributes), Array(6).fill(0));
  assert.equal(d.ancestryId, undefined);
  assert.equal(d.classId, undefined);
  assert.deepEqual(d.purchases, { 0: [], 1: [] });
  assert.equal(
    serialize(g.snapshot()).replace(/"savedAt":"[^"]+"/, ""),
    before.replace(/"savedAt":"[^"]+"/, ""),
  );
  const proposal = build(g);
  const state = structuredClone(g.snapshot());
  g.respecPreview(0, proposal);
  assert.deepEqual(g.snapshot(), state);
});
test("respec replaces legacy choices and preserves XP, history, identity, resources and equipped magic", () => {
  const g = fresh();
  train(g, 7);
  const h = g.active;
  h.xp += 123;
  h.survival.hp = 7;
  h.survival.maxHp -= 3;
  h.survival.gritAvailable = 0;
  h.wounds = [
    {
      id: "scar",
      applied: true,
      treatment: { completed: true },
      record: { injury: "Old scar" },
    },
  ];
  h.survival.wounds = 1;
  h.conditions = [
    {
      id: "wound-slow",
      key: "slowed",
      rating: 1,
      persistence: "starred",
      source: "scar",
    },
  ];
  h.recipeBook = ["recipe-lesser-healing-bottle"];
  h.recipeMaterials = { "recipe-lesser-healing-bottle": 2 };
  h.build = { talents: { "heavy-hands": 2 }, specializations: {} };
  const relic = magicItem(56789, 5, { base: "ring", affixes: ["might"] });
  relic.worn = true;
  relic.equippedSlot = "ring-left";
  (h.treasure ??= []).push(relic);
  g.refreshHero(h);
  const water = h.preview.inventory.items.find(
    (i) => i.catalogId === "item-water-flask",
  );
  h.supplies[water.instanceId] = 0;
  const prior = structuredClone(h),
    bank = g.campaign.bank,
    d = build(g);
  const items = h.preview.inventory.items
    .map((i) => [i.catalogId, i.quantity, i.hands ?? 0])
    .sort();
  g.respec(0, d, h.heroId);
  const next = g.active;
  assert.equal(next.heroId, prior.heroId);
  assert.equal(next.id, prior.id);
  assert.equal(next.name, prior.name);
  assert.equal(next.xp, prior.xp);
  assert.equal(next.earnedLevel, prior.earnedLevel);
  assert.equal(next.preview.state.level, 7);
  assert.equal(next.survival.hp, 7);
  assert.equal(next.survival.maxHp, next.preview.summary.maximumHp - 3);
  assert.equal(next.survival.gritAvailable, 0);
  assert.deepEqual(next.wounds, prior.wounds);
  assert.deepEqual(next.conditions, prior.conditions);
  assert.deepEqual(next.recipeBook, prior.recipeBook);
  assert.deepEqual(next.recipeMaterials, prior.recipeMaterials);
  assert.deepEqual(next.xpHistory, prior.xpHistory);
  assert.deepEqual(next.draft.appearance, prior.draft.appearance);
  assert.equal(g.campaign.bank, bank);
  assert.deepEqual(
    next.preview.inventory.items
      .map((i) => [i.catalogId, i.quantity, i.hands ?? 0])
      .sort(),
    items,
  );
  assert.equal(
    next.preview.inventory.items.find((i) => i.instanceId === relic.instanceId)
      .worn,
    true,
  );
  const retainedWater = next.preview.inventory.items.find(
    (i) => i.catalogId === "item-water-flask",
  );
  assert.equal(next.supplies[retainedWater.instanceId], 0);
  assert.equal(masteryBudget(next), 14);
  assert.equal(masterySpent(next), 0);
  assert.equal(next.draft.classId, "class-shadow");
  assert.ok(
    next.preview.state.abilities.every((id) =>
      isTrainable(
        g.C.choices.find((c) => c.id === id),
        g.C,
      ),
    ),
  );
  assert.ok(!next.preview.state.abilities.includes(prior.draft.signatureId));
  const copy = fresh();
  copy.load(deserialize(serialize(g.snapshot())), { resume: false });
  assert.deepEqual(copy.active.draft, next.draft);
  assert.deepEqual(copy.active.supplies, next.supplies);
  assert.equal(copy.active.xp, next.xp);
  assert.equal(copy.active.preview.inventory.items.length, items.length);
  copy.transferTreasure(0, retainedWater.instanceId, 1);
  assert.equal(copy.party[1].supplies[retainedWater.instanceId], 0);
  assert.equal(copy.supplyValue(copy.party[1], retainedWater), 0);
});
test("cancelled/invalid/remote/dead/stale-slot rebuilds are atomic and reject legacy options", () => {
  const g = fresh(),
    d = build(g),
    before = structuredClone(g.snapshot());
  const invalid = structuredClone(d);
  invalid.attributes.brawn = 99;
  assert.throws(() => g.respec(0, invalid, g.active.heroId));
  assert.deepEqual(g.snapshot(), before);
  assert.throws(() => g.respec(0, d, "wrong-hero"), /slot changed/);
  assert.deepEqual(g.snapshot(), before);
  const legacy = structuredClone(d);
  legacy.culture = { id: "origin-culture-walled-communities", pair: 1 };
  assert.throws(() => g.respec(0, legacy, g.active.heroId), /legacy/);
  assert.deepEqual(g.snapshot(), before);
  const level = structuredClone(d);
  level.progression.level = 2;
  assert.throws(() => g.respec(0, level, g.active.heroId), /trained level/);
  g.mode = "exploration";
  assert.throws(() => g.respec(0, d, g.active.heroId), /Greyhaven/);
  g.mode = "town";
  g.active.survival.status = "dead";
  assert.throws(() => g.newRespecDraft(0), /living/);
});
test("repeated rebuilds never generate coins, starting items or refill exhausted supplies", () => {
  const g = fresh(),
    h = g.active,
    food = h.preview.inventory.items.find(
      (i) => i.catalogId === "item-food-bundle",
    );
  h.supplies[food.instanceId] = 0;
  const sold = h.preview.inventory.items.find(
    (i) => i.catalogId === "item-rope-coil",
  );
  if (sold) {
    h.soldItems = [sold.instanceId];
    g.refreshHero(h);
  }
  const count = g.active.preview.inventory.items.length,
    bank = g.campaign.bank;
  for (let n = 0; n < 4; n++) {
    const d = build(g, n % 2 ? "class-protector" : "class-shadow");
    d.shopping = [
      {
        id: "item-superior-healing-bottle",
        quantity: 1,
        instanceId: "free-potion",
      },
    ];
    g.respec(0, d, g.active.heroId);
    assert.equal(g.active.preview.inventory.items.length, count);
    assert.equal(g.campaign.bank, bank);
    assert.equal(
      g.active.supplies[
        g.active.preview.inventory.items.find(
          (i) => i.catalogId === "item-food-bundle",
        ).instanceId
      ],
      0,
    );
    assert.ok(
      !g.active.preview.inventory.items.some(
        (i) => i.instanceId === "free-potion",
      ),
    );
    const copy = fresh();
    copy.load(deserialize(serialize(g.snapshot())), { resume: false });
    g.load(copy.snapshot(), { resume: false });
  }
});
test("two-handed equipment and d20/empty supplies keep their state across rebuild, transfer and reload", () => {
  const g = fresh(),
    h = g.active;
  const sword = h.preview.inventory.items.find(
    (i) => i.catalogId === "item-ordinary-melee-weapon",
  );
  // Real two-handed item receipt, plus a depleted and a large valid supply die.
  h.treasure = [ordinaryItem(g.C, "item-ordinary-melee-weapon", "greatsword")];
  h.treasure[0].hands = 2;
  g.refreshHero(h);
  const food = h.preview.inventory.items.find(
    (i) => i.catalogId === "item-food-bundle",
  );
  h.supplies[food.instanceId] = 20;
  g.respec(0, build(g), h.heroId);
  assert.equal(
    g.active.preview.inventory.items.find((i) => i.instanceId === "greatsword")
      .hands,
    2,
  );
  const i = g.active.preview.inventory.items.find(
    (i) => i.catalogId === "item-food-bundle",
  );
  assert.equal(g.active.supplies[i.instanceId], 20);
  g.transferTreasure(0, "greatsword", 1);
  assert.equal(
    g.party[1].preview.inventory.items.find(
      (i) => i.instanceId === "greatsword",
    ).hands,
    2,
  );
  const copy = fresh();
  copy.load(deserialize(serialize(g.snapshot())), { resume: false });
  assert.equal(
    copy.party[1].preview.inventory.items.find(
      (i) => i.instanceId === "greatsword",
    ).hands,
    2,
  );
  assert.equal(copy.active.supplies[i.instanceId], 20);
});
test("moving between low- and high-Grit builds cannot restore spent Grit", () => {
  const g = fresh();
  train(g, 7);
  g.active.survival.gritAvailable = 0;
  const base = build(g, "class-protector"),
    extra = structuredClone(base);
  extra.progression.levels[7].purchases = [{ id: "ability-one-more-dawn" }];
  assert.equal(R.workshopCharacter(extra, g.C).valid, true);
  g.respec(0, extra, g.active.heroId);
  g.active.survival.gritAvailable = 0;
  const debt = g.active.preview.summary.gritGranted;
  g.respec(0, base, g.active.heroId);
  assert.equal(g.active.survival.gritAvailable, 0);
  const copy = fresh();
  copy.load(deserialize(serialize(g.snapshot())), { resume: false });
  copy.respec(0, extra, copy.active.heroId);
  assert.equal(copy.active.survival.gritAvailable, 0);
  assert.equal(copy.active.respecGritSpent, debt);
  copy.respec(0, base, copy.active.heroId);
  const advance = structuredClone(copy.active.draft);
  advance.progression.level = 10;
  for (let n = 8; n <= 10; n++)
    advance.progression.levels[n] = R.emptyLevelDraft();
  advance.progression.levels[8].purchases = [{ id: "ability-one-more-dawn" }];
  copy.active.xp = xpForLevel(10);
  copy.active.earnedLevel = 10;
  copy.develop(0, advance);
  assert.equal(
    copy.active.survival.gritAvailable,
    Math.max(0, copy.active.preview.summary.gritGranted - debt),
  );
  const newlySpent = copy.active.survival.gritAvailable;
  copy.active.survival.gritAvailable = 0;
  const high = build(copy, "class-protector");
  high.progression.levels[7].purchases = [{ id: "ability-one-more-dawn" }];
  copy.respec(0, high, copy.active.heroId);
  assert.equal(
    copy.active.survival.gritAvailable,
    Math.max(0, copy.active.preview.summary.gritGranted - debt - newlySpent),
  );
});
test("rebuilt heroes retain untrained levels and can commit subsequent advancement", () => {
  const g = fresh();
  train(g, 7);
  g.active.xp = xpForLevel(8);
  g.active.earnedLevel = 8;
  const d = build(g);
  const missingSignature = structuredClone(d);
  missingSignature.progression.levels[7].signatures = {};
  assert.throws(() => g.respec(0, missingSignature, g.active.heroId));
  g.respec(0, d, g.active.heroId);
  const next = structuredClone(g.active.draft);
  next.progression.level = 8;
  next.progression.levels[8] = R.emptyLevelDraft();
  g.develop(0, next);
  assert.equal(g.active.preview.state.level, 8);
  assert.equal(g.active.earnedLevel, 8);
  assert.equal(g.active.xp, xpForLevel(8));
  assert.equal(masteryBudget(g.active), 16);
});
