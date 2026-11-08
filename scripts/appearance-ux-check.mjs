import { expect } from "@playwright/test";
export async function verifyAppearanceUX(page) {
  const saved = await page.evaluate(() =>
    structuredClone(window.__ddd.game.snapshot()),
  );
  try {
    await page.locator('[data-hero="0"]').click();
    await page.locator('[data-tab="appearance"]').click();
    await expect(
      page.getByLabel("Equipped bow style", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByLabel("Ears", { exact: true }).locator("option"),
    ).toHaveCount(2);
    expect(await page.locator(".appearance-editor").innerText()).not.toContain(
      "Palette 1",
    );
    await page.keyboard.press("Escape");
    const flags = await page.evaluate(() => {
      const { game: g } = window.__ddd,
        h = g.party[0];
      (h.treasure ??= []).push(
        {
          kind: "ordinary",
          instanceId: "ux-bow",
          catalogId: "item-ordinary-ranged-weapon",
          hands: 2,
          carried: true,
          held: false,
        },
        {
          kind: "ordinary",
          instanceId: "ux-pack",
          catalogId: "item-travel-pack",
          carried: true,
          worn: false,
        },
      );
      g.refreshHero(h);
      g.emit("party");
      g.emit("change");
      return h.preview.inventory.items.map((i) => ({
        id: i.instanceId,
        held: i.held,
        worn: i.worn,
      }));
    });
    await page.locator('[data-hero="0"]').click();
    await page.locator('[data-tab="appearance"]').click();
    await page
      .getByLabel("Equipped bow style", { exact: true })
      .selectOption("Bow05");
    await expect(page.locator("#hero-preview")).toHaveAttribute(
      "data-preview-weapon",
      "Bow05",
    );
    const actual = () =>
      page.evaluate(() =>
        window.__ddd.game.party[0].preview.inventory.items.map((i) => ({
          id: i.instanceId,
          held: i.held,
          worn: i.worn,
        })),
      );
    expect(await actual()).toEqual(flags);
    await page.screenshot({ path: "test-results/appearance-owned-bow.png" });
    await page
      .getByLabel("Equipped backpack style", { exact: true })
      .selectOption("BackPack03");
    await expect(page.locator("#hero-preview")).toHaveAttribute(
      "data-preview-backpack",
      "true",
    );
    expect(await actual()).toEqual(flags);
    await page
      .getByRole("button", { name: "Show equipped gear", exact: true })
      .click();
    await expect(page.locator("#hero-preview")).toHaveAttribute(
      "data-preview-backpack",
      "false",
    );
    await page.screenshot({ path: "test-results/appearance-equipment-ux.png" });
    await page.locator("[data-tint]").first().scrollIntoViewIfNeeded();
    expect(await page.locator(".palette-area").count()).toBeGreaterThan(0);
    await page.screenshot({ path: "test-results/appearance-colour-areas.png" });
    await page.keyboard.press("Escape");
    console.log(
      "Owned-equipment choices, stowed bow/backpack live previews, unchanged real equipment, fantasy choices and colour-area labels passed.",
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
