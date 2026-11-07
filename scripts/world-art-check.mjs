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
  const styles = [];
  for (let i = 0; i < 4; i++) {
    const result = await page.evaluate(async (i) => {
      const { game: g, scene: s } = window.__ddd;
      const { roomArt } = await import("/src/view/world-assets.mjs");
      g.map.seed = 1200 + i;
      s.build(g.map);
      s.syncInteractions(g.worldInteractions());
      s.updateVisibility(g.party, g.seen);
      s.focusOn(g.active);
      s.zoom = 21;
      s.resize();
      const props = s.props.filter(
        (p) =>
          p.obj.name &&
          [
            "cryptCoffin",
            "cryptShrine",
            "cryptBones",
            "archiveBookcase",
            "supplyCrates",
            "toolAnvil",
            "table",
            "candles",
            "barrel",
          ].includes(p.obj.name),
      );
      const bad = props
        .filter((p) => !g.map.obstacles[`${p.x},${p.z}`])
        .map((p) => p.obj.name);
      const { Box3, Vector3 } =
        await import("/node_modules/three/build/three.module.js");
      const oversize = props
        .filter((p) => {
          const size = new Box3().setFromObject(p.obj).getSize(new Vector3());
          return Math.max(size.x, size.z) > 1.901;
        })
        .map((p) => p.obj.name);
      return {
        style: roomArt(g.map, g.map.rooms[0]).name,
        bad,
        oversize,
        halfWalls: s.world.children.filter(
          (o) => o.name === "Authored cutaway wall",
        ).length,
      };
    }, i);
    expect(result.bad).toEqual([]);
    expect(result.oversize).toEqual([]);
    expect(result.halfWalls).toBeGreaterThan(0);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `test-results/dungeon-${result.style}.png` });
    styles.push(result.style);
  }
  expect(new Set(styles).size).toBe(4);
  expect(errors).toEqual([]);
  console.log(
    JSON.stringify({
      styles,
      errors,
      checks:
        "Authored cutaways, blocked-cell dressing, bounded footprints and repeated floor rebuilds passed.",
    }),
  );
} finally {
  await browser.close();
}
