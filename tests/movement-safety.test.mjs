import test from "node:test";
import assert from "node:assert/strict";
import { arena, R, C } from "./forge-fixture.mjs";
import { Game } from "../src/core/game.mjs";
import { routeHazards } from "../src/core/movement-safety.mjs";

function field(g, p, kind = "fire", id = kind) {
  g.map.zones.push({
    id,
    kind,
    cells: [p],
    source: "test",
    expires: null,
    hits: {},
  });
}

test("combat hazard confirmation is required before choosing a turn or spending movement", () => {
  const g = arena(),
    to = { x: 6, z: 4 },
    left = g.movementLeft();
  field(g, to);
  assert.equal(g.move(to), false);
  assert.ok(g.pendingMovement);
  assert.equal(g.paths.size, 0);
  assert.equal(g.encounter.current, null);
  assert.equal(g.movementLeft(), left);
  g.cancelMovement();
  assert.equal(g.pendingMovement, null);
  assert.equal(g.movementLeft(), left);
  g.move(to);
  assert.equal(g.confirmMovement(), true);
  assert.equal(g.movementLeft(), left - 1);
  g.suspended = false;
  const hp = g.active.survival.hp;
  g.step();
  assert.equal(g.active.x, to.x);
  assert.equal(g.active.z, to.z);
  assert.ok(g.active.survival.hp < hp);
});

test("the warning includes a follower's hazard even when the leader has a safe route", () => {
  const g = arena();
  g.mode = "exploration";
  g.enemies = [];
  const to = { x: 10, z: 5 },
    plan = g.movementPlan(to);
  const leader = plan.routes.get(g.campaign.order[0]);
  const follower = [...plan.routes]
    .slice(1)
    .find(([, r]) =>
      r.some((p) => !leader.some((q) => p.x === q.x && p.z === q.z)),
    );
  const p = follower[1].find(
    (p) => !leader.some((q) => p.x === q.x && p.z === q.z),
  );
  field(g, p);
  g.move(to);
  assert.ok(g.pendingMovement.hazards.some((h) => h.hero === follower[0]));
  assert.ok(
    !g.pendingMovement.hazards.some((h) => h.hero === g.campaign.order[0]),
  );
});

test("new hazards pause an approved route, and resuming does not pay movement twice", () => {
  const g = arena();
  g.suspended = false;
  g.move({ x: 8, z: 4 });
  const left = g.movementLeft(),
    origin = [g.active.x, g.active.z];
  field(g, g.paths.get(g.active.id)[0]);
  g.step();
  assert.ok(g.pendingMovement?.paid);
  assert.deepEqual([g.active.x, g.active.z], origin);
  g.confirmMovement();
  assert.equal(g.movementLeft(), left);
  g.step();
  assert.notDeepEqual([g.active.x, g.active.z], origin);
  assert.equal(g.pendingMovement, null);
});

test("consent covers only reviewed hazards and becomes invalid when the actor changes", () => {
  const g = arena(),
    to = { x: 6, z: 4 };
  field(g, to);
  g.move(to);
  field(g, to, "trap");
  assert.equal(g.confirmMovement(), false);
  assert.ok(g.pendingMovement.hazards.some((h) => h.kind === "trap"));
  g.selected = 1;
  assert.throws(() => g.confirmMovement(), /route changed/);
  assert.equal(g.paths.size, 0);
});

test("water, smoke, healing and difficult ground are not damaging fields; save reload rechecks fire", () => {
  const g = arena(),
    to = { x: 6, z: 4 };
  for (const kind of ["water", "smoke", "healing", "difficult"])
    field(g, to, kind);
  assert.deepEqual(
    routeHazards(g.map, g.party, new Map([[g.active.id, [to]]])),
    [],
  );
  field(g, to);
  g.move(to);
  g.confirmMovement();
  g.map.lights[0].radius = 12;
  const copy = new Game(R, C);
  copy.load(structuredClone(g.snapshot()), { resume: false });
  copy.suspended = false;
  copy.step();
  assert.ok(copy.pendingMovement);
  assert.equal(copy.active.x, 5);
});

