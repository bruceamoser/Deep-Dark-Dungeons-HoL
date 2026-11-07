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
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5198");
  await page.waitForFunction(() => window.__ddd, null, { timeout: 45000 });
  await page.getByRole("button", { name: "Enter the depths" }).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: "test-results/lighting-dungeon.png" });
  const checks = await page.evaluate(async () => {
    const { game: g, scene: s } = window.__ddd;
    const { partyCanSee } = await import("/src/core/lighting.mjs");
    const observed = [];
    const actor = s.entities.get(g.party[0].id);
    actor.model.traverse((o) => {
      if (o.isMesh && o.material.isMeshStandardMaterial)
        observed.push(o.material);
    });
    const floorMaps = [];
    s.world.traverse((o) => {
      if (o.isMesh)
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          floorMaps.push(!!m.envMap);
    });
    const savedLights = g.map.lights;
    const savedTorches = g.party.map((h) => ({
      torch: structuredClone(h.torch),
      lantern: h.lantern,
    }));
    g.party.forEach((h) => {
      h.torch = { ...h.torch, lit: false };
      h.lantern = false;
    });
    g.map.lights = [];
    s.updateVisibility(g.party, g.seen);
    const unlitIntensity = observed[0].envMapIntensity;
    const expectedVisibility = [...s.entities.values()]
      .filter((e) => e.isEnemy)
      .every((e) => !e.group.visible || partyCanSee(g.map, g.party, e.data));
    const unknown = s.tiles.findIndex((p) => !g.seen[`${p.x},${p.z}`]);
    const unknownColor =
      unknown < 0
        ? null
        : s.floor.instanceColor.array.slice(unknown * 3, unknown * 3 + 3);
    g.map.lights = savedLights;
    g.party.forEach((h, i) => Object.assign(h, savedTorches[i]));
    s.updateVisibility(g.party, g.seen);
    return {
      actorMaps: observed.every((m) => m.envMap === s.actorEnvironment.texture),
      floorMaps: floorMaps.some(Boolean),
      unlitIntensity,
      expectedVisibility,
      unknownColor: unknownColor && Array.from(unknownColor),
    };
  });
  expect(checks.actorMaps).toBe(true);
  expect(checks.floorMaps).toBe(false);
  expect(checks.unlitIntensity).toBe(0.12);
  expect(checks.expectedVisibility).toBe(true);
  if (checks.unknownColor)
    expect(Math.max(...checks.unknownColor)).toBeLessThan(0.01);
  for (let i = 1; i <= 3; i++) {
    await page.evaluate(() => window.__ddd.scene.rotate(1));
    await page.waitForTimeout(700);
    await page.screenshot({ path: `test-results/lighting-rotation-${i}.png` });
  }
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ checks, errors }));
} finally {
  await browser.close();
}
