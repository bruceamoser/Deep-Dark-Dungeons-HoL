import { expect } from "@playwright/test";
export async function verifyWeaponRoll(page) {
  const saved = await page.evaluate(() =>
    structuredClone(window.__ddd.game.snapshot()),
  );
  try {
    await page.locator('[data-hero="0"]').click();
    await page.locator('[data-tab="appearance"]').click();
    for (const type of ["sword", "hammer", "axe"]) {
      await page
        .getByLabel("One-handed melee type", { exact: true })
        .selectOption(type);
      await expect(page.locator("#hero-preview")).toHaveAttribute(
        "data-preview-weapon",
        new RegExp(
          type === "sword" ? "Sword" : type === "hammer" ? "Hammer" : "Axe",
        ),
      );
      await page.screenshot({ path: `test-results/weapon-roll-${type}.png` });
    }
    await page.keyboard.press("Escape");
    console.log(
      "Sword, hammer and axe roll previews captured for visual review.",
    );
  } finally {
    await page.evaluate((saved) => {
      const { game: g } = window.__ddd;
      g.load(saved, { resume: false });
      g.emit("floor");
      g.emit("change");
    }, saved);
  }
}
