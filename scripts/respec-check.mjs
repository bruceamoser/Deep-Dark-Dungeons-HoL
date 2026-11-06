import { expect } from "@playwright/test";
export async function verifyRespec(page) {
  const saved = await page.evaluate(() =>
    structuredClone(window.__ddd.game.snapshot()),
  );
  try {
    const before = await page.evaluate(() => {
      const g = window.__ddd.game,
        h = g.active;
      g.awardXP("respec-proof", 10000, "Respec test expedition");
      const d = structuredClone(h.draft),
        cls = g.C.choices.find((c) => c.id === d.classId);
      d.progression = { level: 7, levels: {} };
      for (let level = 2; level <= 7; level++) {
        d.progression.levels[level] = g.R.emptyLevelDraft();
        if ([3, 7].includes(level))
          d.progression.levels[level].signatures[level] = cls.signatures[
            level
          ].find((id) => g.powerSpec(id));
      }
      g.develop(0, d);
      h.survival.hp = 7;
      h.survival.gritAvailable = 0;
      h.build = { talents: { "heavy-hands": 2 }, specializations: {} };
      const food = h.preview.inventory.items.find(
        (i) => i.catalogId === "item-food-bundle",
      );
      h.supplies[food.instanceId] = 0;
      const water = h.preview.inventory.items.find(
        (i) => i.catalogId === "item-water-flask",
      );
      h.supplies[water.instanceId] = 0;
      g.emit("change");
      return {
        heroId: h.heroId,
        draft: structuredClone(h.draft),
        xp: h.xp,
        earned: h.earnedLevel,
        items: h.preview.inventory.items
          .map((i) => [i.catalogId, i.quantity, i.hands ?? 0])
          .sort(),
        reserve: g.campaign.reserve.length,
      };
    });
    await page.locator('[data-hero="0"]').click();
    await page.locator("#sheet-respec").click();
    await expect(page.getByRole("dialog")).toContainText("7");
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
      await page.locator(".attribute-allocation b").allTextContents(),
    ).toEqual(Array(6).fill("+0"));
    await expect(page.locator("#hero-name")).toHaveValue(before.draft.name);
    await page.locator('[data-attribute="brawn"][data-delta="1"]').click();
    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => window.__ddd.game.active.draft)).toEqual(
      before.draft,
    );
    await page.locator('[data-hero="0"]').click();
    await page.locator("#sheet-respec").click();
    await page.locator("#begin-respec").click();
    await page.locator("#resume-recruit").click();
    expect(
      (await page.locator(".attribute-allocation b").allTextContents())[0],
    ).toBe("+1");
    await page.locator("#blank-hero").click();
    expect(
      await page.locator(".attribute-allocation b").allTextContents(),
    ).toEqual(Array(6).fill("+0"));
    for (const key of ["brawn", "fortitude", "agility"])
      await page.locator(`[data-attribute="${key}"][data-delta="1"]`).click();
    await page.locator("#home-language").selectOption("dwarven");
    await page.locator('[data-step="1"]').click();
    await page.locator('[data-ancestry="ancestry-dwarf"]').click();
    await page.locator('[data-trait="trait-dwarf-deep-constitution"]').click();
    await page.locator('[data-trait="trait-dwarf-carved-history"]').click();
    await page.locator('[data-step="2"]').click();
    for (const [kind, id] of [
      ["culture", "origin-culture-walled-communities"],
      ["background", "origin-background-household-guard"],
    ]) {
      await page.locator(`[data-origin="${kind}"]`).click();
      await page.locator(`[data-browse-origin="${id}"]`).click();
      await page.locator('[data-choose-origin-pair="2"]').click();
    }
    await page.locator('[data-step="3"]').click();
    await expect(
      page.locator('[data-purchase-kind="discipline"]'),
    ).toBeDisabled();
    await expect(page.locator("#respec-level")).toHaveCount(0);
    await page.locator('[data-purchase-kind="ability"]').click();
    await page.locator("#discipline-filter").selectOption("discipline-arms");
    await page.locator('[data-buy="power-measured-cut"]').click();
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await page.locator('[data-step="4"]').click();
    await page.locator('[data-class="class-shadow"]').click();
    await page.locator("[data-class-discipline]").nth(0).click();
    await page.locator("[data-class-discipline]").nth(1).click();
    await page
      .locator('[data-signature="power-signature-shadow-venom-1"]')
      .click();
    await page.locator('[data-step="5"]').click();
    await expect(page.locator("#respec-level option")).toHaveCount(7);
    await page.locator("#respec-level").selectOption("2");
    await page.locator('[data-purchase-kind="ability"]').click();
    await page.locator("#discipline-filter").selectOption("discipline-arms");
    await page.locator('[data-buy="power-hamstring"]').click();
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await page.locator("#respec-level").selectOption("3");
    await page
      .locator('[data-advance-signature="3"]')
      .selectOption("power-signature-shadow-venom-3");
    await page.locator("#respec-level").selectOption("7");
    await expect(page.locator('[data-advance-signature="3"]')).toHaveCount(0);
    await page
      .locator('[data-advance-signature="7"]')
      .selectOption("power-signature-shadow-executioner-7");
    await page.screenshot({ path: "test-results/respec-advancement.png" });
    await page.locator('[data-step="6"]').click();
    await expect(page.locator("[data-retained-item]")).toHaveCount(
      before.items.length,
    );
    await expect(page.locator("[data-shop]")).toHaveCount(0);
    await expect(
      page.locator("[data-retained-item]").filter({ hasText: "Food Bundle" }),
    ).toContainText("exhausted");
    await expect(
      page.locator("[data-retained-item]").filter({ hasText: "Water Flask" }),
    ).toContainText("exhausted");
    await page.locator('[data-step="7"]').click();
    await expect(page.locator("#recruit")).toBeEnabled();
    await page.screenshot({ path: "test-results/respec-review.png" });
    await page.locator("#recruit").click();
    await expect(
      page.getByRole("dialog", { name: "Character sheet" }),
    ).toBeVisible();
    await expect(page.locator(".mastery-total b")).toHaveText("14");
    const verify = () =>
      page.evaluate(() => {
        const g = window.__ddd.game,
          h = g.active;
        return {
          heroId: h.heroId,
          xp: h.xp,
          earned: h.earnedLevel,
          level: h.preview.state.level,
          cls: h.draft.classId,
          hp: h.survival.hp,
          grit: h.survival.gritAvailable,
          items: h.preview.inventory.items
            .map((i) => [i.catalogId, i.quantity, i.hands ?? 0])
            .sort(),
          reserve: g.campaign.reserve.length,
          food: h.supplies[
            h.preview.inventory.items.find(
              (i) => i.catalogId === "item-food-bundle",
            ).instanceId
          ],
          water:
            h.supplies[
              h.preview.inventory.items.find(
                (i) => i.catalogId === "item-water-flask",
              ).instanceId
            ],
          history: h.respecHistory.length,
          old: h.preview.state.abilities.filter((id) =>
            id.startsWith("ability-signature-"),
          ),
        };
      });
    const expected = {
      heroId: before.heroId,
      xp: before.xp,
      earned: before.earned,
      level: 7,
      cls: "class-shadow",
      hp: 7,
      grit: 0,
      items: before.items,
      reserve: before.reserve,
      food: 0,
      water: 0,
      history: 1,
      old: [],
    };
    expect(await verify()).toEqual(expected);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.reload();
    await page.waitForFunction(() => window.__ddd);
    expect(await verify()).toEqual(expected);
    console.log(
      "Native full respec: cancel, blank/resumable draft, level 1–7 repurchases/signatures, retained inventory/empty supplies/XP/HP/Grit, mastery refund and disk reload passed.",
    );
  } catch (e) {
    await page.screenshot({ path: "test-results/respec-failure.png" });
    console.error(
      "Respec test:",
      e,
      await page.locator("#toast").textContent(),
    );
    throw e;
  } finally {
    if (await page.locator(".character-window").count())
      await page.keyboard.press("Escape");
    if (await page.locator("#resume-run").count())
      await page.locator("#resume-run").click();
    await page.evaluate((saved) => {
      const { game: g, scene: s } = window.__ddd;
      g.load(saved, { resume: false });
      s.focusOn(g.active);
      g.resume();
      g.emit("change");
    }, saved);
    await page.getByRole("button", { name: "Save", exact: true }).click();
  }
}
