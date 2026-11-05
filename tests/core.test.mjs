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
