import { chromium, expect } from "@playwright/test";
export async function verifyCharacter(page) {
  const preservedScroll = async (selector, before) => {
    const after = await page.locator(selector).evaluate((e) => ({
      top: e.scrollTop,
      maximum: e.scrollHeight - e.clientHeight,
    }));
    // Completing a required choice removes its validation message and can shorten the panel.
    expect(after.top).toBe(Math.min(before, after.maximum));
  };
  await page.locator('[data-hero="0"]').click();
  const canvas = page.locator("#hero-preview");
  await expect(canvas).toHaveAttribute("data-armor", "light");
  await expect(canvas).toHaveAttribute("data-weapon", "melee");
  await page
    .getByRole("button", { name: "Ordinary Light Armor, worn", exact: true })
    .click();
  await page.locator('[data-gear="remove"]').click();
  await expect(canvas).toHaveAttribute("data-armor", "cloth");
  expect(
    await page.evaluate(
      () => window.__ddd.game.party[0].preview.resistances.physical ?? 0,
    ),
  ).toBe(0);
  await page.getByRole("button", { name: "Wear armor", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-armor", "light");
  expect(
    await page.evaluate(
      () =>
        window.__ddd.scene.entities.get("hero-0").model.userData.equipment
          .armor,
    ),
  ).toBe("light");
  await page.locator('[data-tab="abilities"]').click();
  const star = page.locator('[data-favorite="ability-basic-unarmed"]');
  const before = await star.getAttribute("aria-pressed");
  await star.click();
  await expect(
    page.locator('[data-favorite="ability-basic-unarmed"]'),
  ).toHaveAttribute("aria-pressed", String(before !== "true"));
  await page.locator('[data-companion="1"]').click();
  await page.locator('[data-tab="equipment"]').click();
  await page
    .getByRole("button", { name: "Ordinary Ranged Weapon", exact: true })
    .click();
  await page.locator('[data-gear="ready"]').click();
  await expect(page.locator("#hero-preview")).toHaveAttribute(
    "data-weapon",
    "bow",
  );
  expect(
    await page.evaluate(
      () =>
        window.__ddd.scene.entities
          .get("hero-1")
          .model.getObjectByName("Readied bow")?.visible,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/readied-bow.png" });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator("#toast")).toContainText("saved");
  await page.reload();
  await page.waitForFunction(() => window.__ddd, null, { timeout: 45000 });
  expect(
    await page.evaluate(() =>
      window.__ddd.game.party[0].favorites.includes("ability-basic-unarmed"),
    ),
  ).toBe(before !== "true");
  await page.getByRole("button", { name: "The company register" }).click();
  await page.locator('[data-roster-slot="2"]').click();
  await page.locator("#create-roster-hero").click();
  await expect(page.locator("#hero-name")).toHaveValue("");
  expect(
    await page.locator(".attribute-allocation b").allTextContents(),
  ).toEqual(Array(6).fill("+0"));
  await page.locator("#hero-name").fill("Mara of the Gate");
  await page.locator("#hero-name").blur();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "The company register" }).click();
  await page.locator('[data-roster-slot="2"]').click();
  await page.locator("#create-roster-hero").click();
  await expect(page.locator("#hero-name")).toHaveValue("");
  await page.locator("#resume-recruit").click();
  await expect(page.locator("#hero-name")).toHaveValue("Mara of the Gate");
  for (const key of ["brawn", "fortitude", "agility"])
    await page.locator(`[data-attribute="${key}"][data-delta="1"]`).click();
  await page.locator("#home-language").selectOption("dwarven");
  await page.locator('[data-step="1"]').click();
  await page.locator('[data-ancestry="ancestry-dwarf"]').click();
  await page.locator('[data-trait="trait-dwarf-deep-constitution"]').click();
  await page.locator('[data-trait="trait-dwarf-carved-history"]').click();
  await page.locator('[data-step="8"]').click();
  await page.getByLabel("Sex", { exact: true }).selectOption("female");
  await page.getByLabel("Hairstyle", { exact: true }).selectOption("topknot");
  await page.getByLabel("Facial hair", { exact: true }).selectOption("braided");
  await expect(page.locator("#recruit-preview")).toHaveAttribute(
    "data-appearance",
    /topknot/,
  );
  await page.locator('[data-step="2"]').click();
  await page.locator('[data-origin="culture"]').click();
  const cultureDialog = page.getByRole("dialog", {
    name: "Choose culture",
    exact: true,
  });
  await expect(cultureDialog.locator("[data-browse-origin]")).toHaveCount(18);
  await expect(cultureDialog.locator(".origin-pair")).toHaveCount(2);
  await expect(
    cultureDialog.locator(".origin-pair .discipline-symbol"),
  ).toHaveCount(2);
  await expect(cultureDialog.locator(".origin-pair .ability-type")).toHaveCount(
    2,
  );
  await page.locator("#origin-search").fill("Brace");
  await page
    .locator('[data-browse-origin="origin-culture-walled-communities"]')
    .click();
  await expect(cultureDialog.locator('[data-origin-pair="2"]')).toContainText(
    "Armor",
  );
  await expect(
    cultureDialog.locator('[data-origin-pair="2"] .ability-type b'),
  ).toHaveText("M");
  await expect(cultureDialog.locator('[data-origin-pair="2"]')).toContainText(
    "damage by 2",
  );
  await page.screenshot({ path: "test-results/culture-grant-preview.png" });
  // Browsing and canceling do not silently choose the first pair.
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-origin-summary="culture"]')).toContainText(
    "Choose your culture",
  );
  await page.locator('[data-origin="culture"]').click();
  await page
    .locator('[data-browse-origin="origin-culture-walled-communities"]')
    .click();
  await page.locator('[data-choose-origin-pair="3"]').click();
  await expect(page.locator('[data-origin-summary="culture"]')).toContainText(
    "Guardian Link",
  );
  await page.locator('[data-step="3"]').click();
  await expect(
    page.locator('[data-purchase-kind="discipline"]'),
  ).toBeDisabled();
  await expect(page.locator(".training-banner")).toContainText("Level 0");
  await page.locator('[data-purchase-kind="ability"]').click();
  await expect(
    page.locator('.purchase-window [data-choice^="discipline-"]'),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.locator('[data-step="2"]').click();
  await page.locator('[data-origin="culture"]').click();
  await expect(page.locator('[data-origin-pair="3"]')).toHaveClass(/chosen/);
  await page.locator('[data-choose-origin-pair="2"]').click();
  await expect(page.locator('[data-origin-summary="culture"]')).toContainText(
    "Brace",
  );
  await page.locator('[data-origin="background"]').click();
  await expect(page.locator("[data-browse-origin]")).toHaveCount(32);
  await page.locator("#origin-search").fill("no such origin");
  await expect(page.locator("[data-choose-origin-pair]")).toHaveCount(0);
  await page.locator("#origin-search").fill("Household Guard");
  await page
    .locator('[data-browse-origin="origin-background-household-guard"]')
    .click();
  await expect(page.locator('[data-origin-pair="2"]')).toContainText(
    "Driving Cut",
  );
  await expect(
    page.locator('[data-origin-pair="2"] .ability-type b'),
  ).toHaveText("A");
  await page.screenshot({ path: "test-results/background-grant-preview.png" });
  await page.locator('[data-choose-origin-pair="2"]').click();
  await expect(
    page.locator('[data-origin-summary="background"]'),
  ).toContainText("Driving Cut");
  await page.screenshot({ path: "test-results/origin-grants-selected.png" });
  await page.locator('[data-step="6"]').click();
  await expect(
    page.locator('[data-finish-grant="power-driving-cut"]'),
  ).toBeVisible();
  await page.locator('[data-finish-grant="power-driving-cut"]').click();
  await page
    .locator('[data-acquire="power-driving-cut"][data-key="meleeHands"]')
    .selectOption("1");
  await page.locator('[data-step="4"]').click();
  await page.locator('[data-class="class-protector"]').click();
  await page.locator('[data-class-discipline="discipline-armor"]').click();
  await page.locator('[data-class-discipline="discipline-guard"]').click();
  const signature = page.locator(
    '[data-signature="power-signature-sworn-guardian"]',
  );
  await signature.scrollIntoViewIfNeeded();
  const callingScroll = await page
    .locator(".creation-content")
    .evaluate((e) => e.scrollTop);
  expect(callingScroll).toBeGreaterThan(0);
  await signature.click();
  await preservedScroll(".creation-content", callingScroll);
  await page.locator('[data-step="3"]').click();
  await expect(
    page.locator('[data-purchase-kind="discipline"]'),
  ).toBeDisabled();
  await page.locator('[data-step="5"]').click();
  expect(
    await page.locator(".creation-content").evaluate((e) => e.scrollTop),
  ).toBe(0);
  await expect(page.locator('[data-purchase-kind="discipline"]')).toBeEnabled();
  await page.locator('[data-purchase-kind="discipline"]').click();
  await expect(
    page.getByRole("dialog", { name: "Purchase disciplines", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".purchase-window .owned-disciplines"),
  ).toContainText("Arms");
  await expect(
    page.locator('.purchase-window [data-choice^="ability-"]'),
  ).toHaveCount(0);
  await expect(
    page.locator('.purchase-window [data-choice="discipline-flame"] img'),
  ).toHaveAttribute("src", "/vendor/hol/assets/flame.webp");
  const disciplinePurchase = page.locator('[data-buy="discipline-flame"]');
  await disciplinePurchase.scrollIntoViewIfNeeded();
  const purchaseScroll = await page
    .locator(".purchase-scroll")
    .evaluate((e) => e.scrollTop);
  expect(purchaseScroll).toBeGreaterThan(0);
  await disciplinePurchase.click();
  await preservedScroll(".purchase-scroll", purchaseScroll);
  await expect(
    page.locator(".purchase-window .owned-disciplines"),
  ).toContainText("Flame");
  await page.screenshot({ path: "test-results/discipline-purchases.png" });
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.locator('[data-purchase-kind="ability"]').click();
  await expect(
    page.locator('.purchase-window [data-choice^="discipline-"]'),
  ).toHaveCount(0);
  await page.locator("#discipline-filter").selectOption("discipline-flame");
  await expect(
    page.locator('[data-choice="power-ember-lance"] .ability-type'),
  ).toHaveAttribute("aria-label", "Main Action");
  await expect(
    page.locator('[data-choice="power-ember-lance"] .ability-type b'),
  ).toHaveText("A");
  await expect(
    page.locator('[data-buy="ability-conditioned-body"]'),
  ).toHaveCount(0);
  await page.screenshot({ path: "test-results/ability-purchases.png" });
  await page.locator('[data-buy="power-ember-lance"]').click();
  await page.locator("#discipline-filter").selectOption("general");
  await expect(
    page.locator('[data-choice="ability-conditioned-body"] .ability-type b'),
  ).toHaveText("P");
  await page.locator('[data-buy="ability-conditioned-body"]').click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".purchase-window")).toHaveCount(0);
  await expect(page.locator(".creator-window")).toBeVisible();
  await page.locator('[data-step="6"]').click();
  await expect(
    page.locator('[data-owned-item="item-ordinary-melee-weapon"]'),
  ).toContainText("Granted by Driving Cut");
  await expect(
    page.locator('[data-stock="item-ordinary-melee-weapon"]'),
  ).toContainText("Owned 1 · 1 granted");
  const buyWeapon = page.locator('[data-shop="item-ordinary-melee-weapon"]');
  await buyWeapon.scrollIntoViewIfNeeded();
  const equipmentScroll = await page
    .locator(".creation-content")
    .evaluate((e) => e.scrollTop);
  expect(equipmentScroll).toBeGreaterThan(0);
  await buyWeapon.click();
  await preservedScroll(".creation-content", equipmentScroll);
  await expect(
    page.locator('[data-stock="item-ordinary-melee-weapon"]'),
  ).toContainText("Owned 2 · 1 granted");
  await expect(
    page.locator('[data-owned-item="item-ordinary-melee-weapon"]'),
  ).toHaveCount(2);
  await page.locator("[data-remove-item]").last().click();
  await expect(
    page.locator('[data-stock="item-ordinary-melee-weapon"]'),
  ).toContainText("Owned 1 · 1 granted");
  await page.screenshot({
    path: "test-results/creation-granted-equipment.png",
  });
  await page.locator('[data-shop="item-ammunition-bundle"]').click();
  await page.locator('[data-step="7"]').click();
  await expect(page.locator("#recruit")).toBeEnabled();
  await page.screenshot({ path: "test-results/creation-review.png" });
  await page.locator("#recruit").click();
  await page.locator("#assign-roster-hero").click();
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate(() => ({
      name: window.__ddd.game.party[2].name,
      valid: window.__ddd.game.party[2].preview.valid,
      hair: window.__ddd.game.party[2].draft.appearance.hair,
    })),
  ).toEqual({ name: "Mara of the Gate", valid: true, hair: "topknot" });
  console.log(
    "Rendered armor/weapon changes, saved favorites and complete blank-to-valid native character creation passed.",
  );
}
if (process.argv[1]?.endsWith("character-check.mjs")) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage({
        viewport: { width: 1600, height: 1000 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:5198");
    await page.waitForFunction(() => window.__ddd);
    await verifyCharacter(page);
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
}
