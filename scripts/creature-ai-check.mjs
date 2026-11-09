import { expect } from "@playwright/test";
import { settingsAction } from "./ui-session.mjs";

export async function verifyCreatureAI(page) {
  const saved = await page.evaluate(() =>
    structuredClone(window.__ddd.game.snapshot()),
  );
  await page.evaluate(() => {
    const g = window.__ddd.game;
    window.aiCheckOriginals = { advance: g.advance, dice: g.dice };
    g.advance = () => {};
    g.dice = (n = 3) => Array(n).fill(3);
    window.aiCheckScenario = (kind) => {
      g.pause();
      g.mode = "combat";
      g.selected = 0;
      g.paths.clear();
      g.busy = false;
      g.pendingDefense = null;
      g.pendingProvocation = null;
      g.woundNotices = [];
      g.budgets = {};
      g.map = {
        ...g.map,
        tiles: {},
        obstacles: {},
        rooms: [],
        chests: [],
        zones: [],
        lights: [{ x: 6, z: 6, radius: 12 }],
        start: { x: 1, z: 1 },
        exit: { x: 14, z: 14 },
        waterSources: [],
      };
      for (let x = 0; x < 16; x++)
        for (let z = 0; z < 16; z++) g.map.tiles[`${x},${z}`] = { x, z };
      g.seen = Object.fromEntries(
        Object.keys(g.map.tiles).map((k) => [k, true]),
      );
      g.party.forEach((h, i) => {
        Object.assign(h, {
          x: 11 + i,
          z: 12,
          conditions: [],
          powerEffects: [],
          buffs: {},
          tactics: [],
        });
        h.survival.hp = h.survival.maxHp;
        h.survival.status = "active";
        for (const item of h.preview.inventory.items) item.held = false;
      });
      const make = (type, id, x, z) => {
        const c = g.C.creatures.creatures.find(
          (c) => c.id === `creature-${type}`,
        );
        return {
          id,
          type: c.id,
          name: c.name,
          x,
          z,
          group: 999,
          hp: c.hp.max,
          maxHp: c.hp.max,
          stability: c.defenses.stability,
          conditions: [],
          ammunition: 6,
          aiState: {},
          powerTurn: 0,
        };
      };
      let enemies;
      if (kind === "pack") {
        Object.assign(g.party[0], { x: 5, z: 5 });
        Object.assign(g.party[1], { x: 8, z: 5 });
        enemies = [
          make("wolf", "ai-actor", 4, 5),
          make("wolf", "ai-ally", 9, 5),
        ];
        enemies[1].aiState.target = g.party[1].id;
      } else if (kind === "archer") {
        Object.assign(g.party[0], { x: 5, z: 5 });
        enemies = [make("bone-archer", "ai-actor", 4, 5)];
      } else if (kind === "support") {
        Object.assign(g.party[0], { x: 8, z: 5 });
        enemies = [
          make("orc-warcaller", "ai-actor", 4, 5),
          make("orc-shieldbreaker", "ai-ally", 5, 6),
        ];
        enemies[1].conditions = [
          {
            id: "qa-dazed",
            key: "dazed",
            rating: 2,
            source: "qa",
            persistence: "temporary",
            order: 0,
          },
        ];
      } else {
        Object.assign(g.party[0], { x: 5, z: 5 });
        enemies = [make("crypt-ghoul", "ai-actor", 4, 5)];
      }
      g.enemies = enemies;
      g.encounter = g.R.startEncounter(
        [
          ...g.party.map((h) => ({ id: h.id, side: "players" })),
          ...enemies.map((e) => ({ id: e.id, side: "opposition" })),
        ],
        [1, 1, 1],
      );
      g.emit("floor");
      g.emit("change");
      window.__ddd.scene.focusOn(g.party[0]);
      g.enemyTurn();
      return {
        target: enemies[0].aiState.target,
        action: enemies[0].aiState.action,
        x: enemies[0].x,
        z: enemies[0].z,
      };
    };
  });
  try {
    const pack = await page.evaluate(() => window.aiCheckScenario("pack"));
    expect(pack.target).toBe(
      await page.evaluate(() => window.__ddd.game.party[1].id),
    );
    expect(pack.action).toBe("Pinning bite");
    expect(
      await page.evaluate(
        () =>
          window.__ddd.game.R.conditionSummary(
            window.__ddd.game.party[1].conditions,
          ).grappled.rating,
      ),
    ).toBe(1);
    await page.waitForFunction(
      () => !window.__ddd.scene.entities.get("ai-actor")?.travel?.length,
    );
    await page.screenshot({ path: "test-results/creature-ai-pack.png" });
    await page.evaluate(() => {
      const g = window.__ddd.game;
      g.selected = 1;
      g.beginHero(["main", "maneuver"]);
      g.emit("change");
    });
    await page.locator('[data-action="actions"]').click();
    await expect(page.locator('[data-card="power-break-free"]')).toBeEnabled();
    await page.locator('[data-card="power-break-free"]').click();
    await page.locator('[data-action="confirm-self"]').click();
    expect(
      await page.evaluate(
        () =>
          window.__ddd.game.R.conditionSummary(
            window.__ddd.game.party[1].conditions,
          ).grappled.rating,
      ),
    ).toBe(0);
    expect(
      await page.evaluate(() => window.__ddd.game.budget.remaining.main),
    ).toBe(0);

    const archer = await page.evaluate(() => window.aiCheckScenario("archer"));
    expect(archer.action).toBe("Dusty arrow");
    expect(
      Math.max(Math.abs(archer.x - 5), Math.abs(archer.z - 5)),
    ).toBeGreaterThanOrEqual(3);
    await page.waitForFunction(
      () => !window.__ddd.scene.entities.get("ai-actor")?.travel?.length,
    );
    await page.screenshot({ path: "test-results/creature-ai-archer.png" });

    await page.evaluate(() => window.aiCheckScenario("support"));
    expect(
      await page.evaluate(
        () =>
          window.__ddd.game.R.conditionSummary(
            window.__ddd.game.enemies[1].conditions,
          ).dazed.rating,
      ),
    ).toBe(1);
    await page.screenshot({ path: "test-results/creature-ai-support.png" });
    const ghoul = await page.evaluate(() => window.aiCheckScenario("ghoul"));
    expect(ghoul.action).toBe("Grave touch");
    const next = await page.evaluate(() => {
      const g = window.__ddd.game;
      g.encounter = g.R.startEncounter(
        [
          ...g.party.map((h) => ({ id: h.id, side: "players" })),
          { id: "ai-actor", side: "opposition" },
        ],
        [1, 1, 1],
      );
      g.enemyTurn();
      return g.enemies[0].aiState.action;
    });
    expect(next).toBe("Raking claws");

    await page.evaluate(() => {
      const { game: g } = window.__ddd;
      g.selected = 0;
      g.beginHero();
      const h = g.active;
      g.createSurface("difficult", [{ x: h.x, z: h.z - 1 }], g.enemies[0], 10);
      g.map.zones.at(-1).caltrops = true;
      g.emit("change");
    });
    await page.locator('[data-action="actions"]').click();
    await expect(
      page.locator('[data-card="power-clear-caltrops"]'),
    ).toBeEnabled();
    await page.locator('[data-card="power-clear-caltrops"]').click();
    await page.waitForFunction(
      () =>
        window.__ddd.scene.focus.distanceTo(window.__ddd.scene.targetFocus) <
        0.02,
    );
    const cell = await page.evaluate(() => {
      const { game: g, scene: s } = window.__ddd;
      const p = s.camera.position
        .clone()
        .set(g.active.x * 2.4, 0, (g.active.z - 1) * 2.4)
        .project(s.camera);
      return {
        x: ((p.x + 1) * innerWidth) / 2,
        y: ((1 - p.y) * innerHeight) / 2,
      };
    });
    await page.mouse.click(cell.x, cell.y);
    await page.waitForFunction(
      () => !window.__ddd.game.map.zones.some((z) => z.caltrops),
    );
    expect(
      await page.evaluate(() => window.__ddd.game.budget.remaining.main),
    ).toBe(0);
    await settingsAction(page, "Bestiary");
    await page.locator("#creature-search").fill("Wolf");
    await page.locator('[data-creature="creature-wolf"]').click();
    await expect(
      page.getByRole("dialog", { name: "Dungeon bestiary" }),
    ).toContainText("Surrounds a shared quarry");
    await expect(
      page.getByRole("dialog", { name: "Dungeon bestiary" }),
    ).toContainText("Pinning bite");
    await page.keyboard.press("Escape");
    console.log(
      "Creature AI: coordinated pack target, paid Break free and caltrop clearing, archer spacing/shot, ally support, third attack cooldown and full bestiary actions passed.",
    );
  } catch (error) {
    await page.screenshot({ path: "test-results/creature-ai-failure.png" });
    console.error(
      await page.evaluate(() => ({
        action: window.__ddd.selectedAction,
        log: window.__ddd.game.log.slice(-5),
        zones: window.__ddd.game.map.zones,
        toast: document.querySelector("#toast")?.textContent,
      })),
    );
    throw error;
  } finally {
    if (
      await page
        .locator("#modal-root .veil, [data-action='cancel-target']")
        .count()
    )
      await page.keyboard.press("Escape");
    await page.evaluate((saved) => {
      const g = window.__ddd.game;
      g.advance = window.aiCheckOriginals.advance;
      g.dice = window.aiCheckOriginals.dice;
      delete window.aiCheckOriginals;
      delete window.aiCheckScenario;
      g.load(saved, { resume: false });
      g.emit("floor");
      g.emit("change");
    }, saved);
  }
}
