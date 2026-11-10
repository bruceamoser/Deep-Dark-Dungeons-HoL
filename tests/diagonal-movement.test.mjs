import test from "node:test";
import assert from "node:assert/strict";
import { arena } from "./forge-fixture.mjs";
import { neighbors, key } from "../src/core/dungeon.mjs";

test("one side opponent permits a one-point diagonal, including with only one movement left", () => {
  const g = arena(),
    to = { x: 6, z: 4 };
  Object.assign(g.enemies[0], { x: 5, z: 4 });
  g.beginHero();
  g.budgets[g.active.id] = g.R.spendMovement(g.budget, {
    operationId: "test",
    amount: g.movementLeft() - 1,
    conditions: g.restrictions(g.active),
  });
  assert.deepEqual(g.route(to), [to]);
  assert.ok(
    g.movementRange().some((p) => p.x === to.x && p.z === to.z && p.cost === 1),
  );
  g.move(to);
  assert.equal(g.movementLeft(), 0);
  g.suspended = false;
  g.step();
  assert.deepEqual([g.active.x, g.active.z], [6, 4]);
});

test("diagonals cannot pass solid wall/obstacle corners or two blocked side cells", () => {
  const g = arena(),
    origin = { x: 5, z: 5 },
    to = { x: 6, z: 4 };
  const reaches = (blocked) =>
    neighbors(g.map, origin, blocked).some((p) => p.x === to.x && p.z === to.z);
  assert.ok(reaches(new Set([key(6, 5)])));
  assert.ok(!reaches(new Set([key(6, 5), key(5, 4)])));
  assert.ok(!reaches(new Set([key(6, 4)])));
  g.map.obstacles[key(6, 5)] = {};
  assert.ok(!reaches(new Set()));
  delete g.map.obstacles[key(6, 5)];
  delete g.map.tiles[key(5, 4)];
  assert.ok(!reaches(new Set()));
});

test("difficult diagonal destinations retain their terrain cost", () => {
  const g = arena(),
    to = { x: 6, z: 4 };
  g.map.tiles[key(6, 4)].difficult = true;
  const left = g.movementLeft();
  g.move(to);
  assert.equal(g.movementLeft(), left - 2);
});
