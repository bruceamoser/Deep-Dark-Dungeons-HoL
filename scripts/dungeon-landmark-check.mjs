import { chromium, expect } from "@playwright/test";
import fs from "node:fs/promises";
await fs.mkdir("test-results", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({
      viewport: { width: 1600, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5198");
  await page.waitForFunction(() => window.__ddd, null, { timeout: 45000 });
  await page.keyboard.press("d");
  await page.waitForFunction(
    () => window.__ddd.game.mode === "exploration",
    null,
    { timeout: 15000 },
  );
  const result = await page.evaluate(async () => {
    const { game: g, scene: s } = window.__ddd;
    g.pause();
    g.paths.clear();
    g.enemies = [];
    const { x, z } = g.map.start;
    g.map.exit = { x: x + 2, z: z - 2 };
    g.map.chests = [
      {
        id: "art-closed",
        x: x - 2,
        z: z + 1,
        coins: 10,
        items: [],
        opened: false,
      },
      { id: "art-open", x: x - 2, z: z - 1, coins: 0, items: [], opened: true },
      {
        id: "art-gold",
        x: x + 3,
        z: z + 1,
        coins: 30,
        items: [],
        opened: false,
        guardBossId: "art-guardian",
      },
    ];
    s.build(g.map);
    s.syncInteractions(g.worldInteractions());
    s.resetEntities(g.party, g.enemies);
    s.updateVisibility(g.party, g.seen);
    s.focusOn(g.active);
    s.zoom = 21;
    s.resize();
    const { Box3, Vector3 } =
      await import("/node_modules/three/build/three.module.js");
    const inspect = (id) => {
      const e = s.interactables.get(id),
        size = new Box3().setFromObject(e.obj).getSize(new Vector3());
      return {
        name: e.obj.name,
        interaction: e.obj.userData.interactionId,
        lids: e.lids.map((l) => ({ name: l.name, angle: l.rotation.x })),
        footprint: Math.max(size.x, size.z),
      };
    };
    return {
      closed: inspect("coffer:art-closed"),
      open: inspect("coffer:art-open"),
      gold: inspect("coffer:art-gold"),
      entrance: inspect("stairs:entrance"),
      descent: inspect("stairs:descent"),
    };
  });
  expect(result.closed.name).toBe("chest");
  expect(result.gold.name).toBe("chestGold");
  expect(result.closed.lids[0].name).toBe("chest_large_lid");
  expect(result.closed.lids[0].angle).toBe(0);
  expect(result.open.lids[0].angle).toBeCloseTo(-1.05);
  for (const r of Object.values(result)) expect(r.footprint).toBeLessThan(2.4);
  expect(result.entrance.name).toBe("stairs");
  expect(result.descent.name).toBe("stairs");
  await page.waitForTimeout(700);
  await page.screenshot({ path: "test-results/kaykit-dungeon-landmarks.png" });
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ result, errors }));
} finally {
  await browser.close();
}
