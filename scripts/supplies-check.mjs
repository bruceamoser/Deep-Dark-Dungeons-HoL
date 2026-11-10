import { expect } from "@playwright/test";
import { settingsAction, waitForGame } from "./ui-session.mjs";

export async function verifySimpleSupplies(page) {
  const saved = await page.evaluate(() =>
    structuredClone(window.__ddd.game.snapshot()),
  );
  try {
    const initial = await page.evaluate(() => {
      const g = window.__ddd.game;
      g.pause();
      g.paths.clear();
      g.busy = false;
      g.pendingDefense = g.pendingProvocation = null;
      g.woundNotices = [];
      g.campaign.supplyNotices = [];
      g.mode = "town";
      g.campaign.bank = 2000;
      const r = g.supplyRows().find((r) => r.supply === "arrows" && !r.missing),
        h = g.party.find((h) => h.heroId === r.hero);
      h.supplies[r.itemId] = 4;
      g.campaign.restockTarget = 8;
      g.emit("change");
      return {
        ref: r,
        price: g.townRestockPlan(r, 8).price,
        before: g.campaign.bank,
      };
    });
    await page.locator('.topbar [data-action="supplies"]').click();
    await expect(
      page.getByRole("dialog", { name: "Party supplies", exact: true }),
    ).toBeVisible();
    await page.locator('[data-supply-filter="arrows"]').click();
    await expect(page.locator(".supply-next")).toContainText("d4 → d8");
    await page.getByRole("button", { name: "Restock", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Review restock" }),
    ).toBeVisible();
    await expect(page.locator(".restock-review")).toContainText(
      `${initial.price} coins`,
    );
    await page.screenshot({ path: "test-results/supplies-review.png" });
    await page.locator("#cancel-restock").click();
    expect(await page.evaluate(() => window.__ddd.game.campaign.bank)).toBe(
      initial.before,
    );
    await page.getByRole("button", { name: "Restock", exact: true }).click();
    await page.locator("#confirm-restock").click();
    expect(
      await page.evaluate(
        (ref) =>
          window.__ddd.game.party.find((h) => h.heroId === ref.hero).supplies[
            ref.itemId
          ],
        initial.ref,
      ),
    ).toBe(8);
    expect(await page.evaluate(() => window.__ddd.game.campaign.bank)).toBe(
      initial.before - initial.price,
    );
    const party = await page.evaluate(() => window.__ddd.game.departurePlan(8));
    if (party.rows.length) {
      await page.locator("#review-party-restock").click();
      await page.locator("#confirm-restock").click();
      expect(await page.evaluate(() => window.__ddd.game.campaign.bank)).toBe(
        initial.before - initial.price - party.total,
      );
    }
    await expect(page.locator("[data-buy-stock]")).toHaveCount(0);
    await expect(page.locator(".supplies-layout aside")).toContainText(
      "no ingredients",
    );
    await page.locator('[data-supply-filter="all"]').click();
    await page.screenshot({ path: "test-results/supplies-town.png" });
    await page.setViewportSize({ width: 1100, height: 800 });
    const bounds = await page.locator(".supplies-window").boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(800);
    expect(
      await page
        .locator(".supplies-window")
        .evaluate((e) => e.scrollWidth <= e.clientWidth),
    ).toBe(true);
    await page.screenshot({ path: "test-results/supplies-1100.png" });
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.locator('[aria-label="Close supplies"]').click();
    await settingsAction(page, "Save");
    await page.reload();
    await waitForGame(page);
    expect(
      await page.evaluate(() => window.__ddd.game.materialCount("craft")),
    ).toBe(0);
    await page.evaluate((ref) => {
      const g = window.__ddd.game;
      g.pause();
      g.mode = "exploration";
      g.enemies = [];
      g.encounter = null;
      g.paths.clear();
      g.busy = false;
      g.campWanderers = () => [];
      g.campSupplyProjection = "success";
      g.campaign.camp = null;
      g.party.forEach((h, i) => {
        Object.assign(h, {
          x: g.map.start.x + (i % 2),
          z: g.map.start.z + Math.floor(i / 2),
        });
        h.survival.status = "active";
      });
      g.party.find((h) => h.heroId === ref.hero).supplies[ref.itemId] = 4;
      g.emit("floor");
      g.emit("change");
    }, initial.ref);
    const materialBefore = await page.evaluate(() =>
      window.__ddd.game.materialCount("craft"),
    );
    await page.locator('.topbar [data-action="supplies"]').click();
    await page.locator('[data-supply-filter="arrows"]').click();
    await expect(page.locator(".supply-description")).toContainText(
      "suitable worker",
    );
    await page
      .getByRole("button", { name: "Plan at camp", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Dungeon camp", exact: true }),
    ).toBeVisible();
    expect(
      await page
        .locator(".camp-project-preview")
        .filter({ hasText: "May replenish" })
        .count(),
    ).toBeGreaterThan(0);
    await expect(page.locator(".camp-plan")).toContainText(
      "Basic camp tasks need no ingredients",
    );
    await expect(page.locator("[data-supply-target]").first()).toContainText(
      "Automatic",
    );
    await page.screenshot({ path: "test-results/supplies-camp-project.png" });
    await page.locator("#camp-hour").click();
    await page.locator("#camp-hour").click();
    expect(
      await page.evaluate(
        (ref) =>
          window.__ddd.game.party.find((h) => h.heroId === ref.hero).supplies[
            ref.itemId
          ],
        initial.ref,
      ),
    ).toBe(6);
    expect(
      await page.evaluate(() => window.__ddd.game.materialCount("craft")),
    ).toBe(materialBefore);
    await page.locator('[aria-label="Close camp"]').click();
    await settingsAction(page, "Save");
    await page.reload();
    await waitForGame(page);
    expect(
      await page.evaluate(() => window.__ddd.game.campaign.camp.elapsed),
    ).toBe(2);
    expect(
      await page.evaluate(() => window.__ddd.game.materialCount("craft")),
    ).toBe(materialBefore);
    expect(
      await page.evaluate(
        (ref) =>
          window.__ddd.game.party.find((h) => h.heroId === ref.hero).supplies[
            ref.itemId
          ],
        initial.ref,
      ),
    ).toBe(6);
    console.log(
      "Party Supplies: reviewed/free-cancel restock, exact coin and Bulk costs, ingredient-free tasks, compact layout, camp project and paused save/reload passed.",
    );
  } finally {
    if (await page.locator("#modal-root > *").count())
      await page.keyboard.press("Escape");
    await page.evaluate((saved) => {
      const g = window.__ddd.game;
      delete g.campWanderers;
      delete g.campSupplyProjection;
      g.load(saved, { resume: false });
      g.emit("floor");
      g.emit("change");
    }, saved);
    await page.setViewportSize({ width: 1600, height: 1000 });
  }
}
