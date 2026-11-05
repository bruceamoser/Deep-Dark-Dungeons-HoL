import { chromium, expect } from "@playwright/test";
export async function verifyCharacter(page) {
  await page.locator('[data-hero="0"]').click();
  const canvas = page.locator("#hero-preview");
  await expect(canvas).toHaveAttribute("data-armor", "light");
  await expect(canvas).toHaveAttribute("data-weapon", "melee");
  await page
    .getByRole("button", { name: "Ordinary Light Armor, worn", exact: true })
    .click();
  await page.getByRole("button", { name: "Remove armor", exact: true }).click();
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
  await page.getByRole("button", { name: "Continue saved expedition" }).click();
  expect(
    await page.evaluate(() =>
      window.__ddd.game.party[0].favorites.includes("ability-basic-unarmed"),
    ),
  ).toBe(before !== "true");
  await page.getByRole("button", { name: "The company register" }).click();
  await page.locator('[data-edit="2"]').click();
  await page.getByRole("button", { name: "Start a blank hero" }).click();
  await page.locator("#hero-name").fill("Mara of the Gate");
  await page.locator("#hero-name").blur();
  for (const key of ["brawn", "fortitude", "agility"])
    await page.locator(`[data-attribute="${key}"][data-delta="1"]`).click();
  await page.locator("#home-language").selectOption("dwarven");
  await page.locator('[data-step="1"]').click();
  await page.locator('[data-ancestry="ancestry-dwarf"]').click();
  await page.locator('[data-trait="trait-dwarf-deep-constitution"]').click();
  await page.locator('[data-trait="trait-dwarf-carved-history"]').click();
  await page.locator('[data-step="2"]').click();
  await page
    .locator('[data-origin="culture"]')
    .selectOption("origin-culture-walled-communities");
  await page
    .locator('[data-origin="background"]')
    .selectOption("origin-background-household-guard");
  await page.locator('[data-step="3"]').click();
  await page
    .locator('[data-acquire="ability-hook-and-drive"][data-key="meleeHands"]')
    .selectOption("1");
  await page.locator('[data-step="4"]').click();
  await page.locator('[data-class="class-protector"]').click();
  await page.locator('[data-class-discipline="discipline-armor"]').click();
  await page.locator('[data-class-discipline="discipline-guard"]').click();
  await page
    .locator('[data-signature="ability-signature-protector-between-them"]')
    .click();
  await page.locator('[data-step="5"]').click();
  await page.locator('[data-buy="ability-conditioned-body"]').click();
  await page.locator('[data-step="6"]').click();
  await page.locator('[data-shop="item-ammunition-bundle"]').click();
  await page.locator('[data-step="7"]').click();
  await expect(page.locator("#recruit")).toBeEnabled();
  await page.screenshot({ path: "test-results/creation-review.png" });
  await page.locator("#recruit").click();
  expect(
    await page.evaluate(() => ({
      name: window.__ddd.game.party[2].name,
      valid: window.__ddd.game.party[2].preview.valid,
    })),
  ).toEqual({ name: "Mara of the Gate", valid: true });
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
