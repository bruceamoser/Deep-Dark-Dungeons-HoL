import { settingsAction, waitForGame } from "./ui-session.mjs";
import { chromium, expect } from "@playwright/test";
export async function verifyRecovery(page) {
  const notices = async () => {
    await page.waitForTimeout(100);
    while (await page.locator(".supply-alert button").count())
      await page.locator(".supply-alert button").click();
  };
  await page.evaluate(() => {
    const g = window.__ddd.game;
    g.mode = "town";
    g.encounter = null;
    g.pendingDefense = null;
    g.busy = false;
    g.selected = 0;
    g.paths.clear();
    g.dice = (n) => [3, 6, 6, ...Array(n).fill(1)].slice(0, n);
    g.party[0].survival.hp = 1;
    g.suffer(g.party[0], 3, "physical", "test-sentry");
  });
  await expect(page.locator(".dialog")).toContainText("A lasting wound");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator('[data-hero="1"]').click();
  // The giver must have a free hand; use real inventory controls to free it.
  const held = await page.evaluate(() =>
    window.__ddd.game.party[1].preview.inventory.items
      .filter((i) => i.held)
      .map((i) => i.instanceId),
  );
  for (const id of held) {
    await page.locator(`[data-item=${JSON.stringify(id)}]`).click();
    await page.locator('[data-gear="stow"]').click();
  }
  await page
    .getByRole("button", { name: "Lesser Healing Bottle", exact: true })
    .click();
  await page.locator("#potion-recipient").selectOption("hero-0");
  await page.getByRole("button", { name: "Use potion", exact: true }).click();
  await notices();
  expect(
    await page.evaluate(() => window.__ddd.game.party[0].survival.status),
  ).toBe("active");
  await page.locator('[data-companion="0"]').click();
  await page.locator('[data-tab="journey"]').click();
  await expect(page.locator(".wound")).toContainText("Treatable wound");
  const beforeCare = await page.evaluate(() => {
    const g = window.__ddd.game;
    g.campaign.bank = 100;
    g.emit("change");
    return {
      hp: g.party[0].survival.hp,
      grit: g.party[0].survival.gritAvailable,
    };
  });
  await page.locator('[data-tab="journey"]').click();
  await page.locator('[data-care][data-method="town"]').first().click();
  await notices();
  await expect(page.locator(".wound")).toContainText("Recovered");
  expect(
    await page.evaluate(() => ({
      hp: window.__ddd.game.party[0].survival.hp,
      grit: window.__ddd.game.party[0].survival.gritAvailable,
    })),
  ).toEqual(beforeCare);
  expect(
    await page.evaluate(() =>
      window.__ddd.game.party[0].conditions.some((c) => c.key === "blinded"),
    ),
  ).toBe(false);
  expect(
    await page.evaluate(() => window.__ddd.game.party[0].survival.wounds),
  ).toBe(1);
  await page.screenshot({ path: "test-results/treated-wound.png" });
  await page.keyboard.press("Escape");
  await settingsAction(page, "Save");
  await expect(page.locator("#toast")).toContainText("saved");
  await page.reload();
  await waitForGame(page);
  expect(
    await page.evaluate(
      () => window.__ddd.game.party[0].wounds[0].treatment.completed,
    ),
  ).toBe(true);
  console.log(
    "Desktop wound acknowledgement, ally potion, predictable infirmary treatment, persistent scar and restored sight passed.",
  );
}
if (process.argv[1]?.endsWith("recovery-check.mjs")) {
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
    await waitForGame(page);
    await verifyRecovery(page);
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
}
