import test from "node:test";
import assert from "node:assert/strict";
import { fresh, R, C, data } from "./game-fixture.mjs";
import { Game } from "../src/core/game.mjs";
import { ordinaryItem } from "../src/core/treasure.mjs";
import { serialize, deserialize } from "../src/core/save.mjs";
function arena() {
  const g = fresh();
  g.mode = "exploration";
  g.enemies = [];
  g.map = {
    ...g.map,
    tiles: {},
    obstacles: {},
    chests: [],
    rooms: [],
    lights: [],
    start: { x: 3, z: 3 },
    exit: { x: 13, z: 13 },
  };
  for (let x = 0; x < 15; x++)
    for (let z = 0; z < 15; z++) g.map.tiles[`${x},${z}`] = { x, z };
  g.party.forEach((h, i) => Object.assign(h, { x: 3 + i, z: 3 }));
  g.supplyDie = () => 6;
  g.dice = (n = 3) => Array(n).fill(6);
  return g;
}
function add(g, h, id) {
  const item = ordinaryItem(C, id, `test-${crypto.randomUUID()}`);
  (h.treasure ??= []).push(item);
  g.refreshHero(h);
  return h.preview.inventory.items.find(
    (i) => i.instanceId === item.instanceId,
  );
}
function combat(g, hero = 3) {
  g.mode = "combat";
  g.selected = hero;
  g.map.lights = [{ x: 7, z: 7, radius: 12 }];
  g.enemies = [
    {
      id: "opponent",
      name: "Sentry",
      hp: 30,
      maxHp: 30,
      x: g.active.x,
      z: 4,
      conditions: [],
    },
  ];
  g.encounter = R.startEncounter(
    [
      ...g.party.map((h) => ({ id: h.id, side: "players" })),
      { id: "opponent", side: "opposition" },
    ],
    [6, 6, 6],
  );
  g.advance = () => {};
  g.busy = false;
  return g;
}
test("torch needs a hand, reveals nearby darkness, douses in light and preserves burn interval across saves", () => {
  const g = arena(),
    h = g.party[0];
  add(g, h, "item-lighting-bundle");
  assert.equal(g.canSee({ x: 3, z: 7 }), false);
  g.toggleTorch(0);
  assert.equal(h.torch.lit, true);
  assert.equal(g.freeHands(h), 1);
  assert.equal(g.canSee({ x: 3, z: 7 }), true);
  const supply = h.torch.supplyId;
  h.supplies[supply] = 6;
  g.supplyDie = () => 1;
  for (const i of h.preview.inventory.items.filter(
    (i) => i.catalogId === "item-lighting-bundle" && i.instanceId !== supply,
  ))
    h.supplies[i.instanceId] = 0;
  g.movementSupplies(24);
  assert.equal(h.supplies[supply], 6);
  g.map.lights = [{ x: 3, z: 3, radius: 3 }];
  g.syncTorches();
  assert.equal(h.torch.lit, false);
  g.advanceTime(3600);
  g.movementSupplies(30);
  assert.equal(h.torch.steps, 24);
  assert.equal(h.supplies[supply], 6);
  const copy = new Game(R, C);
  copy.load(deserialize(serialize(g.snapshot())), { resume: false });
  assert.equal(copy.party[0].torch.steps, 24);
  copy.map.lights = [];
  copy.syncTorches();
  copy.supplyDie = () => 1;
  copy.movementSupplies(1);
  assert.equal(copy.party[0].supplies[supply], 4);
  copy.movementSupplies(25);
  assert.equal(copy.party[0].supplies[supply], 0);
  assert.equal(copy.party[0].torch.lit, false);
  assert.match(copy.campaign.supplyNotices.at(-1).message, /exhausted/);
});
test("full hands block a torch and readying a bow stows it; free-hand potion checks include torches", () => {
  const g = arena(),
    h = g.party[0];
  g.mode = "town";
  add(g, h, "item-lighting-bundle");
  const sword = add(g, h, "item-ordinary-melee-weapon"),
    shield = add(g, h, "item-ordinary-shield"),
    bow = add(g, h, "item-ordinary-ranged-weapon");
  g.equip(0, sword.instanceId);
  g.equip(0, shield.instanceId);
  assert.throws(() => g.toggleTorch(0), /free hand/);
  g.equip(0, shield.instanceId, "stow");
  g.toggleTorch(0);
  assert.equal(g.freeHands(h), 0);
  h.survival.hp = 2;
  const potion = add(g, h, "item-lesser-healing-bottle");
  assert.throws(() => g.drinkPotion(0, potion.instanceId), /free hand/);
  g.equip(0, bow.instanceId);
  assert.equal(h.torch.held, false);
  assert.equal(h.torch.lit, false);
  assert.equal(g.freeHands(h), 0);
});
test("daily provisions roll once after movement; final use feeds, exhaustion persists and cannot repeat on load", () => {
  const g = arena(),
    h = g.party[0];
  const food = add(g, h, "item-food-bundle"),
    water = add(g, h, "item-water-flask");
  for (const i of h.preview.inventory.items.filter(
    (i) =>
      i.catalogId === "item-food-bundle" || i.catalogId === "item-water-flask",
  ))
    h.supplies[i.instanceId] = 0;
  h.supplies[food.instanceId] = 4;
  h.supplies[water.instanceId] = 4;
  g.supplyDie = () => 1;
  g.advanceTime(86400);
  assert.equal(g.needs(h).hungry, true);
  g.autoProvisions();
  assert.equal(g.needs(h).hungry, false);
  assert.equal(g.needs(h).thirsty, false);
  assert.equal(h.supplies[food.instanceId], 0);
  assert.equal(h.supplies[water.instanceId], 0);
  const notices = g.campaign.supplyNotices.length;
  g.autoProvisions();
  assert.equal(g.campaign.supplyNotices.length, notices);
  const copy = new Game(R, C);
  copy.load(deserialize(serialize(g.snapshot())), { resume: false });
  copy.autoProvisions();
  assert.equal(copy.campaign.supplyNotices.length, notices);
});
test("fatigue starts exactly at 16 hours and eight hours sleep restores alertness without Grit or wound recovery", () => {
  const g = arena(),
    h = g.party[0];
  g.mode = "town";
  h.survival.gritAvailable = 0;
  g.advanceTime(57599);
  assert.equal(g.needs(h).fatigue, 0);
  g.advanceTime(1);
  assert.equal(g.needs(h).fatigue, 1);
  for (let i = 0; i < 8; i++) g.sleepHour();
  assert.equal(g.needs(h).fatigue, 0);
  assert.equal(h.survival.gritAvailable, 0);
  assert.ok(g.clock().day >= 2);
});
test("downtime recipes require knowledge, compatible materials and tools, consume an hour and persist finished supplies", () => {
  const g = arena();
  g.mode = "town";
  const draft = structuredClone(
    data("party").find((p) => p.id === "oren-brass").draft,
  );
  draft.languages.home = "elven";
  g.party[0] = g.hero(draft, 0);
  const h = g.party[0];
  Object.assign(h, g.map.start);
  const option = g
    .craftingOptions(0)
    .find((o) => o.recipe.id === "recipe-bound-torches");
  assert.ok(option);
  assert.match(
    g.craftReason(0, option.recipe.id, option.ability.id),
    /Requires Torch/,
  );
  g.campaign.bank = 100;
  g.buyMaterials(0, option.recipe.id);
  assert.equal(g.campaign.bank, 88);
  g.supplyDie = () => 1;
  const material = h.preview.inventory.items.find(
    (i) => i.materialType === option.recipe.id,
  );
  const result = g.craft(0, option.recipe.id, option.ability.id);
  assert.equal(result.steps, 3);
  assert.equal(g.clock().seconds, 3600);
  assert.equal(h.supplies[material.instanceId], 4);
  const made = result.play.crafting[option.recipe.id].supplyId;
  assert.equal(h.supplies[made], 6);
  assert.ok(h.preview.inventory.items.some((i) => i.instanceId === made));
  const copy = new Game(R, C);
  copy.load(deserialize(serialize(g.snapshot())), { resume: false });
  assert.equal(copy.party[0].supplies[made], 6);
});
test("spell opportunity spends the action before the strike, interrupts Dying without resolving the spell", () => {
  const g = combat(arena()),
    h = g.active,
    e = g.enemies[0];
  h.survival.hp = 1;
  g.dice = (n = 3) => Array(n).fill(2);
  g.useAbility("ability-cinder-cast", e.id);
  assert.equal(e.reactionUsed, true);
  assert.equal(e.hp, 30);
  assert.equal(h.survival.status, "dying");
  assert.equal(g.budget.remaining.main, 0);
  assert.ok(g.woundNotices.length);
  g.acknowledgeWound({ x: 1, z: 0 });
  assert.equal(g.pendingProvocation, null);
});
test("Disengage prevents movement opportunities; forced movement never spends an enemy Reaction", () => {
  const g = combat(arena(), 0),
    h = g.active,
    e = g.enemies[0];
  g.useAbility("ability-disengage", h.id);
  const hp = h.survival.hp;
  g.move({ x: 3, z: 2 });
  g.step();
  assert.equal(h.z, 2);
  assert.equal(h.survival.hp, hp);
  assert.equal(e.reactionUsed, undefined);
  g.forceMove(h, { x: -1, z: 0 }, 1);
  assert.equal(e.reactionUsed, undefined);
});
test("player opportunity choices persist and spend only Reaction before an enemy continues", () => {
  const g = combat(arena(), 0),
    h = g.active,
    e = g.enemies[0];
  g.mode = "town";
  const sword = add(g, h, "item-ordinary-melee-weapon");
  g.equip(0, sword.instanceId);
  g.mode = "combat";
  // Start the opponent's turn with an explicitly declared retreat.
  g.encounter = R.startEncounter(
    [
      { id: h.id, side: "players" },
      { id: e.id, side: "opposition" },
    ],
    [1, 1, 1],
  );
  g.encounter = R.chooseParticipant(g.encounter, e.id);
  e.retained = ["main", "maneuver", "reaction"];
  assert.equal(
    g.provoke(
      e,
      {
        kind: "enemy",
        target: h.id,
        points: [{ x: 3, z: 6 }],
        label: "retreat",
      },
      [
        { x: 3, z: 5 },
        { x: 3, z: 6 },
      ],
    ),
    true,
  );
  assert.equal(e.z, 4);
  assert.equal(g.pendingProvocation.actor, e.id);
  const copy = new Game(R, C);
  copy.load(deserialize(serialize(g.snapshot())), { resume: false });
  copy.advance = () => {};
  copy.dice = (n = 3) => Array(n).fill(6);
  copy.resume();
  copy.resolveOpportunity(true);
  assert.equal(copy.budgets[h.id].remaining.reaction, 0);
  assert.equal(copy.budgets[h.id].remaining.main, 1);
  assert.equal(copy.enemies[0].hp, 26);
  assert.equal(copy.enemies[0].z, 6);
  assert.equal(copy.pendingProvocation, null);
});
