import { chromium, expect } from "@playwright/test";

export async function verifyInteractions(page) {
  await page.evaluate(() => {
    const { game: g, scene: s } = window.__ddd;
    g.mode = "exploration";
    g.busy = false;
    g.encounter = null;
    g.pendingDefense = null;
    g.paths.clear();
    g.enemies = [];
    g.selected = 0;
    const { x, z } = g.map.start;
    g.party.forEach((h, i) => {
      Object.assign(h, { x: x - 2, z: z - 1 + i, selected: i === 0 });
      h.survival.status = "active";
      h.conditions = [];
    });
    g.setFormation(
      "square",
      g.party.map((h) => h.id),
    );
    g.map.chests = [
      { id: "interaction-test", x: x + 2, z: z - 1, coins: 31, opened: false },
    ];
    g.campaign.caches = [
      {
        x: x + 2,
        z: z + 1,
        depth: g.campaign.depth,
        coins: 19,
        expedition: 1,
        recovered: false,
      },
    ];
    window.interactionHaul = g.campaign.haul;
    s.syncInteractions(g.worldInteractions());
    s.resetEntities(g.party, g.enemies);
    s.updateVisibility(g.party, g.seen);
    s.angle = Math.PI / 4;
    s.zoom = 20;
    s.resize();
    s.focusOn({ x, z });
    g.emit("change");
  });
  await page.waitForTimeout(800);
  const point = async (id) =>
    page.evaluate((id) => {
      const s = window.__ddd.scene,
        obj = s.interactables.get(id).obj;
      const p = obj.position.clone();
      p.y += 0.4;
      p.project(s.camera);
      return {
        x: ((p.x + 1) * innerWidth) / 2,
        y: ((1 - p.y) * innerHeight) / 2,
      };
    }, id);
  const clickObject = async (id) => {
    const p = await point(id);
    await page.mouse.move(p.x, p.y);
    await expect(page.locator("#world-hint")).toBeVisible();
    expect(
      await page.evaluate(() => window.__ddd.scene.highlightedInteraction),
    ).toBe(id);
    await page.mouse.click(p.x, p.y);
    await expect(page.locator(".world-menu")).toBeVisible();
  };
  await clickObject("coffer:interaction-test");
  await expect(page.locator('[data-world-option="use"]')).toBeDisabled();
  await page.locator('[data-world-option="inspect"]').click();
  await expect(page.locator(".world-description")).toContainText("31 coins");
  await page.screenshot({ path: "test-results/world-interaction-menu.png" });
  await page.locator('[data-world-option="approach"]').click();
  await expect(page.locator('[data-world-option="use"]')).toBeEnabled({
    timeout: 10000,
  });
  expect(
    await page.evaluate(
      () => window.__ddd.game.campaign.haul - window.interactionHaul,
    ),
  ).toBe(0);
  await page.locator('[data-world-option="use"]').click();
  await expect(page.locator(".world-menu")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => window.__ddd.game.campaign.haul - window.interactionHaul,
    ),
  ).toBe(31);
  await clickObject("coffer:interaction-test");
  await expect(page.locator(".world-menu")).toContainText("Empty coffer");
  await expect(page.locator('[data-world-option="use"]')).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.locator(".world-menu")).toHaveCount(0);
  await clickObject("cache:0");
  if (await page.locator('[data-world-option="approach"]').count()) {
    await page.locator('[data-world-option="approach"]').click();
    await expect(page.locator('[data-world-option="use"]')).toBeEnabled({
      timeout: 10000,
    });
  }
  await page.locator('[data-world-option="use"]').click();
  expect(
    await page.evaluate(
      () => window.__ddd.game.campaign.haul - window.interactionHaul,
    ),
  ).toBe(50);
  expect(
    await page.evaluate(() => window.__ddd.scene.interactables.has("cache:0")),
  ).toBe(false);
  await clickObject("stairs:entrance");
  if (await page.locator('[data-world-option="approach"]').count()) {
    await page.locator('[data-world-option="approach"]').click();
    await expect(page.locator('[data-world-option="use"]')).toBeEnabled({
      timeout: 10000,
    });
  }
  await page.locator('[data-world-option="use"]').click();
  await expect(
    page.getByRole("button", { name: "Enter the depths" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Enter the depths" }).click();
  console.log(
    "Object hover highlight, Inspect/Approach/Collect/Leave menus, empty coffers, lost cache recovery and stairs travel passed.",
  );
}
if (process.argv[1]?.endsWith("interaction-check.mjs")) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto("http://127.0.0.1:5198");
    await page.waitForFunction(() => window.__ddd);
    await page.getByRole("button", { name: "Enter the depths" }).click();
    await verifyInteractions(page);
    expect(errors).toEqual([]);
  } catch (error) {
    await page.screenshot({ path: "test-results/interaction-failure.png" });
    console.error(
      await page.evaluate(() => ({
        hover: window.__ddd.scene.highlightedInteraction,
        toast: document.querySelector("#toast").textContent,
        menu: document.querySelector(".world-menu")?.textContent,
      })),
    );
    throw error;
  } finally {
    await browser.close();
  }
}
