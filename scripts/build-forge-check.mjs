import { settingsAction } from "./ui-session.mjs";
import { expect } from "@playwright/test";
import { magicItem } from "../src/core/treasure.mjs";
export async function verifyBuildForge(page) {
  const saved = await page.evaluate(() =>
    structuredClone(window.__ddd.game.snapshot()),
  );
  try {
    await page.locator('[data-hero="0"]').click();
    await page.locator('[data-tab="equipment"]').click();
    const original = await page.evaluate(
      () =>
        window.__ddd.game.party[0].preview.inventory.items.find(
          (i) => i.catalogId === "item-food-bundle",
        ).instanceId,
    );
    await page.locator(`[data-item="${original}"]`).click();
    await page.locator("#transfer-to").selectOption("1");
    await page.locator("#transfer-item").click();
    const moved = await page.evaluate(
      () =>
        window.__ddd.game.party[1].treasure.find(
          (i) => i.catalogId === "item-food-bundle",
        ).instanceId,
    );
    expect(
      await page.evaluate(
        (id) =>
          window.__ddd.game.party[0].preview.inventory.items.some(
            (i) => i.instanceId === id,
          ),
        original,
      ),
    ).toBe(false);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "The Depths" }).click();
    await page.waitForFunction(
      () => window.__ddd.game.mode === "exploration",
      null,
      { timeout: 15000 },
    );
    await page.evaluate(() => {
      const g = window.__ddd.game;
      g.pause();
      g.enemies = [];
      g.paths.clear();
      g.mode = "exploration";
      g.encounter = null;
      g.selected = 1;
      g.emit("floor");
      g.emit("change");
    });
    await page.locator('[data-action="sheet"]').click();
    await page.locator(`[data-item="${moved}"]`).click();
    await page.locator("#drop-item").click();
    expect(
      await page.evaluate(
        () => window.__ddd.game.map.chests.filter((c) => c.dropped).length,
      ),
    ).toBe(1);
    expect(
      await page.evaluate(
        (id) =>
          window.__ddd.game.party[1].preview.inventory.items.some(
            (i) => i.instanceId === id,
          ),
        moved,
      ),
    ).toBe(false);
    await page.keyboard.press("Escape");
    const pile = await page.evaluate(() => {
      const { game: g, scene: s } = window.__ddd,
        c = g.map.chests.find((c) => c.dropped);
      s.focusOn(c);
      s.zoom = 14;
      s.resize();
      return c.id;
    });
    await page.waitForTimeout(600);
    const point = await page.evaluate((id) => {
      const s = window.__ddd.scene,
        obj = s.interactables.get(`coffer:${id}`).obj,
        p = obj.position.clone();
      p.y += 0.4;
      p.project(s.camera);
      return {
        x: ((p.x + 1) * innerWidth) / 2,
        y: ((1 - p.y) * innerHeight) / 2,
      };
    }, pile);
    await page.mouse.click(point.x, point.y);
    await expect(
      page.getByRole("dialog", { name: "Recovered treasures" }),
    ).toBeVisible();
    await page.locator(`[data-take="${moved}"]`).click();
    await page.locator("[data-finish]").click();
    expect(
      await page.evaluate(
        (id) =>
          window.__ddd.game.active.preview.inventory.items.some(
            (i) => i.instanceId === id,
          ),
        moved,
      ),
    ).toBe(true);
    const relic = magicItem(50500, 5, { relic: "thunderwake" });
    await page.evaluate((relic) => {
      const { game: g, scene: s } = window.__ddd;
      g.pause();
      g.selected = 0;
      const h = g.active;
      h.treasure ??= [];
      h.treasure.push(relic);
      g.refreshHero(h);
      for (const i of [...h.preview.inventory.items].filter((i) => i.held))
        g.equip(0, i.instanceId, "stow");
      g.equip(0, relic.instanceId, "ready");
      h.preview.state.abilities.push("power-vanish");
      h.favorites = ["power-vanish"];
      g.enemies = [
        {
          id: "watcher",
          name: "Watcher",
          x: h.x + 4,
          z: h.z,
          hp: 100,
          maxHp: 100,
          conditions: [],
          group: 100,
        },
      ];
      g.mode = "combat";
      g.encounter = g.R.startEncounter(
        [
          ...g.party.map((h) => ({ id: h.id, side: "players" })),
          { id: "watcher", side: "opposition" },
        ],
        [6, 6, 6],
      );
      g.beginHero();
      s.resetEntities(g.party, g.enemies);
      s.focusOn(h);
      g.emit("change");
    }, relic);
    await page.locator('[data-hot-action="power-vanish"]').click();
    await page
      .getByRole("button", { name: "Use on self", exact: false })
      .click();
    await page.waitForFunction(
      () => window.__ddd.scene.entities.get("hero-0").model.userData.concealed,
    );
    const visual = await page.evaluate((id) => {
      const { model, statusVisuals } =
        window.__ddd.scene.entities.get("hero-0");
      let opacity = 0;
      model.traverse((o) => {
        if (o.isMesh && o.visible)
          opacity = Math.max(
            opacity,
            Array.isArray(o.material)
              ? o.material[0].opacity
              : o.material.opacity,
          );
      });
      return {
        opacity,
        hidden: statusVisuals.active.has("hidden"),
        magic: model.userData.magicItems.includes(id),
        runes: model.getObjectByName(`Enchantment runes ${id}`)?.children
          .length,
      };
    }, relic.instanceId);
    expect(visual).toMatchObject({ hidden: true, magic: true, runes: 3 });
    expect(visual.opacity).toBeLessThan(0.5);
    await page.locator('[data-action="sheet"]').click();
    await expect(page.locator(".concealment-badge")).toContainText("CONCEALED");
    await page.screenshot({ path: "test-results/vanish-and-relic-0.5.png" });
    await page.keyboard.press("Escape");
    console.log(
      "Starting-gear transfer, world drops/recovery, Vanish and relic runes passed in native desktop.",
    );
  } catch (e) {
    console.error("Build forge interaction failure:", e);
    await page.screenshot({ path: "test-results/build-forge-failure.png" });
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
    await settingsAction(page, "Save");
  }
}
