import { settingsAction, waitForGame } from "./ui-session.mjs";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";
export async function verifyExpeditionUI(page) {
  const saved = await page.evaluate(() => window.__ddd.game.snapshot());
  await page.evaluate(() => {
    const g = window.__ddd.game;
    g.mode = "town";
    g.pendingDefense = null;
    g.pendingProvocation = null;
    g.woundNotices = [];
    g.busy = false;
    g.party[2].draft.traitIds = [
      "trait-halfling-good-cheer",
      "trait-halfling-stout-heart",
    ];
    g.refreshHero(g.party[2]);
    g.emit("change");
  });
  await page.locator('[data-hero="2"]').click();
  await page.locator('[data-tab="abilities"]').click();
  await expect(page.locator(".ancestry-gifts")).toContainText("three Boons");
  await page
    .locator('[data-prepare-trait="trait-halfling-good-cheer"]')
    .click();
  await expect(
    page.locator('[data-prepare-trait="trait-halfling-good-cheer"]'),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: "test-results/native-ancestry-gifts.png" });
  await page.locator('[data-tab="journey"]').click();
  const retrain = page.locator("[data-retrain-open]").first();
  if (await retrain.count()) {
    await retrain.click();
    await expect(
      page.locator("[data-retrain-options] select").first(),
    ).toBeVisible();
  }
  await page.keyboard.press("Escape");
  await settingsAction(page, "Camp & supplies");
  await expect(
    page.getByRole("dialog", { name: "Camp and supplies" }),
  ).toBeVisible();
  await page.locator('[data-water="0"]').click();
  await page.screenshot({ path: "test-results/native-camp.png" });
  await page.keyboard.press("Escape");
  await page.evaluate(async () => {
    const { game: g } = window.__ddd;
    const d = structuredClone(g.party[3].draft);
    d.name = "Craft trial";
    g.party[0] = g.hero(d, 0);
    Object.assign(g.party[0], g.map.start);
    g.campaign.bank = 200;
    g.selected = 0;
    g.supplyDie = () => 6;
    g.dice = (n = 3) => Array(n).fill(6);
    g.emit("party");
    g.emit("change");
  });
  await page.locator('[data-action="workshop"]').click();
  await page.locator("#supplies-recipes").click();
  await expect(page.getByRole("dialog", { name: "Recipe book" })).toBeVisible();
  await page.locator('[data-filter="all"]').click();
  await page.locator('[data-recipe="recipe-twisted-cord"]').first().click();
  await page.locator("#learn-recipe").click();
  await page.locator("#recipe-materials").click();
  await page.locator("#craft-recipe").click();
  expect(await page.evaluate(() => window.__ddd.game.clock().seconds)).toBe(
    saved.clockSeconds +
      (await page.evaluate(
        () =>
          window.__ddd.game.recipeTime(window.__ddd.game.active, {
            minutes: 45,
          }) * 60,
      )),
  );
  while (await page.locator(".supply-alert button").count())
    await page.locator(".supply-alert button").click();
  await page.screenshot({ path: "test-results/native-crafting.png" });
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    const { game: g, scene: s } = window.__ddd;
    g.mode = "exploration";
    g.map.lights = [];
    g.enemies = [];
    g.pause();
    g.selected = 0;
    const h = g.party[0];
    g.toggleTorch(0);
    g.syncTorches();
    s.resetEntities(g.party, g.enemies);
    s.focusOn(h);
    g.emit("change");
  });
  expect(
    await page.evaluate(() => {
      const { game: g, scene: s } = window.__ddd;
      return (
        !!g.party[0].torch.lit &&
        !!s.entities.get("hero-0").model.getObjectByName("Readied torch")
      );
    }),
  ).toBe(true);
  await page.screenshot({ path: "test-results/native-held-torch.png" });
  await page.evaluate(() => {
    const { game: g, scene: s } = window.__ddd,
      h = g.party[0];
    g.map.lights = [{ x: h.x, z: h.z, radius: 8 }];
    g.enemies = [
      {
        id: "hover-test",
        type: "creature-skeleton",
        name: "Skeleton sentinel",
        x: h.x + 2,
        z: h.z + 1,
        hp: 8,
        maxHp: 8,
        conditions: [],
      },
    ];
    s.resetEntities(g.party, g.enemies);
    s.focusOn(h);
    s.updateVisibility(g.party, g.seen);
    g.emit("change");
  });
  await page.waitForTimeout(400);
  const p = await page.evaluate(() => {
    const s = window.__ddd.scene,
      e = s.entities.get("hover-test"),
      p = e.group.position.clone();
    p.y += 1;
    p.project(s.camera);
    return {
      x: ((p.x + 1) * innerWidth) / 2,
      y: ((1 - p.y) * innerHeight) / 2,
    };
  });
  await page.mouse.move(p.x, p.y);
  await expect(page.locator("#world-hint")).toContainText("Skeleton");
  await page.screenshot({ path: "test-results/native-enemy-hover.png" });
  await page.evaluate(() => {
    const { game: g, scene: s } = window.__ddd,
      h = g.active;
    g.mode = "exploration";
    g.map.lights = [];
    g.party.forEach((p) => {
      p.torch.lit = false;
      p.torch.held = false;
      p.lantern = false;
    });
    g.seen = {};
    g.map.surveyed = {};
    g.map.knownInteractions = {};
    g.map.chests = [
      { id: "survey-coffer", x: h.x + 3, z: h.z, coins: 12, opened: false },
    ];
    s.syncInteractions(g.worldInteractions());
    s.updateVisibility(g.party, g.seen);
  });
  expect(
    await page.evaluate(
      () =>
        window.__ddd.scene.interactables.get("coffer:survey-coffer").obj
          .visible,
    ),
  ).toBe(false);
  await page.evaluate(() => {
    const g = window.__ddd.game;
    g.active.preview.state.abilities.push("power-read-the-depths");
    g.useAbility("power-read-the-depths");
  });
  expect(
    await page.evaluate(
      () =>
        window.__ddd.scene.interactables.get("coffer:survey-coffer").obj
          .visible,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => window.__ddd.scene.entities.get("hover-test").group.visible,
    ),
  ).toBe(false);
  await page.evaluate((saved) => {
    const g = window.__ddd.game;
    delete g.dice;
    delete g.supplyDie;
    g.load(saved, { resume: false });
    g.emit("floor");
    g.emit("change");
  }, saved);
  console.log(
    "Expedition UI: ancestry preparation, well, materials/crafting, held torch, enemy hover and surveyed coffers without creature revelation passed.",
  );
}
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1000 },
    });
    const errors = [];
    page.on(
      "pageerror",
      (e) => (errors.push(e.message), console.error("PAGE ERROR", e.message)),
    );
    await page.goto("http://127.0.0.1:5198");
    await waitForGame(page);
    await verifyExpeditionUI(page);
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
}
