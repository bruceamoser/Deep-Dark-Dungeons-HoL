import { chromium, expect } from "@playwright/test";
export async function verifyRoster(page) {
  const before = await page.evaluate(() => {
    const g = window.__ddd.game;
    g.party[0].survival.hp = 3;
    g.party[0].survival.gritAvailable = 0;
    return {
      first: g.party[0].heroId,
      second: g.party[1].heroId,
      living: g.livingRoster().length,
    };
  });
  await page.getByRole("button", { name: "The company register" }).click();
  await page.locator("#create-roster-hero").click();
  await page.locator('[data-preset="lira-ashbow"]').click();
  await page.locator("#hero-name").fill("Neris of the Lantern");
  await page.locator("#hero-name").blur();
  await page.locator('[data-step="7"]').click();
  await page.locator("#recruit").click();
  await expect(page.locator(".register-inspector")).toContainText(
    "Neris of the Lantern",
  );
  const recruitId = await page.evaluate(
    () =>
      window.__ddd.game.campaign.reserve.find(
        (h) => h.name === "Neris of the Lantern",
      ).heroId,
  );
  expect(await page.evaluate(() => window.__ddd.game.party[0].heroId)).toBe(
    before.first,
  );
  await page.locator("#assign-roster-hero").click();
  expect(await page.evaluate(() => window.__ddd.game.party[0].heroId)).toBe(
    recruitId,
  );
  await page.locator(`[data-roster-hero="${before.first}"]`).click();
  await page.locator("#assign-roster-hero").click();
  expect(
    await page.evaluate(() => ({
      hp: window.__ddd.game.party[0].survival.hp,
      grit: window.__ddd.game.party[0].survival.gritAvailable,
    })),
  ).toEqual({ hp: 3, grit: 0 });
  await page.keyboard.press("Escape");
  await page.evaluate(() =>
    window.__ddd.game.awardXP(
      "roster-check",
      400,
      "Recovered the lantern vault",
    ),
  );
  await page.locator('[data-hero="0"]').click();
  await page.locator('[data-tab="journey"]').click();
  await expect(page.locator(".experience-panel")).toContainText(
    "400 total XP",
  );
  await expect(page.locator(".experience-panel")).toContainText(
    "Training ready · Level 2",
  );
  await page.locator(".experience-panel summary").click();
  await expect(page.locator(".experience-panel")).toContainText(
    "5 XP per newly looted coin",
  );
  await page.screenshot({ path: "test-results/hero-experience.png" });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.reload();
  await page.waitForFunction(() => window.__ddd);
  expect(
    await page.evaluate(() => window.__ddd.game.livingRoster().length),
  ).toBe(before.living + 1);
  expect(await page.evaluate(() => window.__ddd.game.party[0].xp)).toBe(400);
  await page.getByRole("button", { name: "The company register" }).click();
  await page.locator(`[data-roster-hero="${recruitId}"]`).click();
  await page.locator('[data-roster-slot="1"]').click();
  await page.locator("#assign-roster-hero").click();
  await page.screenshot({ path: "test-results/character-repository.png" });
  await page.keyboard.press("Escape");
  // Exercise the pinned Last Words deadline; the Hall must wait for final death.
  await page.evaluate(() => {
    const { game: g, R } = window.__ddd,
      h = g.party[1];
    h.survival = R.enterLastWords(h.survival);
    g.emit("change");
  });
  expect(
    await page.evaluate(() => window.__ddd.game.campaign.fallenHeroes.length),
  ).toBe(0);
  await page.evaluate(() => {
    const { game: g, R } = window.__ddd,
      h = g.party[1];
    while (h.survival.status === "lastWords") {
      h.survival = R.startSurvivalTurn(h.survival, h.survival.ownTurn + 1);
      h.survival = R.endSurvivalTurn(h.survival, h.survival.ownTurn);
    }
    g.emit("change");
  });
  await page
    .getByRole("button", { name: "Hall of Fallen Heroes", exact: false })
    .click();
  await expect(page.locator(".register-inspector")).toContainText(
    "Neris of the Lantern",
  );
  await expect(page.locator("#assign-roster-hero")).toHaveCount(0);
  await page.screenshot({ path: "test-results/hall-of-fallen-heroes.png" });
  await page.locator('[data-register-tab="living"]').click();
  await expect(page.locator(`[data-roster-hero="${recruitId}"]`)).toHaveCount(
    0,
  );
  await page.locator('[data-roster-slot="1"]').click();
  await page.locator(`[data-roster-hero="${before.second}"]`).click();
  await page.locator("#assign-roster-hero").click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.reload();
  await page.waitForFunction(() => window.__ddd);
  expect(
    await page.evaluate(() => window.__ddd.game.campaign.fallenHeroes.length),
  ).toBe(1);
  expect(await page.evaluate(() => window.__ddd.game.party[1].heroId)).toBe(
    before.second,
  );
  console.log(
    "Persistent hero creation/reserves, reversible assignment without healing, automatic reload, XP progress/history and final-death Hall records passed.",
  );
}
if (process.argv[1]?.endsWith("roster-check.mjs")) {
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
    await page.waitForFunction(() => window.__ddd);
    await verifyRoster(page);
    expect(errors).toEqual([]);
  } catch (e) {
    await page.screenshot({ path: "test-results/roster-failure.png" });
    throw e;
  } finally {
    await browser.close();
  }
}
