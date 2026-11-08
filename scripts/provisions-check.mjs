import { expect } from "@playwright/test";
export async function verifyProvisions(page) {
  const saved = await page.evaluate(() =>
    structuredClone(window.__ddd.game.snapshot()),
  );
  try {
    await page.evaluate(() => {
      const g = window.__ddd.game;
      g.pause();
      g.mode = "exploration";
      g.enemies = [];
      g.selected = 0;
      g.map = {
        ...g.map,
        tiles: {},
        obstacles: {},
        rooms: [],
        chests: [],
        lights: [{ x: 6, z: 6, radius: 12 }],
        waterSources: [],
        start: { x: 2, z: 2 },
        exit: { x: 14, z: 14 },
      };
      for (let x = 0; x < 16; x++)
        for (let z = 0; z < 16; z++) g.map.tiles[`${x},${z}`] = { x, z };
      g.party.forEach((h, i) => {
        Object.assign(h, { x: i < 2 ? 2 : 1, z: i % 2 ? 3 : 2 });
        for (const item of h.preview.inventory.items) {
          if (item.catalogId === "item-water-flask")
            h.supplies[item.instanceId] = 6;
          if (item.catalogId === "item-food-bundle")
            h.supplies[item.instanceId] = 8;
        }
      });
      g.campaign.provisionTrail = { steps: 39, seconds: 0 };
      g.supplyDie = () => 1;
      g.emit("floor");
      g.emit("change");
      g.suspended = false;
      g.move({ x: 3, z: 2 });
      for (const id of g.paths.keys())
        if (id !== g.party[0].id) g.paths.delete(id);
      g.step();
      g.pause();
    });
    expect(
      await page.evaluate(
        () => window.__ddd.game.campaign.provisionTrail.steps,
      ),
    ).toBe(40);
    expect(
      await page.evaluate(() => {
        const g = window.__ddd.game,
          h = g.party[0];
        return g.supplyValue(
          h,
          h.preview.inventory.items.find(
            (i) => i.catalogId === "item-water-flask",
          ),
        );
      }),
    ).toBe(4);
    await page.locator('[data-action="camp"]').first().click();
    await expect(page.locator(".camp-stocks article").nth(1)).toContainText(
      "Next: 40 steps",
    );
    await expect(page.locator(".camp-stocks article").first()).toContainText(
      "Next: 40 steps",
    );
    await page.screenshot({ path: "test-results/provisions-countdown.png" });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.reload();
    await page.waitForFunction(() => window.__ddd);
    expect(
      await page.evaluate(
        () => window.__ddd.game.campaign.provisionTrail.steps,
      ),
    ).toBe(40);
    expect(
      await page.evaluate(
        () => window.__ddd.game.campaign.supplyNotices.length,
      ),
    ).toBe(0);
    console.log(
      "Actual dungeon movement triggers provision checks once; visible countdown and saved progress passed.",
    );
  } finally {
    if (await page.locator(".dungeon-camp").count())
      await page.keyboard.press("Escape");
    await page.evaluate((saved) => {
      const g = window.__ddd.game;
      delete g.supplyDie;
      g.load(saved, { resume: false });
      g.emit("floor");
      g.emit("change");
    }, saved);
  }
}
