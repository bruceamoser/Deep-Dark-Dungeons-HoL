import { expect } from "@playwright/test";

export async function verifyFieldAbilities(page) {
  const saved = await page.evaluate(() =>
    structuredClone(window.__ddd.game.snapshot()),
  );
  try {
    for (const mode of ["town", "exploration"]) {
      await page.evaluate((mode) => {
        const g = window.__ddd.game;
        g.pause();
        g.supplyDie = () => 1;
        g.mode = mode;
        g.selected = 0;
        g.paths.clear();
        g.enemies = [];
        g.busy = false;
        g.pendingDefense = g.pendingProvocation = null;
        g.woundNotices = [];
        const p = g.map.start;
        g.party.forEach((h) => {
          Object.assign(h, p);
          h.survival.hp = h.survival.maxHp;
          h.survival.status = "active";
          h.conditions = [];
          h.restPowerUses = {};
        });
        g.party[0].survival.hp = Math.max(1, g.party[0].survival.maxHp - 7);
        g.emit("floor");
        g.emit("change");
      }, mode);
      const before = await page.evaluate(() => ({
        hp: window.__ddd.game.party[0].survival.hp,
        time: window.__ddd.game.clock().seconds,
        dressing: (() => {
          const g = window.__ddd.game;
          const h = g.party[2];
          return g.supplyValue(h, g.supplyItem(h, "item-field-dressing"));
        })(),
      }));
      const open = async () => {
        await page.locator('[data-hero="0"]').click();
        await page.locator('[data-companion="2"]').click();
        await page.locator('[data-tab="abilities"]').click();
        const entry = page
          .locator(".ability-entry")
          .filter({ has: page.locator('[data-use="power-mending-touch"]') });
        await entry.locator("summary").click();
        await expect(entry).toContainText(
          "Choose a companion in the next step.",
        );
        await entry.locator("[data-use]").click();
        await expect(page.locator(".character-window")).toHaveCount(0);
        await expect(
          page.locator('[data-field-target="hero-0"]'),
        ).toBeEnabled();
        await expect(
          page.locator('[data-field-target="hero-1"]'),
        ).toBeDisabled();
      };
      await open();
      await page.locator("#cancel-field-action").click();
      expect(await page.evaluate(() => window.__ddd.game.clock().seconds)).toBe(
        before.time,
      );
      expect(
        await page.evaluate(
          () =>
            window.__ddd.game.party[2].restPowerUses["power-mending-touch"] ??
            0,
        ),
      ).toBe(0);
      await open();
      await page.locator('[data-field-target="hero-0"]').click();
      expect(
        await page.evaluate(() => window.__ddd.game.party[0].survival.hp),
      ).toBeGreaterThan(before.hp);
      expect(
        await page.evaluate(() =>
          (() => {
            const g = window.__ddd.game;
            const h = g.party[2];
            return g.supplyValue(
              h,
              h.preview.inventory.items.find(
                (i) => i.catalogId === "item-field-dressing",
              ),
            );
          })(),
        ),
      ).toBeLessThan(before.dressing);
      expect(await page.evaluate(() => window.__ddd.game.active.id)).toBe(
        "hero-2",
      );
      await page.screenshot({
        path: `test-results/field-abilities-${mode}.png`,
      });
    }
    console.log(
      "Character sheet selects the inspected caster; town/dungeon companion picker validates targets, cancels freely and heals using the caster's dressing.",
    );
  } finally {
    await page.keyboard.press("Escape");
    await page.evaluate((saved) => {
      const g = window.__ddd.game;
      delete g.supplyDie;
      g.load(saved, { resume: false });
      g.emit("floor");
      g.emit("change");
    }, saved);
  }
}
