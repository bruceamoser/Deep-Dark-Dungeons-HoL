import test from "node:test";
import assert from "node:assert/strict";
import { fresh } from "./forge-fixture.mjs";
function fixture() {
  const g = fresh();
  g.mode = "exploration";
  g.enemies = [];
  g.suspended = false;
  const { x, z } = g.map.start;
  g.party.forEach((h, i) => Object.assign(h, { x: x - 2, z: z - 1 + i }));
  g.map.chests = [
    { id: "click", x: x + 2, z: z - 1, coins: 31, opened: false },
  ];
  return g;
}
test("direct chest request walks, opens exactly once and opens its item distribution", () => {
  const g = fixture(),
    before = g.campaign.haul,
    events = [];
  g.listeners.push((t, d) => events.push([t, d]));
  g.map.chests[0].items = [{ instanceId: "test-loot" }];
  g.requestInteraction("coffer:click");
  assert.equal(g.map.chests[0].opened, false);
  for (let i = 0; i < 40; i++) g.step();
  assert.equal(g.map.chests[0].opened, true);
  assert.equal(g.campaign.haul, before + 31);
  assert.ok(events.some(([t, d]) => t === "interact-ready" && d.loot));
  g.requestInteraction("coffer:click");
  assert.equal(g.campaign.haul, before + 31);
});
test("stairs request gathers and requests confirmation without changing depth", () => {
  const g = fixture(),
    events = [],
    depth = g.campaign.depth;
  g.listeners.push((t, d) => {
    if (t === "interact-ready") events.push(d.id);
  });
  g.requestInteraction("stairs:entrance");
  for (let i = 0; i < 40; i++) g.step();
  assert.deepEqual(events, ["stairs:entrance"]);
  assert.equal(g.mode, "exploration");
  assert.equal(g.campaign.depth, depth);
});
test("redirect and combat discard automatic interaction, guardian is checked at arrival", () => {
  for (const cancel of ["move", "combat", "guardian"]) {
    const g = fixture();
    g.requestInteraction("coffer:click");
    if (cancel === "move") g.move(g.map.start);
    else if (cancel === "combat") {
      g.advance = () => {};
      const h = g.active;
      g.enemies = [
        {
          id: "sentry",
          group: 999,
          hp: 30,
          x: h.x + 1,
          z: h.z,
          conditions: [],
        },
      ];
      g.detect(g.enemies);
    } else {
      g.map.chests[0].guardBossId = "guard";
      g.enemies = [{ id: "guard", hp: 30, x: 100, z: 100 }];
    }
    for (let i = 0; i < 40; i++) g.step();
    assert.equal(g.map.chests[0].opened, false, cancel);
    assert.equal(g.pendingInteraction, null, cancel);
  }
});
