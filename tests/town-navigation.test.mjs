import test from "node:test";
import assert from "node:assert/strict";
import {
  TownNavigator,
  TOWN_NODES,
  TOWN_SERVICES,
} from "../src/core/town-navigation.mjs";

test("every service can be reached along streets and opens once on arrival", () => {
  const nav = new TownNavigator();
  for (const service of TOWN_SERVICES) {
    const path = nav.navigate(service.id);
    for (let i = 1; i < path.length; i++)
      assert.ok(
        path[i].x === path[i - 1].x || path[i].z === path[i - 1].z,
        "street routes cannot cut diagonally through buildings",
      );
    assert.equal(nav.advance(0), null);
    let arrived;
    for (let frame = 0; frame < 200 && !arrived; frame++)
      arrived = nav.advance(0.05);
    assert.equal(arrived?.id, service.id);
    assert.deepEqual(nav.position, TOWN_NODES[service.node]);
    assert.equal(nav.advance(1), null, "arrival must not re-open the service");
  }
});

test("cancel stops travel and redirection keeps the current party position", () => {
  const nav = new TownNavigator();
  nav.navigate("shop");
  nav.advance(0.2);
  const position = { ...nav.position };
  nav.navigate("infirmary");
  assert.deepEqual(nav.position, position);
  nav.cancel();
  nav.advance(5);
  assert.deepEqual(nav.position, position);
  assert.equal(nav.destination, null);
});

test("service hotkeys and destinations are unique and known", () => {
  assert.equal(
    new Set(TOWN_SERVICES.map((s) => s.hotkey)).size,
    TOWN_SERVICES.length,
  );
  for (const s of TOWN_SERVICES) assert.ok(TOWN_NODES[s.node]);
  assert.throws(() => new TownNavigator().navigate("unknown"));
});
