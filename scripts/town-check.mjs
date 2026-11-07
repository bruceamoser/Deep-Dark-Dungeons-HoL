import { chromium, expect } from "@playwright/test";
import fs from "node:fs/promises";
await fs.mkdir("test-results", { recursive: true });
const b = await chromium.launch({
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
try {
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 } }),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto("http://127.0.0.1:5198");
  await p.waitForFunction(() => window.__ddd?.town.active, null, {
    timeout: 45000,
  });
  await p.waitForTimeout(800);
  await p.screenshot({ path: "test-results/greyhaven-town.png" });
  const before = await p.evaluate(() =>
    window.__ddd.game.party.map((h) => ({
      x: h.x,
      z: h.z,
      hp: h.survival.hp,
      grit: h.survival.gritAvailable,
    })),
  );
  await p
    .getByRole("button", { name: "Visit Market Square", exact: true })
    .click();
  expect(await p.locator(".market-window").count()).toBe(0);
  await expect(p.locator(".market-window")).toBeVisible({ timeout: 12000 });
  await p.keyboard.press("Escape");
  await p.keyboard.press("r");
  await p.keyboard.press("Escape");
  expect(await p.evaluate(() => window.__ddd.town.navigator.destination)).toBe(
    null,
  );
  await p.keyboard.press("w");
  await p.keyboard.press("v");
  await expect(p.locator(".character-window")).toBeVisible({ timeout: 12000 });
  await expect(p.locator('[data-tab="journey"]')).toHaveClass(
    /active|selected|chosen/,
  );
  await p.keyboard.press("Escape");
  const after = await p.evaluate(() =>
    window.__ddd.game.party.map((h) => ({
      x: h.x,
      z: h.z,
      hp: h.survival.hp,
      grit: h.survival.gritAvailable,
    })),
  );
  expect(after).toEqual(before);
  await p.getByRole("button", { name: "Save", exact: true }).click();
  await p.reload();
  await p.waitForFunction(() => window.__ddd?.town.active, null, {
    timeout: 45000,
  });
  expect(
    await p.evaluate(() =>
      window.__ddd.game.party.map((h) => ({
        x: h.x,
        z: h.z,
        hp: h.survival.hp,
        grit: h.survival.gritAvailable,
      })),
    ),
  ).toEqual(before);
  await p.locator('[data-hero="0"]').click();
  await p.locator("#sheet-respec").click();
  expect(await p.locator("#cancel-respec").count()).toBe(0);
  await expect(p.locator("#cancel-respec")).toBeVisible({ timeout: 12000 });
  expect(await p.evaluate(() => window.__ddd.town.currentService)).toBe(
    "training",
  );
  await p.locator("#cancel-respec").click();
  await p.keyboard.press("Escape");
  const buildingPoint = await p.evaluate(() => {
    const town = window.__ddd.town;
    const point = town.buildings.get("roster").position.clone();
    point.y = 2.2;
    point.project(town.camera);
    const rect = town.canvas.getBoundingClientRect();
    return {
      x: rect.left + ((point.x + 1) * rect.width) / 2,
      y: rect.top + ((1 - point.y) * rect.height) / 2,
    };
  });
  await p.mouse.click(buildingPoint.x, buildingPoint.y);
  await expect(p.locator(".register-window")).toBeVisible({ timeout: 12000 });
  await p.keyboard.press("Escape");
  await p.evaluate(() => {
    window.__ddd.town.navigate("camp");
    document.querySelector('[data-action="runs"]').click();
  });
  const paused = await p.evaluate(() => ({
    ...window.__ddd.town.navigator.position,
  }));
  await p.waitForTimeout(400);
  expect(await p.evaluate(() => window.__ddd.town.navigator.position)).toEqual(
    paused,
  );
  await p.locator("#resume-run").click();
  await p.keyboard.press("Escape");
  await p.setViewportSize({ width: 1100, height: 720 });
  await p.waitForTimeout(400);
  await p.screenshot({ path: "test-results/greyhaven-town-compact.png" });
  await p.keyboard.press("d");
  await p.waitForFunction(
    () => window.__ddd.game.mode === "exploration",
    null,
    { timeout: 12000 },
  );
  expect(await p.evaluate(() => window.__ddd.town.active)).toBe(false);
  await expect(p.locator("#world")).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    "Greyhaven building arrival, hotkeys, cancel/redirect, infirmary, preserved dungeon state, save/reload and gate passed.",
  );
} finally {
  await b.close();
}
