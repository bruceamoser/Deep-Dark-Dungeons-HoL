import { chromium, expect } from "@playwright/test";
import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
export async function verifyTownNavigation(p) {
  const saved = await p.evaluate(() =>
      structuredClone(window.__ddd.game.snapshot()),
    ),
    viewport = p.viewportSize(),
    errors = [];
  const onError = (e) => errors.push(e.message);
  p.on("pageerror", onError);
  try {
    await p.setViewportSize({ width: 1600, height: 1000 });
    await p.waitForFunction(() => window.__ddd?.town.active, null, {
      timeout: 45000,
    });
    await p.waitForTimeout(800);
    const roads = await p.evaluate(() => {
      const mesh =
        window.__ddd.town.scene.getObjectByName("Winding dirt paths");
      const colors = mesh?.geometry.getAttribute("color");
      return {
        exists: !!mesh,
        alphaChannels: colors?.itemSize,
        softEdges:
          colors &&
          Array.from(colors.array).some(
            (value, i) => i % 4 === 3 && value > 0 && value < 1,
          ),
      };
    });
    expect(roads).toEqual({ exists: true, alphaChannels: 4, softEdges: true });
    const canvas = await p.locator("#town-world").boundingBox();
    const cameraBefore = await p.evaluate(() => ({
      angle: window.__ddd.town.angle,
      quaternion: window.__ddd.town.camera.quaternion.toArray(),
    }));
    await p.mouse.move(
      canvas.x + canvas.width * 0.6,
      canvas.y + canvas.height * 0.6,
    );
    await p.mouse.down({ button: "middle" });
    await p.mouse.move(
      canvas.x + canvas.width * 0.6 + 75,
      canvas.y + canvas.height * 0.6,
      { steps: 8 },
    );
    await p.mouse.up({ button: "middle" });
    const cameraAfter = await p.evaluate(() => ({
      angle: window.__ddd.town.angle,
      quaternion: window.__ddd.town.camera.quaternion.toArray(),
    }));
    expect(Math.abs(cameraAfter.angle - cameraBefore.angle)).toBeGreaterThan(
      0.4,
    );
    expect(cameraAfter.quaternion).not.toEqual(cameraBefore.quaternion);
    await p.evaluate((angle) => {
      window.__ddd.town.angle = angle;
      window.__ddd.town.resize();
    }, cameraBefore.angle);
    await p.screenshot({ path: "test-results/greyhaven-town.png" });
    const before = await p.evaluate(() =>
      window.__ddd.game.party.map((h) => ({
        x: h.x,
        z: h.z,
        hp: h.survival.hp,
        grit: h.survival.gritAvailable,
      })),
    );
    const marketStart = await p.evaluate(() => {
      document.querySelector('[data-town-place="shop"]').click();
      return {
        immediate: !!document.querySelector(".market-window"),
        destination: window.__ddd.town.navigator.destination?.id,
      };
    });
    expect(marketStart).toEqual({ immediate: false, destination: "shop" });
    expect(
      await p.evaluate(() => window.__ddd.town.navigator.path.length),
    ).toBeGreaterThan(10);
    await expect(p.locator(".market-window")).toBeVisible({ timeout: 12000 });
    await p.keyboard.press("Escape");
    await p.keyboard.press("r");
    await p.keyboard.press("Escape");
    expect(
      await p.evaluate(() => window.__ddd.town.navigator.destination),
    ).toBe(null);
    await p.keyboard.press("w");
    await p.keyboard.press("v");
    await expect(p.locator(".character-window")).toBeVisible({
      timeout: 12000,
    });
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
    const respecStart = await p.evaluate(() => {
      document.querySelector("#sheet-respec").click();
      return {
        immediate: !!document.querySelector("#cancel-respec"),
        destination: window.__ddd.town.navigator.destination?.id,
      };
    });
    expect(respecStart).toEqual({ immediate: false, destination: "training" });
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
    expect(
      await p.evaluate(() => window.__ddd.town.navigator.position),
    ).toEqual(paused);
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
      "Winding dirt, feathered edges, middle-drag camera, building arrival, hotkeys, cancel/redirect, infirmary, preserved dungeon state, save/reload and gate passed.",
    );
  } finally {
    p.off("pageerror", onError);
    await p.evaluate((s) => {
      const g = window.__ddd.game;
      g.load(s);
      g.resume();
      g.emit("change");
    }, saved);
    if (viewport) await p.setViewportSize(viewport);
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await fs.mkdir("test-results", { recursive: true });
  const b = await chromium.launch({
    headless: true,
    args: ["--enable-unsafe-swiftshader"],
  });
  try {
    const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
    await p.goto("http://127.0.0.1:5198");
    await p.waitForFunction(() => window.__ddd);
    await verifyTownNavigation(p);
  } finally {
    await b.close();
  }
}
