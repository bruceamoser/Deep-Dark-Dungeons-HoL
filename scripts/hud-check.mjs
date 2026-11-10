import { chromium, expect } from "@playwright/test";
import { enterGame, settingsAction } from "./ui-session.mjs";
export async function verifyHud(page) {
  await expect(page.locator(".topbar > .top-tools > button")).toHaveCount(2);
  await expect(page.locator('.topbar [data-action="supplies"]')).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Settings", exact: true }),
  ).toHaveCount(1);
  await expect(page.locator(".header-center")).toContainText("Day");
  await expect(page.locator("#settings-menu")).toBeHidden();
  const names = [
    "Lantern Inn",
    "Market Square",
    "Guildhall",
    "Ember Smithy",
    "Wayfarer Lodge",
    "Healer’s House",
    "The Shrine",
    "The Depths",
  ];
  expect(
    await page
      .locator(".town-destination .destination-copy > span")
      .allTextContents(),
  ).toEqual(names);
  expect(
    await page
      .locator(".building-icon")
      .evaluateAll((es) => es.every((e) => e.complete && e.naturalWidth > 0)),
  ).toBe(true);
  expect(
    await page
      .locator(".party-portrait")
      .evaluateAll(
        (es) =>
          es.length === 4 && es.every((e) => e.complete && e.naturalWidth > 0),
      ),
  ).toBe(true);
  await page.keyboard.press("i");
  await page.waitForFunction(
    () =>
      window.__ddd.town.navigator.destination?.id === "roster" ||
      document.querySelector(".register-window"),
  );
  await page.keyboard.press("Escape");
  await page.keyboard.press("Shift+S");
  await page.waitForFunction(
    () => window.__ddd.town.navigator.destination?.id === "fallen",
  );
  await page.keyboard.press("Escape");
  await settingsAction(page, "Camp & supplies");
  await expect(page.locator("#settings-menu")).toBeHidden();
  await page.keyboard.press("Escape");
  await settingsAction(page, "Save");
  await expect(page.locator("#settings-menu")).toBeHidden();
  await page.screenshot({ path: "test-results/hud-greyhaven.png" });
  await page.evaluate(() => {
    const g = window.__ddd.game;
    window.hudBefore = structuredClone(g.snapshot());
    g.descend();
    g.enemies = [];
    g.encounter = null;
    g.mode = "exploration";
    g.pendingDefense = null;
    g.emit("party");
    g.emit("change");
  });
  await expect(page.locator(".minimap")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.locator(".minimap")).toBeHidden();
  await page.keyboard.press("j");
  await expect(page.locator(".eventlog")).toBeHidden();
  await page.evaluate(() => window.__ddd.game.emit("change"));
  await expect(page.locator(".minimap")).toBeHidden();
  await expect(page.locator(".eventlog")).toBeHidden();
  await page.keyboard.press("Tab");
  await page.keyboard.press("j");
  await expect(page.locator(".minimap")).toBeVisible();
  await expect(page.locator(".eventlog")).toBeVisible();
  await page.screenshot({ path: "test-results/hud-dungeon.png" });
  await page.evaluate(() => {
    const g = window.__ddd.game;
    g.campWanderers = () => [];
    g.party.forEach((h) => (h.survival.hp = 1));
    g.startCamp(
      Object.fromEntries(g.party.map((h) => [h.heroId, ["forage", "guard"]])),
    );
    g.forageProjection = "herbs";
    for (let i = 0; i < 7; i++) g.campHour();
    g.campaign.supplyNotices = [];
  });
  await page.locator('[data-action="camp"]').last().click();
  await page.locator("#camp-hour").click();
  await expect(
    page.getByRole("region", { name: "Camp results" }),
  ).toBeVisible();
  await expect(page.locator(".camp-results-log")).toContainText(
    "medicinal herbs",
  );
  await expect(page.locator(".camp-results-party")).toContainText("healed");

  while (await page.locator(".supply-alert button").count())
    await page.locator(".supply-alert button").click();
  await page.screenshot({ path: "test-results/camp-results.png" });
  await page.locator(".camp-close").click();
  await page.locator('[data-action="camp"]').last().click();
  await expect(
    page.getByRole("region", { name: "Camp results" }),
  ).toBeVisible();
  await page.locator("#camp-results-done").click();
  await expect(page.getByRole("region", { name: "Camp results" })).toHaveCount(
    0,
  );
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    const g = window.__ddd.game;
    delete g.campWanderers;
    delete g.forageProjection;
    g.load(window.hudBefore);
    delete window.hudBefore;
  });
  console.log(
    "Illustrated town directory and portraits, settings, centered clock, Tab/J toggles and persistent camp results passed.",
  );
}
if (process.argv[1]?.endsWith("hud-check.mjs")) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1000 },
    });
    page.setDefaultTimeout(20000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.DDD_TEST_URL ?? "http://127.0.0.1:5200");
    await expect(page.locator("#enter-game")).toBeEnabled({ timeout: 90000 });
    await page.waitForTimeout(700);
    await expect(page.locator("#entry-screen")).toBeVisible();
    await page.screenshot({ path: "test-results/entry-ready.png" });
    await page.keyboard.press("Space");
    await expect(page.locator("#entry-screen")).toHaveCount(0);
    await verifyHud(page);
    await page.reload();
    await expect(page.locator("#enter-game")).toBeEnabled({ timeout: 90000 });
    await page.keyboard.press("Enter");
    await expect(page.locator("#entry-screen")).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
}
