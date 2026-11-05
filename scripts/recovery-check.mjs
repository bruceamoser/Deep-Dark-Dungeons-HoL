import { chromium, expect } from "@playwright/test";
export async function verifyRecovery(page) {
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
  expect(
    await page.evaluate(() => window.__ddd.game.party[0].survival.status),
  ).toBe("active");
  await page.locator('[data-companion="0"]').click();
  await page.locator('[data-tab="journey"]').click();
  await expect(page.locator(".wound")).toContainText("Recovery 0/5");
  await page.evaluate(() => {
    window.__ddd.game.dice = (n) => Array(n).fill(4);
  });
  await page.locator("[data-treat]").first().click();
  await expect(page.locator(".wound")).toContainText("Recovery 2/5");
  await expect(page.locator("[data-treat]").first()).toBeDisabled();
  await page.locator("#next-care-day").click();
  await page.locator("[data-treat]").first().click();
  await page.locator("#next-care-day").click();
  await page.locator("[data-treat]").first().click();
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
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Continue saved expedition" }).click();
  expect(
    await page.evaluate(
      () => window.__ddd.game.party[0].wounds[0].treatment.completed,
    ),
  ).toBe(true);
  console.log(
    "Desktop wound acknowledgement, ally potion, daily treatment, persistent scar and restored sight passed.",
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
    await page.waitForFunction(() => window.__ddd);
    await verifyRecovery(page);
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
}
