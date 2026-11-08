import test from "node:test";
import assert from "node:assert/strict";
import {
  FORGE_NODES as nodes,
  nodePosition,
} from "../src/core/forge-catalog.mjs";
import { viewNodePosition, nodeRadius } from "../src/ui/forge-view-layout.mjs";
test("presentation spacing keeps every original node and dependency and separates node circles", () => {
  const before = structuredClone(nodes);
  const points = nodes.map((n) => ({ n, p: viewNodePosition(n) }));
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++) {
      const a = points[i],
        b = points[j],
        gap =
          Math.hypot(a.p.x - b.p.x, a.p.y - b.p.y) -
          nodeRadius(a.n) -
          nodeRadius(b.n);
      assert.ok(gap > 5, `${a.n.id}/${b.n.id}: ${gap}`);
    }
  assert.deepEqual(nodes, before);
  assert.notDeepEqual(viewNodePosition(nodes[0]), nodePosition(nodes[0]));
});
