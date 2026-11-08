import { expect } from "@playwright/test";
import { fillForgeHero } from "./forge-ui-check.mjs";
export async function verifyCharacter(page) {
  await page.locator('[data-hero="0"]').click();
  let canvas = page.locator("#hero-preview");
  await expect(canvas).toHaveAttribute("data-armor", "light");
  await expect(canvas).toHaveAttribute("data-weapon", "melee");
  await page
    .getByRole("button", { name: "Ordinary Light Armor, worn", exact: true })
    .click();
  await page.locator('[data-gear="remove"]').click();
  await expect(canvas).toHaveAttribute("data-armor", "cloth");
  await page.getByRole("button", { name: "Wear armor", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-armor", "light");
  await page.locator('[data-tab="abilities"]').click();
  await expect(page.locator(".choice-reference")).toHaveCount(0);
  const star = page.locator('[data-favorite="power-forge-unarmed"]'),
    before = await star.getAttribute("aria-pressed");
  await star.click();
  await expect(
    page.locator('[data-favorite="power-forge-unarmed"]'),
  ).toHaveAttribute("aria-pressed", String(before !== "true"));
  await page.locator('[data-companion="1"]').click();
  await page.locator('[data-tab="equipment"]').click();
  await expect(page.locator("#hero-preview")).toHaveAttribute(
    "data-weapon",
    "bow",
  );
  await page.screenshot({ path: "test-results/readied-bow.png" });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "The company register" }).click();
  await page.locator('[data-roster-slot="2"]').click();
  await page.locator("#create-roster-hero").click();
  await expect(page.locator("#hero-name")).toHaveValue("");
  expect(
    await page
      .locator("[data-attribute]")
      .evaluateAll((es) => es.map((e) => e.value)),
  ).toEqual(Array(6).fill("0"));
  await page.locator("#hero-name").fill("Mara of the Gate");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "The company register" }).click();
  await page.locator('[data-roster-slot="2"]').click();
  await page.locator("#create-roster-hero").click();
  await expect(page.locator("#hero-name")).toHaveValue("");
  await page.locator("#resume-recruit").click();
  await expect(page.locator("#hero-name")).toHaveValue("Mara of the Gate");
  await fillForgeHero(page);
  await page.locator('[data-step="3"]').click();
  await page.getByLabel("Headpiece", { exact: true }).selectOption("Hat02");
  await page.getByLabel("Skin colour", { exact: true }).fill("#55aa66");
  await expect(page.locator("#recruit-preview")).toHaveAttribute(
    "data-appearance",
    /Hat02/,
  );
  await page.locator('[data-step="5"]').click();
  await page.locator("#creation-shop-search").fill("ammunition");
  await page.locator('[data-add="item-ammunition-bundle"]').click();
  await expect(page.locator(".forge-pack")).toContainText("Ammunition");
  await page.locator("[data-remove]").click();
  await expect(page.locator(".forge-pack")).not.toContainText("Ammunition");
  await page.locator("#creation-shop-search").fill("weapon");
  await page.locator('[data-add="item-ordinary-melee-weapon"]').click();
  await page.locator('[data-step="6"]').click();
  await expect(page.locator("#recruit")).toBeEnabled();
  await page.screenshot({ path: "test-results/forge-creation-review.png" });
  await page.locator("#recruit").click();
  await expect(page.locator(".register-inspector")).toContainText(
    "Mara of the Gate",
  );
  await page.keyboard.press("Escape");
  console.log(
    "Blank creator, origin grants, forge purchases, appearance, equipment add/remove, repository save and equipment presentation passed.",
  );
}
