import { enterGame } from "./ui-session.mjs";
import { chromium, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";
export async function verifyTorchModels(page) {
  const saved = await page.evaluate(() =>
    structuredClone(window.__ddd.game.snapshot()),
  );
  try {
    const uuid = await page.evaluate(() => {
      const { game: g, scene: s } = window.__ddd;
      g.pause();
      g.mode = "exploration";
      g.enemies = [];
      g.map.lights = [];
      g.selected = 0;
      const h = g.party[0];
      h.preview.inventory.items.forEach((i) => (i.held = false));
      g.powerBuff(h, h, { hidden: true }, 10, "torch-model-check");
      h.torch.held = true;
      g.syncTorches();
      s.resetEntities(g.party, []);
      s.focusOn(h);
      g.emit("change");
      return s.entities.get(h.id).model.uuid;
    });
    for (const lit of [true, false, true, false]) {
      await page.evaluate((lit) => {
        const { game: g } = window.__ddd,
          h = g.party[0];
        g.map.lights = lit ? [] : [{ x: h.x, z: h.z, radius: 8 }];
        g.syncTorches();
        g.emit("change");
      }, lit);
      await page.waitForFunction(
        ({ lit, uuid }) => {
          const { game: g, scene: s } = window.__ddd,
            m = s.entities.get(g.party[0].id).model;
          return (
            g.party[0].torch.lit === lit &&
            m.uuid === uuid &&
            m.userData.torchLit === lit &&
            m.getObjectByName("Authored lit torch").visible === lit &&
            m.getObjectByName("Authored unlit torch").visible !== lit
          );
        },
        { lit, uuid },
        { timeout: 10000 },
      );
      const max = await page.evaluate(() => {
        const m = window.__ddd.scene.entities.get("hero-0").model,
          opacities = [];
        m.getObjectByName("Readied torch").traverse((o) => {
          if (o.isMesh)
            for (const mat of Array.isArray(o.material)
              ? o.material
              : [o.material])
              opacities.push(mat.opacity);
        });
        return Math.max(...opacities);
      });
      expect(max).toBeLessThanOrEqual(0.38);
    }
    await page.screenshot({ path: "test-results/live-authored-torch.png" });
    for (const melee of [false, true]) {
      await page.evaluate((melee) => {
        const { game: g, scene: s } = window.__ddd;
        const h = g.party[0];
        h.preview.inventory.items.forEach((i) => {
          i.held = melee && i.catalogId === "item-ordinary-melee-weapon";
        });
        s.resetEntities(g.party, []);
      }, melee);
      // The scene fades in its idle action over animation time. Software
      // rendering can advance only a fraction of that time in 250ms wall time.
      await page.waitForFunction(
        () => {
          const action = window.__ddd.scene.entities.get("hero-0").action;
          return (
            action?.getClip().name === "Idle" &&
            action.time >= 0.2 &&
            action.getEffectiveWeight() > 0.99
          );
        },
        null,
        { timeout: 30000 },
      );
      const upward = await page.evaluate(() => {
        const m = window.__ddd.scene.entities.get("hero-0").model;
        const torch = m.getObjectByName("Readied torch");
        m.updateMatrixWorld(true);
        const p = m.position.clone();
        const tip = torch.localToWorld(p.clone().set(0, 0.65, 0));
        const grip = torch.localToWorld(p.clone().set(0, 0, 0));
        return tip.sub(grip).normalize().y;
      });
      expect(
        upward,
        `Torch points upward in ${melee ? "left" : "right"} hand`,
      ).toBeGreaterThan(0.8);
    }
    await page.locator('[data-action="sheet"]').click();
    await page.locator('[data-tab="appearance"]').click();
    await expect(page.getByLabel("Headpiece", { exact: true })).toBeEnabled();
    await page.getByLabel("Headpiece", { exact: true }).selectOption("none");
    await page.getByLabel("Skin colour", { exact: true }).fill("#559966");
    expect(
      await page.evaluate(
        () => window.__ddd.game.party[0].draft.appearance.skin,
      ),
    ).toBe("#559966");
    await page.screenshot({
      path: "test-results/dungeon-appearance-torch.png",
    });
    await page.keyboard.press("Escape");
    console.log(
      "Torch lit/unlit transitions, concealment, upright grips in both hands and dungeon appearance editing passed.",
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
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const b = await chromium.launch({
    headless: true,
    args: ["--enable-unsafe-swiftshader"],
  });
  try {
    const p = await b.newPage({ viewport: { width: 1600, height: 1000 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto("http://127.0.0.1:5198");
    await p.waitForFunction(() => window.__ddd, null, { timeout: 45000 });
    await enterGame(p);
    await verifyTorchModels(p);
    expect(errors).toEqual([]);
  } finally {
    await b.close();
  }
}
