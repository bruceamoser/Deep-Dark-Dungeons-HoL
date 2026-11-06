import { chromium, expect } from "@playwright/test";
export async function verifyGameplayIdentity(page) {
  const saved = await page.evaluate(() =>
    structuredClone(window.__ddd.game.snapshot()),
  );
  try {
    await page.locator('[data-hero="0"]').click();
    await page.locator('[data-tab="appearance"]').click();
    await page.getByLabel("Sex", { exact: true }).selectOption("female");
    await page.getByLabel("Hairstyle", { exact: true }).selectOption("braid");
    await page.getByLabel("Facial hair", { exact: true }).selectOption("none");
    const appearance = JSON.parse(
      await page.locator("#hero-preview").getAttribute("data-appearance"),
    );
    expect(appearance).toMatchObject({
      sex: "female",
      hair: "braid",
      beard: "none",
      ancestry: "ancestry-dwarf",
    });
    const model = await page.evaluate(
      () => window.__ddd.scene.entities.get("hero-0").model.userData.appearance,
    );
    expect(model).toEqual(appearance);
    await page.screenshot({ path: "test-results/identity-sheet.png" });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.locator("#toast")).toContainText("saved");
    await page.reload();
    await page.waitForFunction(() => window.__ddd, null, { timeout: 45000 });
    expect(
      await page.evaluate(() => window.__ddd.game.active.draft.appearance.sex),
    ).toBe("female");
    await page.evaluate(() => {
      const { game: g, scene: s } = window.__ddd;
      g.pause();
      g.paths.clear();
      g.pendingDefense = null;
      g.pendingProvocation = null;
      g.woundNotices = [];
      g.busy = false;
      g.selected = 0;
      const { x, z } = g.map.start;
      g.party.forEach((h, i) => {
        Object.assign(h, { x: x + (i % 2), z: z + Math.floor(i / 2) });
        h.conditions = [];
        h.survival.hp = h.survival.maxHp;
        h.survival.status = "active";
      });
      g.enemies = [
        {
          id: "power-sentry",
          name: "Bone sentry",
          x: x + 3,
          z,
          hp: 50,
          maxHp: 50,
          conditions: [],
          group: 999,
        },
      ];
      g.active.preview.state.abilities.push(
        "power-firebreak",
        "power-dousing-rain",
      );
      g.active.favorites = ["power-firebreak", "power-dousing-rain"];
      g.active.powerUses = {};
      g.active.powerEffects = [];
      g.mode = "combat";
      g.encounter = g.R.startEncounter(
        [
          ...g.party.map((h) => ({ id: h.id, side: "players" })),
          { id: "power-sentry", side: "opposition" },
        ],
        [6, 6, 6],
      );
      g.beginHero();
      g.dice = (n = 3) => Array(n).fill(6);
      s.resetEntities(g.party, g.enemies);
      s.zoom = 20;
      s.resize();
      s.focusOn({ x: x + 1, z });
      g.emit("change");
    });
    await page.waitForTimeout(600);
    const range = await page.evaluate(() => {
      const { game: g, scene: s } = window.__ddd;
      return {
        count: s.movementCells.size,
        lines:
          s.tacticalGroup.getObjectByName("True movement grid").geometry
            .attributes.position.count,
        max: Math.max(...[...s.movementCells.values()].map((p) => p.cost)),
        budget: g.movementLeft(),
        ally: s.movementCells.get(`${g.party[1].x},${g.party[1].z}`).canEnd,
      };
    });
    expect(range.count).toBeGreaterThan(8);
    expect(range.lines).toBeGreaterThan(40);
    expect(range.max).toBeLessThanOrEqual(range.budget);
    expect(range.ally).toBe(false);
    await page.screenshot({ path: "test-results/tactical-movement.png" });
    const point = await page.evaluate(() => {
      const { scene: s, game: g } = window.__ddd,
        e = g.enemies[0];
      const v = s.camera.position
        .clone()
        .set(e.x * 2.4, 0, e.z * 2.4)
        .project(s.camera);
      return {
        x: ((v.x + 1) * innerWidth) / 2,
        y: ((1 - v.y) * innerHeight) / 2,
      };
    });
    await page.locator('[data-hot-action="power-firebreak"]').click();
    await page.mouse.move(point.x, point.y);
    await page.waitForFunction(
      () => window.__ddd.scene.targetGroup?.children.length === 9,
    );
    await page.screenshot({ path: "test-results/power-area-preview.png" });
    await page.keyboard.press("Escape");
    expect(
      await page.evaluate(
        () => window.__ddd.game.active.powerUses["power-firebreak"] ?? 0,
      ),
    ).toBe(0);
    expect(
      await page.evaluate(() => window.__ddd.scene.targetGroup.children.length),
    ).toBe(0);
    await page.locator('[data-hot-action="power-firebreak"]').click();
    await page.mouse.click(point.x, point.y);
    await page.waitForFunction(() =>
      window.__ddd.game.map.zones?.some((z) => z.kind === "fire"),
    );
    expect(await page.evaluate(() => window.__ddd.game.enemies[0].hp)).toBe(48);
    expect(
      await page.evaluate(
        () => window.__ddd.game.active.powerUses["power-firebreak"],
      ),
    ).toBe(1);
    await page.screenshot({ path: "test-results/battlefield-fire.png" });
    await page.evaluate(() => {
      window.__ddd.game.budget.remaining.main = 1;
      window.__ddd.game.emit("change");
    });
    await page.locator('[data-hot-action="power-dousing-rain"]').click();
    await page.mouse.click(point.x, point.y);
    await page.waitForFunction(() =>
      window.__ddd.game.map.zones.some((z) => z.kind === "water"),
    );
    expect(
      await page.evaluate(() =>
        window.__ddd.game.map.zones.some((z) => z.kind === "fire"),
      ),
    ).toBe(false);
    expect(
      await page.evaluate(() =>
        window.__ddd.game.enemies[0].conditions.some(
          (c) => c.key === "burning",
        ),
      ),
    ).toBe(false);
    console.log(
      "Appearance controls and persistence, exact tactical squares, weighted range, area preview/cancellation, fire and dousing passed.",
    );
  } finally {
    await page.evaluate((saved) => {
      const { game: g, scene: s } = window.__ddd;
      g.load(saved, { resume: false });
      s.focusOn(g.active);
      g.resume();
      g.emit("change");
    }, saved);
    await page.getByRole("button", { name: "Save", exact: true }).click();
  }
}
if (process.argv[1]?.endsWith("identity-preview-check.mjs")) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage({
      viewport: { width: 1600, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto("http://127.0.0.1:5198");
    await page.waitForFunction(() => window.__ddd, null, { timeout: 45000 });
    await verifyGameplayIdentity(page);
    expect(errors).toEqual([]);
  } catch (e) {
    await page.screenshot({ path: "test-results/identity-failure.png" });
    console.error(await page.locator("#toast").textContent());
    throw e;
  } finally {
    await browser.close();
  }
}
