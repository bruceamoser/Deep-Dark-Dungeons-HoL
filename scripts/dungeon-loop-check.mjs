import { settingsAction, waitForGame } from "./ui-session.mjs";
import { chromium, expect } from "@playwright/test";
import { magicItem, recallScroll } from "../src/core/treasure.mjs";
export async function verifyDungeonLoop(page) {
  await page.evaluate(() => {
    const g = window.__ddd.game;
    g.mode = "town";
    g.busy = false;
    g.encounter = null;
    g.pendingDefense = null;
    g.woundNotices = [];
    g.paths.clear();
    g.campaign.bank = 2500;
    g.campaign.returnPassage = null;
    g.selected = 0;
    g.party.forEach((h) => {
      h.survival.status = "active";
      h.survival.hp = h.survival.maxHp;
      h.conditions = [];
      h.wounds = [];
    });
    g.emit("change");
  });
  await page.locator('[data-action="shop"]').click();
  await expect(page.locator("[data-merchant]")).toHaveCount(6);
  await page.locator('[data-merchant="temple"]').click();
  await page.locator('[data-buy="temple-recall"]').click();
  await page.locator('[data-merchant="arcana"]').click();
  await page.screenshot({ path: "test-results/market-magic.png" });
  await page.locator(".close").click();
  await settingsAction(page, "Bestiary");
  await page.locator("#creature-search").fill("wolf");
  await expect(page.locator('[data-creature="creature-wolf"]')).toBeVisible();
  await page.locator('[data-creature="creature-wolf"]').click();
  await expect(page.locator(".bestiary-body main")).toContainText(
    "Snapping jaws",
  );
  await page.screenshot({ path: "test-results/book-bestiary.png" });
  await page.locator(".close").click();
  const items = [
    magicItem(4400, 1, { base: "blade", affixes: ["ember"] }),
    magicItem(4401, 1, { base: "ring", affixes: ["might"] }),
    magicItem(4402, 1, { base: "boots", affixes: ["frostward"] }),
    recallScroll(4403),
  ];
  await page.evaluate((items) => {
    const { game: g, scene: s } = window.__ddd;
    g.campaign.depth = 5;
    g.newFloor();
    g.mode = "exploration";
    g.busy = false;
    g.encounter = null;
    g.selected = 0;
    const { x, z } = g.map.start;
    g.party.forEach((h, i) =>
      Object.assign(h, { x: x - 1, z: z - 1 + i, selected: i === 0 }),
    );
    g.map.chests = [
      { id: "treasure-test", x: x + 1, z, coins: 17, opened: false, items },
    ];
    g.enemies = g.enemies.map((e) => ({ ...e, x: e.x + 30, z: e.z + 30 }));
    g.emit("floor");
    s.syncInteractions(g.worldInteractions());
    s.angle = Math.PI / 4;
    s.zoom = 17;
    s.resize();
    s.focusOn({ x, z });
    g.emit("change");
  }, items);
  // Move one companion next to the coffer and click its actual rendered mesh.
  await page.evaluate(() => {
    const g = window.__ddd.game,
      c = g.map.chests[0];
    g.active.x = c.x - 1;
    g.active.z = c.z;
    g.emit("party");
  });
  await page.waitForTimeout(600);
  const point = await page.evaluate(() => {
    const s = window.__ddd.scene,
      obj = s.interactables.get("coffer:treasure-test").obj,
      p = obj.position.clone();
    p.y += 0.4;
    p.project(s.camera);
    return {
      x: ((p.x + 1) * innerWidth) / 2,
      y: ((1 - p.y) * innerHeight) / 2,
    };
  });
  await page.mouse.click(point.x, point.y);
  await expect(
    page.getByRole("dialog", { name: "Recovered treasures" }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/treasure-discipline-gates.png" });
  await page.locator(`[data-take="${items[0].instanceId}"]`).click();
  await page.locator(`[data-take="${items[1].instanceId}"]`).click();
  await page.locator(`[data-take="${items[2].instanceId}"]`).click();
  await page.locator(`[data-take="${items[3].instanceId}"]`).click();
  await page.locator("[data-finish]").click();
  await page.locator('[data-action="sheet"]').click();
  await expect(page.locator(".gear-slot")).toHaveCount(11);
  await page.locator('[data-filter="relics"]').click();
  await page.locator(`[data-item="${items[0].instanceId}"]`).click();
  await expect(page.locator(".item-inspector")).toContainText("DORMANT");
  await page.locator('[data-gear="ready"]').click();
  await expect(page.locator("#hero-preview")).toHaveAttribute(
    "data-weapon",
    "melee",
  );
  await page.locator(`[data-item="${items[1].instanceId}"]`).click();
  await page.locator('[data-gear="wear"]').click();
  await page.screenshot({ path: "test-results/character-relic-slots.png" });
  await page.locator(".close").click();
  // Feedback and condition layers use the committed game state, and clear when it clears.
  await page.evaluate(() => {
    const g = window.__ddd.game;
    g.active.conditions = [];
    g.emit("change");
    g.active.survival.hp -= 4;
    g.active.conditions.push(
      {
        id: "visual-burn",
        key: "burning",
        rating: 2,
        persistence: "temporary",
        source: "native-test",
      },
      {
        id: "visual-dazed",
        key: "dazed",
        rating: 1,
        persistence: "temporary",
        source: "native-test",
      },
    );
    g.emit("change");
  });
  await expect(page.locator(".combat-float.damage")).toContainText("−4");
  await page.waitForFunction(() =>
    window.__ddd.scene.entities
      .get(window.__ddd.game.active.id)
      .statusVisuals.active.has("burning"),
  );
  await page.screenshot({ path: "test-results/damage-and-conditions.png" });
  await page.evaluate(() => {
    const g = window.__ddd.game;
    g.active.survival.hp += 2;
    g.active.conditions = [];
    g.emit("change");
  });
  await expect(page.locator(".combat-float.healing")).toContainText("+2");
  await page.waitForFunction(
    () =>
      window.__ddd.scene.entities.get(window.__ddd.game.active.id).statusVisuals
        .active.size === 0,
  );
  // Scroll opens town and returns to the exact saved floor after a real reload.
  await page.evaluate(() => {
    const g = window.__ddd.game;
    g.active.preview.inventory.items
      .filter((i) => i.held)
      .forEach((i) => g.equip(g.selected, i.instanceId, "stow"));
    g.enemies[0].hp = 1;
    window.recallExpected = {
      depth: g.campaign.depth,
      enemy: g.enemies[0].id,
      hp: g.active.survival.hp,
    };
  });
  await page.locator('[data-action="sheet"]').click();
  await page.locator("#pack-search").fill("Scroll of Return");
  await page.locator(`[data-item="${items[3].instanceId}"]`).click();
  await page.locator("#read-recall").click();
  await expect(page.locator('[data-action="descend"]')).toContainText(
    "Return to depth 5",
  );
  await settingsAction(page, "Save");
  await expect(page.locator("#toast")).toContainText("saved");
  await page.reload();
  await waitForGame(page);
  await expect(page.locator('[data-action="descend"]')).toContainText(
    "Return to depth 5",
  );
  await page.locator('[data-action="descend"]').click();
  await page.waitForFunction(
    () => window.__ddd.game.mode === "exploration",
    null,
    { timeout: 15000 },
  );
  expect(
    await page.evaluate(() => {
      const g = window.__ddd.game;
      return {
        depth: g.campaign.depth,
        hp: g.enemies[0].hp,
        items: g.map.chests[0].items.length,
        opened: g.map.chests[0].opened,
        mode: g.mode,
      };
    }),
  ).toEqual({ depth: 5, hp: 1, items: 0, opened: true, mode: "exploration" });
  console.log(
    "Dungeon loop: six merchants, book bestiary, gated loot, eleven gear slots, damage/healing text, condition VFX, and persistent two-way recall passed.",
  );
}
if (import.meta.url === new URL(process.argv[1], "file:").href) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto("http://127.0.0.1:5198");
    await waitForGame(page);
    await verifyDungeonLoop(page);
    expect(errors).toEqual([]);
  } catch (e) {
    await page.screenshot({ path: "test-results/dungeon-loop-failure.png" });
    throw e;
  } finally {
    await browser.close();
  }
}
