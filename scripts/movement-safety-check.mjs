import { expect } from "@playwright/test";

export async function verifyMovementSafety(page) {
  const saved = await page.evaluate(() =>
    structuredClone(window.__ddd.game.snapshot()),
  );
  await page.evaluate(() => {
    const { game: g, scene: s } = window.__ddd;
    window.movementSafetyAdvance = g.advance;
    g.advance = () => {};
    g.pause();
    g.mode = "combat";
    g.selected = 0;
    g.paths.clear();
    g.pendingMovement = g.pendingDefense = g.pendingProvocation = null;
    g.woundNotices = [];
    g.busy = false;
    g.budgets = {};
    g.map = {
      ...g.map,
      tiles: {},
      obstacles: {},
      chests: [],
      zones: [],
      rooms: [],
      lights: [{ x: 6, z: 6, radius: 20 }],
      start: { x: 1, z: 1 },
      exit: { x: 13, z: 13 },
    };
    for (let x = 0; x < 15; x++)
      for (let z = 0; z < 15; z++) g.map.tiles[`${x},${z}`] = { x, z };
    g.seen = Object.fromEntries(Object.keys(g.map.tiles).map((k) => [k, true]));
    g.party.forEach((h, i) => {
      Object.assign(h, { x: i ? 2 : 5, z: 5 + i, conditions: [] });
      h.survival.status = "active";
      h.survival.hp = h.survival.maxHp;
    });
    g.enemies = [
      {
        id: "movement-foe",
        type: "creature-wolf",
        name: "Wolf",
        x: 12,
        z: 12,
        hp: 20,
        maxHp: 20,
        conditions: [],
        group: 999,
      },
    ];
    g.encounter = g.R.startEncounter(
      [
        ...g.party.map((h) => ({ id: h.id, side: "players" })),
        { id: "movement-foe", side: "opposition" },
      ],
      [6, 6, 6],
    );
    g.map.zones.push({
      id: "warning-fire",
      kind: "fire",
      cells: [{ x: 6, z: 4 }],
      source: "test",
      expires: null,
      hits: {},
    });
    g.emit("floor");
    g.emit("change");
    s.zoom = 22;
    s.resize();
    s.focusOn(g.active);
  });
  try {
    const turnsBefore = await page.evaluate(() => window.__ddd.game.party.map(h => h.survival.ownTurn));
    await page.locator('[data-select="1"]').click();
    await page.locator('[data-select="2"]').click();
    expect(await page.evaluate(() => window.__ddd.game.selected)).toBe(2);
    expect(await page.evaluate(() => window.__ddd.game.encounter.current)).toBeNull();
    expect(await page.evaluate(() => window.__ddd.game.party.map(h => h.survival.ownTurn))).toEqual(turnsBefore);
    await page.locator('[data-select="0"]').click();
    console.log("Ready hero selection remains reversible without starting turns.");
    await page.waitForFunction(
      () =>
        window.__ddd.scene.focus.distanceTo(window.__ddd.scene.targetFocus) <
        0.001,
    );
    let target = await page.evaluate(() => {
      const s = window.__ddd.scene,
        v = s.camera.position
          .clone()
          .set(6 * 2.4, 0, 4 * 2.4)
          .project(s.camera);
      return {
        x: ((v.x + 1) * innerWidth) / 2,
        y: ((1 - v.y) * innerHeight) / 2,
      };
    });
    const before = await page.evaluate(() => ({
      left: window.__ddd.game.movementLeft(),
      hp: window.__ddd.game.active.survival.hp,
    }));
    await page.evaluate(() => Object.assign(window.__ddd.game.enemies[0], { x:4,z:5 }));
    await page.mouse.move(target.x-30,target.y-30);
    await page.mouse.move(target.x,target.y);
    await expect(page.locator("#world-hint")).toContainText("Burning ground");
    await expect(page.locator("#world-hint")).toContainText("Opportunity attack: Wolf");
    const preview = await page.evaluate(() => window.__ddd.scene.pathGroup.userData.preview);
    expect(preview.route).toEqual([{x:6,z:4}]);
    expect(preview.hazards.length).toBeGreaterThan(0);
    expect(preview.opportunities.length).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.__ddd.game.encounter.current)).toBeNull();
    await page.screenshot({path:"test-results/movement-route-risks.png"});
    await page.evaluate(() => Object.assign(window.__ddd.game.enemies[0], { x:12,z:12 }));
    await page.mouse.click(target.x, target.y);
    console.log(
      await page.evaluate(({ x, y }) => {
        const { game: g, scene: s } = window.__ddd;
        const hit = s.groundAt({ clientX: x, clientY: y });
        return {
          target: [hit.x / 2.4, hit.z / 2.4],
          route: g.route({ x: 6, z: 4 }),
          paths: [...g.paths],
          warning: !!g.pendingMovement,
          toast: document.querySelector("#toast").textContent,
        };
      }, target),
    );
    await expect(
      page.getByRole("dialog", { name: "Hazardous route", exact: true }),
    ).toBeVisible();
    await expect(page.locator("#modal-root")).toContainText("Burning ground");
    expect(
      await page.evaluate(() => window.__ddd.game.encounter.current),
    ).toBeNull();
    expect(await page.evaluate(() => window.__ddd.game.movementLeft())).toBe(
      before.left,
    );
    await page.screenshot({ path: "test-results/hazardous-route.png" });
    await page.locator("#cancel-hazard-route").click();
    expect(await page.evaluate(() => window.__ddd.game.paths.size)).toBe(0);
    expect(await page.evaluate(() => window.__ddd.game.movementLeft())).toBe(
      before.left,
    );
    await page.mouse.click(target.x, target.y);
    await page.locator("#confirm-hazard-route").click();
    expect(await page.evaluate(() => window.__ddd.game.movementLeft())).toBe(
      before.left - 1,
    );
    await page.evaluate(() => {
      const g = window.__ddd.game;
      g.suspended = false;
      g.step();
      g.pause();
    });
    expect(
      await page.evaluate(() => [
        window.__ddd.game.active.x,
        window.__ddd.game.active.z,
      ]),
    ).toEqual([6, 4]);
    expect(
      await page.evaluate(() => window.__ddd.game.active.survival.hp),
    ).toBeLessThan(before.hp);
    console.log(
      "Actual diagonal combat click warns before fire; Cancel is free, confirmation pays one movement and applies normal surface damage.",
    );
    await page.evaluate(() => {
      const g = window.__ddd.game;
      Object.assign(g.active, { x: 5, z: 5, conditions: [] });
      Object.assign(g.enemies[0], { x: 5, z: 4 });
      g.map.zones = [];
      g.paths.clear();
      g.encounter = g.R.startEncounter(
        [
          ...g.party.map((h) => ({ id: h.id, side: "players" })),
          { id: g.enemies[0].id, side: "opposition" },
        ],
        [6, 6, 6],
      );
      g.beginHero();
      g.budgets[g.active.id] = g.R.spendMovement(g.budget, {
        operationId: "one-point",
        amount: g.movementLeft() - 1,
        conditions: g.restrictions(g.active),
      });
      g.emit("floor");
      g.emit("change");
      window.__ddd.scene.focusOn(g.active);
    });
    await page.waitForFunction(
      () =>
        window.__ddd.scene.focus.distanceTo(window.__ddd.scene.targetFocus) <
        0.001,
    );
    target = await page.evaluate(() => {
      const s = window.__ddd.scene,
        v = s.camera.position
          .clone()
          .set(6 * 2.4, 0, 4 * 2.4)
          .project(s.camera);
      return {
        x: ((v.x + 1) * innerWidth) / 2,
        y: ((1 - v.y) * innerHeight) / 2,
      };
    });
    await page.mouse.move(target.x - 30, target.y - 30);
    await page.mouse.move(target.x, target.y);
    await expect(page.locator("#world-hint")).toContainText("Move · 1 / 1");
    await page.mouse.click(target.x, target.y);
    expect(await page.evaluate(() => window.__ddd.game.movementLeft())).toBe(0);
    await page.evaluate(() => {
      const g = window.__ddd.game;
      g.suspended = false;
      g.step();
      g.pause();
    });
    expect(
      await page.evaluate(() => [
        window.__ddd.game.active.x,
        window.__ddd.game.active.z,
      ]),
    ).toEqual([6, 4]);
    expect(await page.locator("#modal-root > *").count()).toBe(0);
    console.log(
      "Actual combat diagonal past one side opponent works with one point left; hover reports 1 / 1.",
    );
  } finally {
    if (await page.locator("#modal-root > *").count())
      await page.keyboard.press("Escape");
    await page.evaluate((saved) => {
      const g = window.__ddd.game;
      g.advance = window.movementSafetyAdvance;
      delete window.movementSafetyAdvance;
      g.load(saved, { resume: false });
      g.emit("floor");
      g.emit("change");
    }, saved);
  }
}
