import { settingsAction, waitForGame } from "./ui-session.mjs";
import { expect } from "@playwright/test";
export async function verifyCombinedSupplies(page) {
  const saved = await page.evaluate(() =>
    structuredClone(window.__ddd.game.snapshot()),
  );
  try {
    const fixture = await page.evaluate(() => {
      const { game: g } = window.__ddd;
      g.pause();
      g.mode = "exploration";
      g.selected = 0;
      const h = g.party[0],
        food = h.preview.inventory.items.find(
          (i) => i.catalogId === "item-food-bundle",
        );
      (h.treasure ??= []).push({
        kind: "ordinary",
        instanceId: "combine-ui-food",
        catalogId: food.catalogId,
        quantity: 1,
        carried: true,
        held: false,
        worn: false,
      });
      h.supplies[food.instanceId] = 4;
      h.supplies["combine-ui-food"] = 6;
      g.refreshHero(h);
      g.emit("change");
      return {
        id: food.instanceId,
        bulk: h.preview.inventory.bulk,
        supplyBulk: food.bulk,
      };
    });
    expect(fixture.supplyBulk).toBe(0.5);
    await page.locator('[data-action="sheet"]').click();
    await page.locator(`[data-item="${fixture.id}"]`).click();
    await expect(page.locator(".item-facts")).toContainText("0.5");
    await page.locator("#combine-with").selectOption("combine-ui-food");
    await expect(page.locator("#combine-reason")).toContainText("Result: d8");
    await page
      .getByRole("button", { name: "Combine supplies", exact: true })
      .click();
    await expect(page.locator(".item-inspector")).toContainText(
      "Combined supply: d8",
    );
    await expect(page.locator(".item-facts")).toContainText("Bulk1");
    const id = await page.evaluate(
      () =>
        window.__ddd.game.party[0].treasure.find((i) => i.combinedSupply)
          ?.instanceId,
    );
    expect(id).toBeTruthy();
    expect(
      await page.evaluate(
        () => window.__ddd.game.party[0].preview.inventory.bulk,
      ),
    ).toBe(fixture.bulk);
    await page.screenshot({ path: "test-results/combined-supplies.png" });
    await page.keyboard.press("Escape");
    await settingsAction(page, "Save");
    await page.reload();
    await waitForGame(page);
    expect(
      await page.evaluate(
        (id) => ({
          die: window.__ddd.game.party[0].supplies[id],
          combined: window.__ddd.game.party[0].treasure.find(
            (i) => i.instanceId === id,
          ).combinedSupply,
        }),
        id,
      ),
    ).toEqual({ die: 8, combined: true });
    console.log(
      "Dungeon supply-combining controls, unchanged bulk and grown supply dice saved passed.",
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
