import { expect } from "@playwright/test";
export async function enterGame(page) {
  const enter = page.locator("#enter-game");
  if (await enter.count()) {
    await expect(enter).toBeEnabled({ timeout: 90000 });
    await enter.click({ timeout: 90000 });
    await expect(page.locator("#entry-screen")).toHaveCount(0, {
      timeout: 90000,
    });
  }
}
export async function settingsAction(page, name) {
  await enterGame(page);
  const menu = page.locator("#settings-menu");
  // Older published versions still expose direct top-bar controls.
  if ((await menu.count()) && !(await menu.isVisible()))
    await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name, exact: true }).click();
}

export async function waitForGame(page) {
  await page.waitForFunction(
    () =>
      window.__ddd ||
      document.querySelector(".loading-screen h1")?.textContent ===
        "The gate could not open",
    null,
    { timeout: 90000 },
  );
  expect(
    await page.evaluate(() => !!window.__ddd),
    await page.locator("body").innerText(),
  ).toBe(true);
  await enterGame(page);
}
