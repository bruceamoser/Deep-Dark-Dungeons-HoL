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
      return { id: food.instanceId, bulk: h.preview.inventory.bulk };
    });
    await page.locator('[data-action="sheet"]').click();
    await page.locator(`[data-item="${fixture.id}"]`).click();
    await page.locator("#combine-with").selectOption("combine-ui-food");
    await page
      .getByRole("button", { name: "Combine supplies", exact: true })
      .click();
    await expect(page.locator(".item-inspector")).toContainText("d4 + d6");
    const id = await page.evaluate(
      () =>
        window.__ddd.game.party[0].treasure.find((i) => i.reserveDice)
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
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.reload();
    await page.waitForFunction(() => window.__ddd);
    expect(
      await page.evaluate(
        (id) => ({
          die: window.__ddd.game.party[0].supplies[id],
          reserve: window.__ddd.game.party[0].treasure.find(
            (i) => i.instanceId === id,
          ).reserveDice,
        }),
        id,
      ),
    ).toEqual({ die: 4, reserve: [6] });
    console.log(
      "Dungeon supply-combining controls, unchanged bulk and saved active/reserve dice passed.",
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
