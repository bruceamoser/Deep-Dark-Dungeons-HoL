import { expect } from "@playwright/test";
import { settingsAction } from "./ui-session.mjs";
import { CREATURE_ROSTER } from "../src/core/creature-roster.mjs";

export async function verifyBestiaryPreview(page) {
  await settingsAction(page, "Bestiary");
  const guide = page.getByRole("dialog", { name: "Dungeon bestiary" });
  const canvas = guide.locator("canvas");
  await expect(canvas).toHaveAttribute("data-rendered", "true");
  const original = await canvas.elementHandle();
  for (const [id, look] of Object.entries(CREATURE_ROSTER)) {
    await guide.locator(`button[data-creature="${id}"]`).click();
    await expect(canvas).toHaveAttribute("data-creature", id);
    await expect(canvas).toHaveAttribute("data-model", look.model);
    await expect(canvas).toHaveAttribute("data-rendered", "true");
    expect(
      await original.evaluate(
        (node) => node === document.querySelector(".creature-model-canvas"),
      ),
    ).toBe(true);
    expect(
      await canvas.evaluate(
        (node) => !node.getContext("webgl2").isContextLost(),
      ),
    ).toBe(true);
    await expect(guide.locator(".creature-portrait img")).toHaveAttribute(
      "src",
      `/vendor/hol/assets/bestiary/${id}.webp`,
    );
    expect(
      await guide
        .locator(".creature-portrait img")
        .evaluate((img) => img.complete && img.naturalWidth > 0),
    ).toBe(true);
  }
  await guide.locator('button[data-creature="creature-ash-demon"]').click();
  const header = await guide.locator("header").elementHandle();
  await canvas.click();
  expect(await header.evaluate((node) => node.isConnected)).toBe(true);
  const leftBefore = await canvas.getAttribute("data-view");
  const leftBox = await canvas.boundingBox();
  await page.mouse.move(
    leftBox.x + leftBox.width * 0.4,
    leftBox.y + leftBox.height * 0.5,
  );
  await page.mouse.down();
  await page.mouse.move(
    leftBox.x + leftBox.width * 0.6,
    leftBox.y + leftBox.height * 0.5,
    { steps: 8 },
  );
  await page.mouse.up();
  expect(await header.evaluate((node) => node.isConnected)).toBe(true);
  await expect(canvas).not.toHaveAttribute("data-view", leftBefore);
  const before = await canvas.getAttribute("data-view");
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5, {
    steps: 8,
  });
  await page.mouse.up({ button: "right" });
  await expect(canvas).not.toHaveAttribute("data-view", before);
  await page.waitForTimeout(300);
  const rotated = await canvas.getAttribute("data-view");
  const scroll = await guide.locator("main").evaluate((node) => node.scrollTop);
  await page.mouse.wheel(0, -150);
  await expect(canvas).not.toHaveAttribute("data-view", rotated);
  expect(await guide.locator("main").evaluate((node) => node.scrollTop)).toBe(
    scroll,
  );
  await canvas.focus();
  const wheelView = await canvas.getAttribute("data-view");
  await page.keyboard.press("ArrowLeft");
  await expect(canvas).not.toHaveAttribute("data-view", wheelView);
  for (const pose of ["walk", "attack", "hit", "death", "idle"]) {
    await guide.getByLabel("Model animation").selectOption(pose);
    await expect(canvas).toHaveAttribute("data-pose", pose);
    await page.waitForTimeout(120);
  }
  await guide.getByRole("button", { name: "Reset view" }).click();
  await page.screenshot({ path: "test-results/bestiary-model-comparison.png" });
  await guide.getByLabel("Find a creature").fill("Werebear");
  await expect(guide.locator("button[data-creature]")).toHaveCount(1);
  await guide.locator('button[data-creature="creature-werebear"]').click();
  await expect(canvas).toHaveAttribute("data-model", "Werebear");
  await expect(guide.getByLabel("Find a creature")).toHaveValue("Werebear");
  await page.screenshot({ path: "test-results/bestiary-werebear.png" });
  const viewport = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
  }));
  await page.setViewportSize({ width: 1280, height: 720 });
  const picture = await guide.locator(".creature-portrait").boundingBox();
  const model = await canvas.boundingBox();
  expect(model.x).toBeGreaterThan(picture.x + picture.width);
  expect(
    await guide
      .locator("main")
      .evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
  ).toBe(true);
  await page.screenshot({ path: "test-results/bestiary-desktop-1280.png" });
  await page.setViewportSize(viewport);
  await page.keyboard.press("Escape");
  await expect(guide).toHaveCount(0);
  await expect
    .poll(() =>
      original.evaluate((node) => node.getContext("webgl2").isContextLost()),
    )
    .toBe(true);
  await settingsAction(page, "Bestiary");
  await expect(canvas).toHaveAttribute("data-rendered", "true");
  expect(
    await original.evaluate(
      (node) => node === document.querySelector(".creature-model-canvas"),
    ),
  ).toBe(false);
  const reopened = await canvas.elementHandle();
  await guide.getByRole("button", { name: "Close", exact: true }).click();
  await expect
    .poll(() =>
      reopened.evaluate((node) => node.getContext("webgl2").isContextLost()),
    )
    .toBe(true);
  console.log(
    "Bestiary: all 58 actual models beside matching book art; one reusable context, left/right-drag/wheel/keyboard/poses/search, 1280px layout and Escape/Close/reopen cleanup passed.",
  );
}
