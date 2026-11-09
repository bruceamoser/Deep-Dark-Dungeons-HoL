import { enterGame, settingsAction } from "./ui-session.mjs";
import { expect } from "@playwright/test";
export async function verifyShortcuts(page) {
  const saved = await page.evaluate(() =>
    structuredClone(window.__ddd.game.snapshot()),
  );
  try {
    await page.evaluate(() => {
      const g = window.__ddd.game;
      g.pause();
      g.setShortcuts(0, ["power-forge-strike", "ability-defend"]);
    });
    await page.locator('[data-hero="0"]').click();
    await page
      .getByRole("button", { name: "Manage shortcuts", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Manage action shortcuts" }),
    ).toBeVisible();
    await expect(page.locator(".shortcut-slots li")).toHaveCount(8);
    await page.locator('[data-shortcut-move="1"][data-direction="-1"]').click();
    expect(
      await page.evaluate(() => window.__ddd.game.party[0].favorites[0]),
    ).toBe("ability-defend");
    await page.locator('[data-shortcut-remove="power-forge-strike"]').click();
    await page.locator("#shortcut-query").fill("Melee");
    await page.locator('[data-shortcut-add="power-forge-strike"]').click();
    await page.locator("#shortcut-query").fill("");
    await page.locator('[data-shortcut-hero="1"]').click();
    await expect(page.locator(".shortcut-window h2")).toContainText("Lira");
    await page.locator('[data-shortcut-hero="0"]').click();
    await page.screenshot({ path: "test-results/shortcut-manager.png" });
    await page.setViewportSize({ width: 1280, height: 800 });
    const bounds = await page.locator(".shortcut-window").boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(800);
    await page.screenshot({ path: "test-results/shortcut-manager-1280.png" });
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.locator("#shortcut-done").click();
    await page.evaluate(() => {
      const g = window.__ddd.game;
      g.mode = "exploration";
      g.selected = 0;
      g.pendingDefense = null;
      g.woundNotices = [];
      g.busy = false;
      g.dice = (n = 3) => Array(n).fill(6);
      window.shortcutsAdvance = g.advance;
      g.advance = () => {};
      const h = g.active;
      g.enemies = [
        {
          id: "shortcut-target",
          name: "Sentry",
          group: 999,
          x: h.x + 2,
          z: h.z,
          hp: 200,
          maxHp: 200,
          conditions: [],
        },
      ];
      g.detect(g.enemies);
      g.setShortcuts(0, ["power-forge-strike", "ability-defend"]);
      g.emit("change");
    });
    const slot = page.locator(".action-hotspot").first();
    await slot.hover();
    await expect(slot.getByRole("tooltip")).toContainText("physical damage");
    await expect(slot.getByRole("tooltip")).toHaveCSS("pointer-events", "none");
    await expect(slot.getByRole("tooltip")).toContainText(
      "Requires a readied melee weapon",
    );
    await page.screenshot({ path: "test-results/action-tooltip.png" });
    await page.evaluate(() => {
      const g = window.__ddd.game;
      g.held(g.active, "item-ordinary-melee-weapon").held = false;
      g.emit("change");
    });
    await page.locator(".action-hotspot").first().focus();
    await expect(page.locator(".action-tooltip").first()).toContainText(
      "Ready a melee weapon first.",
    );
    await page.locator('[data-action="shortcuts"]').click();
    await expect(page.locator(".shortcut-window")).toBeVisible();
    await page.locator("#shortcut-done").click();
    await page.evaluate(() => {
      const g = window.__ddd.game;
      g.mode = "town";
      g.enemies = [];
      g.encounter = null;
      g.emit("change");
    });
    await settingsAction(page, "Save");
    await page.reload();
    await page.waitForFunction(() => window.__ddd);
    await enterGame(page);
    expect(
      await page.evaluate(() => window.__ddd.game.party[0].favorites),
    ).toEqual(["power-forge-strike", "ability-defend"]);
    console.log(
      "Shortcut add/remove/reorder, companion switching, compact layout, save persistence and enabled/disabled hover/focus help passed.",
    );
  } finally {
    await page.evaluate((saved) => {
      const g = window.__ddd.game;
      if (window.shortcutsAdvance) g.advance = window.shortcutsAdvance;
      delete g.dice;
      g.load(saved, { resume: false });
      g.emit("floor");
      g.emit("change");
    }, saved);
  }
}
