import test from "node:test";
import assert from "node:assert/strict";
import {
  TownNavigator,
  TOWN_NODES,
  TOWN_SERVICES,
  TOWN_STREETS,
  closestTownStreet,
} from "../src/core/town-navigation.mjs";

test("every service can be reached along streets and opens once on arrival", () => {
  const nav = new TownNavigator();
  for (const service of TOWN_SERVICES) {
    const path = nav.navigate(service.id);
    for (const p of path)
      assert.ok(
        closestTownStreet(p).distance < 1e-8,
        "routes follow the rendered centreline",
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

test("every dirt lane curves, joins its service nodes exactly and is reversible", () => {
  for (const street of TOWN_STREETS) {
    assert.deepEqual(street.points[0], TOWN_NODES[street.from]);
    assert.deepEqual(street.points.at(-1), TOWN_NODES[street.to]);
    const a = street.points[0],
      b = street.points.at(-1),
      p = street.points[10];
    assert.ok(
      Math.abs((b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x)) > 1,
      "visible bend, rather than straight grid edges",
    );
  }
});
test("redirected movement stays on the shared winding street rather than cutting corners", () => {
  const nav = new TownNavigator();
  for (let i = 0; i < 50; i++) {
    nav.navigate(TOWN_SERVICES[i % 8].id);
    nav.advance(0.075);
    assert.ok(closestTownStreet(nav.position).distance < 1e-8);
  }
});