test("click-to-open approach waits for hazard approval and cancellation discards the interaction", () => {
  const g = arena();
  g.mode = "exploration";
  g.enemies = [];
  g.seen = Object.fromEntries(Object.keys(g.map.tiles).map((k) => [k, true]));
  g.map.chests = [{ id: "test", x: 10, z: 5, coins: 1, opened: false }];
  g.map.zones = [
    {
      id: "wide",
      kind: "fire",
      cells: Object.values(g.map.tiles),
      source: "test",
      expires: null,
    },
  ];
  g.requestInteraction("coffer:test");
  assert.ok(g.pendingMovement);
  assert.equal(g.pendingInteraction, null);
  assert.deepEqual(g.pendingMovement.interaction, {
    id: "coffer:test",
    useOnArrival: true,
  });
  g.confirmMovement();
  assert.equal(g.pendingInteraction.id, "coffer:test");
  g.cancelMovement();
  assert.equal(g.pendingInteraction, null);
  assert.equal(g.map.chests[0].opened, false);
});

test("walking powers and voluntary swaps also require approval before their action cost", () => {
  for (const id of ["power-crosswind", "power-spirit-crossing"]) {
    const g = arena();
    g.provoke = () => false;
    g.active.preview.state.abilities.push(id);
    const target =
      id === "power-spirit-crossing" ? g.party[1].id : { x: 7, z: 4 };
    const point = { ...(typeof target === "string" ? g.party[1] : target) };
    field(g, { x: point.x, z: point.z });
    g.useAbility(id, target);
    assert.ok(g.pendingMovement?.power);
    assert.equal(g.encounter.current, null);
    g.cancelMovement();
    assert.equal(g.encounter.current, null);
    g.useAbility(id, target);
    assert.equal(g.confirmMovement(), true);
    assert.equal(g.budget.remaining.maneuver, 0);
    assert.deepEqual([g.active.x, g.active.z], [point.x, point.z]);
  }
});

test("leaps warn on landing, without incorrectly warning about ground crossed in the air", () => {
  const g = arena();
  g.provoke = () => false;
  g.active.preview.state.abilities.push("power-vault");
  const target = { x: 7, z: 4 };
  field(g, { x: 6, z: 4 });
  g.useAbility("power-vault", target);
  assert.equal(g.pendingMovement, null);
  assert.deepEqual([g.active.x, g.active.z], [7, 4]);
});


test("selecting ready heroes does not commit a turn or apply turn-start effects", () => {
  const g = arena();
  const before = g.party.map(h => ({ ownTurn: h.survival.ownTurn, hp: h.survival.hp, powerTurn: h.powerTurn }));
  g.select(1);
  assert.equal(g.selected, 1);
  assert.equal(g.encounter.current, null);
  g.select(2);
  assert.equal(g.selected, 2);
  assert.equal(g.encounter.current, null);
  assert.deepEqual(g.party.map(h => ({ ownTurn: h.survival.ownTurn, hp: h.survival.hp, powerTurn: h.powerTurn })), before);
  g.select(0);
  g.spend("main", "test-commit");
  assert.equal(g.encounter.current, g.party[0].id);
  assert.throws(() => g.select(1), /Finish the current/);
});


test("hover preview matches movement route and reports actionable opportunity risks without spending", () => {
 const g=arena();g.enemies[0].reactionUsed=false;
 const before=g.movementLeft(),to={x:6,z:4};field(g,to);
 const preview=g.movementPreview(to);
 assert.deepEqual(preview.routes.get(g.active.id),g.movementPlan(to).routes.get(g.active.id));
 assert.ok(preview.hazards.some(h=>h.kind==="fire"));
 assert.ok(preview.opportunities.some(h=>h.enemy===g.enemies[0].id));
 assert.equal(g.encounter.current,null);assert.equal(g.movementLeft(),before);assert.equal(g.paths.size,0);
 g.enemies[0].reactionUsed=true;assert.equal(g.movementPreview(to).opportunities.length,0);
});
