import { expect } from "@playwright/test";
export async function verifyEquipmentBonuses(page) {
  const saved = await page.evaluate(() =>
    structuredClone(window.__ddd.game.snapshot()),
  );
  try {
    await page.evaluate(() => {
      const g = window.__ddd.game;
      g.pause();
      g.mode = "town";
      g.busy = false;
      g.selected = 0;
      (g.active.treasure ??= []).push({
        instanceId: "relic-919191-brooch",
        seed: 919191,
        depth: 8,
        revision: 3,
        base: "brooch",
        power: 1,
        affixes: ["illumination", "competence-life"],
        carried: true,
        worn: false,
        held: false,
        definition: { name: "QA Lantern Brooch" },
      });
      g.refreshHero(g.active);
      g.emit("party");
      g.emit("change");
    });
    await page.locator('[data-hero="0"]').click();
    await page.locator('[data-tab="equipment"]').click();
    await page.locator('[data-item="relic-919191-brooch"]').click();
    await expect(page.locator(".item-inspector")).toContainText("Light source");
    await expect(page.locator(".item-inspector")).toContainText(
      "all Life abilities",
    );
    await page.locator('[data-gear="wear"]').click();
    await expect(page.locator("#item-light")).toHaveText(
      "Disable magical light",
    );
    expect(
      await page.evaluate(() =>
        window.__ddd.game.active.preview.equipmentEffects.some(
          (e) => e.effect === "illumination",
        ),
      ),
    ).toBe(true);
    await page.locator("#item-light").click();
    await expect(page.locator("#item-light")).toHaveText(
      "Enable magical light",
    );
    expect(
      await page.evaluate(() =>
        window.__ddd.game.active.preview.equipmentEffects.some(
          (e) => e.effect === "illumination",
        ),
      ),
    ).toBe(false);
    await page.locator("#item-light").click();
    await page.screenshot({ path: "test-results/equipment-bonuses.png" });
    await page.locator('[data-gear="remove"]').click();
    expect(
      await page.evaluate(() =>
        window.__ddd.game.active.preview.equipmentEffects.some(
          (e) => e.effect === "illumination",
        ),
      ),
    ).toBe(false);
    await page.keyboard.press("Escape");
    console.log(
      "Approved equipment descriptions, equip/remove, live light toggles and inactive stowed effects passed.",
    );
  } finally {
    if (await page.locator(".character-window").count())
      await page.keyboard.press("Escape");
    await page.evaluate((saved) => {
      const g = window.__ddd.game;
      g.load(saved, { resume: false });
      g.emit("floor");
      g.emit("change");
    }, saved);
  }
}
