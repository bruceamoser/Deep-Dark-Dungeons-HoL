import { expect } from "@playwright/test";
import { magicItem } from "../src/core/treasure.mjs";
export async function verifyWeaponVisuals(page) {
  const saved = await page.evaluate(() =>
    structuredClone(window.__ddd.game.snapshot()),
  );
  try {
    for (const base of ["blade", "bow"]) {
      const item = magicItem(123, 2, { base });
      await page.evaluate((item) => {
        const { game: g, scene: s } = window.__ddd;
        g.pause();
        g.mode = "exploration";
        g.selected = 0;
        const h = g.party[0];
        h.preview.inventory.items
          .filter((i) => i.held)
          .forEach((i) => g.equip(0, i.instanceId, "stow"));
        if (
          !h.treasure.some((i) => i.instanceId === "visual-test-ordinary-bow")
        )
          h.treasure.push({
            kind: "ordinary",
            instanceId: "visual-test-ordinary-bow",
            catalogId: "item-ordinary-ranged-weapon",
            hands: 2,
            carried: true,
            held: false,
          });
        h.treasure = h.treasure.filter((i) => i.instanceId !== item.instanceId);
        h.treasure.push({ ...item, held: true });
        g.refreshHero(h);
        g.emit("party");
        g.emit("change");
      }, item);
      await page.locator('[data-action="sheet"]').click();
      await page.locator('[data-tab="appearance"]').click();
      const visual = () =>
        page.evaluate(
          () =>
            window.__ddd.scene.entities.get("hero-0").model.userData
              .weaponVisual,
        );
      const before = await visual();
      expect(before.fixed).toBe(true);
      expect(before.type).toBe(base === "blade" ? "sword" : "bow");
      await page
        .getByLabel("One-handed melee type", { exact: true })
        .selectOption("hammer");
      await page
        .getByLabel("Equipped bow style", { exact: true })
        .selectOption("Bow05");
      expect(await visual()).toEqual(before);
      await page.screenshot({ path: `test-results/fixed-magic-${base}.png` });
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await page.reload();
      await page.waitForFunction(() => window.__ddd);
      expect(await visual()).toEqual(before);
    }
    console.log(
      "Magic sword/bow visuals stay fixed across ordinary cosmetic edits and save/reload in the dungeon.",
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
