import { expect } from "@playwright/test";
export async function enterGame(page) {
  const enter = page.locator("#enter-game");
  if (await enter.count()) {
    await expect(enter).toBeEnabled({ timeout: 90000 });
    await enter.click();
    await expect(page.locator("#entry-screen")).toHaveCount(0);
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
