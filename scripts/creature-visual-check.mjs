import { CREATURE_ROSTER } from "../src/core/creature-roster.mjs";
import { CONDITION_VISUALS } from "../src/view/conditions.mjs";
import { expect, chromium } from "@playwright/test";
export async function verifyCreatureVisuals(page) {
  const ids = Object.keys(CREATURE_ROSTER);
  for (let offset = 0; offset < ids.length; offset += 8) {
    await page.evaluate(
      (ids) => {
        const { game: g, scene: s, C } = window.__ddd;
        g.mode = "exploration";
        g.busy = false;
        g.encounter = null;
        g.paths.clear();
        g.campaign.depth = 1;
        g.newFloor();
        const r = g.map.rooms[0];
        g.party.forEach((h, i) =>
          Object.assign(h, { x: r.x + 2 + i, z: r.z + r.h - 1 }),
        );
        g.enemies = ids.map((id, i) => {
          const c = C.creatures.creatures.find((c) => c.id === id);
          return {
            id: `gallery-${i}`,
            type: id,
            name: c.name,
            hp: c.hp.max,
            maxHp: c.hp.max,
            cv: c.cv,
            x: r.x + 1 + (i % 4) * 2,
            z: r.z + 1 + Math.floor(i / 4) * 3,
            conditions: [],
          };
        });
        g.emit("party");
        s.zoom = 16;
        s.angle = Math.PI / 4;
        s.resize();
        s.focusOn({ x: r.cx, z: r.cz });
        g.emit("change");
      },
      ids.slice(offset, offset + 8),
    );
    await page.waitForTimeout(200);
    expect(
      await page.evaluate(() =>
        [...window.__ddd.scene.entities.values()]
          .filter((e) => e.isEnemy)
          .every(
            (e) =>
              (e.model.children.length > 0 && e.clips.length > 0) ||
              e.model.userData.animate !== undefined,
          ),
      ),
    ).toBe(true);
    if ([0, 24, 32, 48].includes(offset))
      await page.screenshot({
        path: `test-results/book-creatures-${offset}.png`,
      });
  }
  // Exercise every status layer and its teardown; do not apply impossible combined rules to gameplay.
  await page.evaluate((keys) => {
    const { game: g } = window.__ddd,
      h = g.active;
    h.conditions = keys.map((key, i) => ({
      id: `vfx-${i}`,
      key,
      rating: 1,
      source: "vfx-test",
      persistence: [
        "prone",
        "hidden",
        "invisible",
        "unconscious",
        "petrified",
      ].includes(key)
        ? "binary"
        : key === "grappled"
          ? "maintained"
          : "temporary",
    }));
  }, CONDITION_VISUALS);
  await page.waitForFunction(
    (count) =>
      window.__ddd.scene.entities.get(window.__ddd.game.active.id).statusVisuals
        .active.size === count,
    CONDITION_VISUALS.length,
  );
  await page.evaluate(() => {
    window.__ddd.game.active.conditions = [];
  });
  await page.waitForFunction(
    () =>
      window.__ddd.scene.entities.get(window.__ddd.game.active.id).statusVisuals
        .active.size === 0,
  );
  console.log(
    "All 58 creature visual adapters and all 17 condition layers rendered and cleared.",
  );
}
if (import.meta.url === new URL(process.argv[1], "file:").href) {
  const b = await chromium.launch({ headless: true });
  try {
    const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto("http://127.0.0.1:5198");
    await p.waitForFunction(() => window.__ddd, null, { timeout: 45000 });
    await verifyCreatureVisuals(p);
    expect(errors).toEqual([]);
  } finally {
    await b.close();
  }
}
