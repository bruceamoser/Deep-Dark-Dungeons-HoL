import { settingsAction, waitForGame } from "./ui-session.mjs";
import { expect } from "@playwright/test";
import { fillForgeHero } from "./forge-ui-check.mjs";
export async function verifyRespec(page) {
  const saved = await page.evaluate(() =>
    structuredClone(window.__ddd.game.snapshot()),
  );
  try {
    const before = await page.evaluate(() => {
      const g = window.__ddd.game;
      g.awardXP("respec-trial", 5025, "Trial");
      g.trainForge(0);
      const h = g.active;
      h.survival.hp = 7;
      h.survival.gritAvailable = 0;
      for (const id of ["item-food-bundle", "item-water-flask"]) {
        const i = h.preview.inventory.items.find((i) => i.catalogId === id);
        h.supplies[i.instanceId] = 0;
      }
      g.emit("change");
      return {
        heroId: h.heroId,
        draft: structuredClone(h.draft),
        xp: h.xp,
        items: h.preview.inventory.items.map((i) => i.instanceId),
        supplies: { ...h.supplies },
      };
    });
    await page.locator('[data-hero="0"]').click();
    await page.locator("#sheet-respec").click();
    await page.locator("#cancel-respec").click();
    expect(await page.evaluate(() => window.__ddd.game.active.draft)).toEqual(
      before.draft,
    );
    await page.locator("#sheet-respec").click();
    await page.locator("#begin-respec").click();
    await expect(
      page.getByRole("dialog", { name: "Respec character" }),
    ).toBeVisible();
    expect(
      await page
        .locator("[data-attribute]")
        .evaluateAll((es) => es.map((e) => e.value)),
    ).toEqual(Array(6).fill("0"));
    await page.locator('[data-attribute="brawn"]').selectOption("1");
    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => window.__ddd.game.active.draft)).toEqual(
      before.draft,
    );
    await page.locator('[data-hero="0"]').click();
    await page.locator("#sheet-respec").click();
    await page.locator("#begin-respec").click();
    await page.locator("#resume-recruit").click();
    await expect(page.locator('[data-attribute="brawn"]')).toHaveValue("1");
    const reset = await page.locator("#blank-hero").boundingBox(),
      footer = await page.locator(".creator-footer").boundingBox();
    expect(reset.y + reset.height).toBeLessThanOrEqual(footer.y);
    await page.screenshot({ path: "test-results/creator-footer-after.png" });
    await page.locator("#blank-hero").click();
    await fillForgeHero(page, { name: before.draft.name });
    await page.locator('[data-step="5"]').click();
    await expect(page.locator("#creation-fields")).toContainText(
      "stay with this hero",
    );
    await expect(page.locator("[data-kit]")).toHaveCount(0);
    await page.locator('[data-step="6"]').click();
    await expect(page.locator("#recruit")).toBeEnabled();
    await page.screenshot({ path: "test-results/respec-review.png" });
    await page.locator("#recruit").click();
    await expect(
      page.getByRole("dialog", { name: "Character sheet" }),
    ).toBeVisible();
    const after = await page.evaluate(() => {
      const h = window.__ddd.game.active;
      return {
        heroId: h.heroId,
        xp: h.xp,
        items: h.preview.inventory.items.map((i) => i.instanceId),
        supplies: h.supplies,
        hp: h.survival.hp,
        grit: h.survival.gritAvailable,
        dp: h.preview.development.current,
        nodes: h.draft.forge.nodes,
      };
    });
    expect(after).toMatchObject({
      heroId: before.heroId,
      xp: before.xp,
      items: before.items,
      supplies: before.supplies,
      hp: 7,
      grit: 0,
      dp: 30,
      nodes: ["arms:0:0", "armor:0:0"],
    });
    await page.keyboard.press("Escape");
    await settingsAction(page, "Save");
    await page.reload();
    await waitForGame(page);
    expect(
      await page.evaluate(() => window.__ddd.game.active.draft.forge.nodes),
    ).toEqual(after.nodes);
    console.log(
      "Full forge respec, cancel/resume draft, inventory/supply/HP/Grit/XP preservation and reload passed.",
    );
  } finally {
    if (await page.locator("#modal-root > *").count())
      await page.keyboard.press("Escape");
    await page.evaluate((s) => {
      window.__ddd.game.load(s);
      window.__ddd.game.emit("change");
    }, saved);
  }
}
