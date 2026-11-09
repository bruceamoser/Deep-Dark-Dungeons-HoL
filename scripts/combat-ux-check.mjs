import { enterGame } from "./ui-session.mjs";
import { chromium, expect } from "@playwright/test";

export async function verifyCombatUX(page) {
  await page.evaluate(() => {
    const { game: g, scene: s } = window.__ddd;
    g.paths.clear();
    g.busy = false;
    g.pendingDefense = null;
    g.woundNotices = [];
    g.selected = 0;
    g.mode = "exploration";
    g.encounter = null;
    const x = g.map.start.x - 2,
      z = g.map.start.z;
    g.party.forEach((h, i) => {
      Object.assign(h, { x: x + i, z, selected: i === 0 });
      h.conditions = [];
      h.survival.status = "active";
      h.survival.hp = h.survival.maxHp;
    });
    g.party[0].favorites = [
      "power-forge-strike",
      "ability-defend",
      "power-forge-unarmed",
    ];
    g.enemies = [
      {
        id: "ux-sentry",
        name: "Bone sentry",
        x: x + 5,
        z: z + 2,
        hp: 40,
        maxHp: 40,
        group: 999,
        conditions: [],
      },
    ];
    g.dice = (n = 3) => Array(n).fill(6);
    s.resetEntities(g.party, g.enemies);
    s.zoom = 19;
    s.resize();
    // Keep projected mouse targets stable independently of earlier camera tests.
    s.follow = false;
    s.focusOn({ x: x + 2, z }, false);
    g.detect();
  });
  await page.waitForTimeout(700);
  const clickCell = async (p) => {
    const point = await page.evaluate((p) => {
      const s = window.__ddd.scene,
        v = s.camera.position
          .clone()
          .set(p.x * 2.4, 0, p.z * 2.4)
          .project(s.camera);
      return {
        x: ((v.x + 1) * innerWidth) / 2,
        y: ((1 - v.y) * innerHeight) / 2,
      };
    }, p);
    await page.mouse.click(point.x, point.y);
  };
  const snapshot = () =>
    page.evaluate(() => {
      const g = window.__ddd.game;
      return JSON.stringify({
        budgets: g.budgets,
        hp: g.party.map((h) => h.survival.hp),
        supplies: g.party.map((h) => h.supplies),
      });
    });
  const before = await snapshot();
  await page.locator('[data-hot-action="power-forge-strike"]').click();
  await expect(page.locator(".targeting-tray")).toContainText("Melee Attack");
  await page.locator('[data-hot-action="ability-defend"]').click();
  await expect(page.locator(".targeting-tray")).toContainText("Defend");
  expect(await snapshot()).toBe(before);
  await page.locator('[data-action="cancel-target"]').click();
  await expect(page.locator(".targeting-tray")).toHaveCount(0);
  await page.locator('[data-hot-action="ability-defend"]').click();
  await page.locator('[data-hot-action="ability-defend"]').click();
  await expect(page.locator(".targeting-tray")).toHaveCount(0);
  await page.keyboard.press("5");
  await page.keyboard.press("7");
  await expect(page.locator(".targeting-tray")).toContainText("Unarmed Strike");
  await page.keyboard.press("Escape");
  expect(await snapshot()).toBe(before);

  const dest = await page.evaluate(() => {
    const h = window.__ddd.game.active;
    return { x: h.x + 4, z: h.z };
  });
  const companions = await page.evaluate(() =>
    window.__ddd.game.party.slice(1).map((h) => [h.x, h.z]),
  );
  await clickCell(dest);
  await page.waitForFunction(
    (p) =>
      window.__ddd.game.active.x === p.x &&
      !window.__ddd.game.paths.get("hero-0")?.length,
    dest,
  );
  expect(
    await page.evaluate(() =>
      window.__ddd.game.party.slice(1).map((h) => [h.x, h.z]),
    ),
  ).toEqual(companions);
  // Regression: buttons were disabled by movement and never refreshed on completion.
  await expect(
    page.locator('[data-hot-action="power-forge-strike"]'),
  ).toBeEnabled();
  await page.locator('[data-hot-action="power-forge-strike"]').click();
  await clickCell({ x: dest.x, z: dest.z - 1 });
  await expect(page.locator(".targeting-tray")).toContainText("Melee Attack");
  expect(
    await page.evaluate(() => window.__ddd.game.budget.remaining.main),
  ).toBe(1);
  await page.locator('[data-hot-action="ability-defend"]').click();
  await page.screenshot({ path: "test-results/combat-targeting.png" });
  await page.locator('[data-action="confirm-self"]').click();
  await expect(page.locator(".targeting-tray")).toHaveCount(0);
  expect(
    await page.evaluate(() => window.__ddd.game.budget.remaining.maneuver),
  ).toBe(0);
  expect(await page.evaluate(() => window.__ddd.game.active.buffs.defend)).toBe(
    true,
  );
  await page.getByRole("button", { name: "End turn", exact: false }).click();
  // Resolve the normal optional shield reaction if the sentry approaches a shield bearer.
  await page.waitForFunction(
    () =>
      window.__ddd.game.pendingDefense ||
      (!window.__ddd.game.busy &&
        window.__ddd.game.encounter.nextSide === "players"),
  );
  if (await page.locator("#skip-block").count())
    await page.locator("#skip-block").click();
  await page.waitForFunction(
    () => !window.__ddd.game.busy && window.__ddd.game.selected === 1,
  );
  await expect(page.locator('[data-select="1"]')).toHaveClass(/active/);
  await expect(page.locator('[data-select="0"]')).toBeDisabled();
  expect(await page.evaluate(() => window.__ddd.selectedAction)).toBe(null);
  // Select, but do not use, an action before ending the turn; it must not leak.
  await page.getByRole("button", { name: "Actions", exact: false }).click();
  await page.locator('[data-card="power-forge-unarmed"]').click();
  await page.getByRole("button", { name: "End turn", exact: false }).click();
  await page.waitForFunction(() => window.__ddd.game.selected === 2);
  expect(await page.evaluate(() => window.__ddd.selectedAction)).toBe(null);
  await page.getByRole("button", { name: "End turn", exact: false }).click();
  await page.waitForFunction(() => window.__ddd.game.selected === 3);
  await page.getByRole("button", { name: "Actions", exact: false }).click();
  await page.locator('[data-card="power-ember-lance"]').click();
  await page.getByRole("button", { name: "End turn", exact: false }).click();
  await page.waitForFunction(
    () =>
      window.__ddd.game.encounter.round === 2 &&
      window.__ddd.game.selected === 0,
  );
  await expect(page.locator('[data-select="0"]')).toHaveClass(/active/);
  await expect(
    page.locator('[data-hot-action="power-forge-strike"]'),
  ).toBeEnabled();
  expect(await page.evaluate(() => window.__ddd.selectedAction)).toBe(null);

  // Actual mouse movement after a coin pickup, with a complete formation reversal.
  await page.evaluate(() => {
    const { game: g, scene: s } = window.__ddd;
    g.mode = "exploration";
    g.encounter = null;
    g.busy = false;
    g.pendingDefense = null;
    g.enemies = [];
    g.paths.clear();
    const x = g.map.start.x - 2,
      z = g.map.start.z;
    g.party.forEach((h, i) =>
      Object.assign(h, { x: x + i, z, selected: i === 0 }),
    );
    g.selected = 0;
    g.setFormation(
      "column",
      g.party.map((h) => h.id),
    );
    g.map.chests = [{ id: "ux-coins", x: x + 4, z, coins: 23, opened: false }];
    window.uxHaul = g.campaign.haul;
    s.resetEntities(g.party, g.enemies);
    s.follow = false;
    s.focusOn({ x: x + 2, z }, false);
    g.emit("change");
  });
  await page.waitForTimeout(700);
  const forward = await page.evaluate(() => ({
    x: window.__ddd.game.map.start.x + 3,
    z: window.__ddd.game.map.start.z,
  }));
  await clickCell(forward);
  await page.waitForFunction(
    (p) =>
      window.__ddd.game.party[0].x === p.x &&
      [...window.__ddd.game.paths.values()].every((path) => !path.length),
    forward,
  );
  await page.evaluate(() => window.__ddd.game.interact("coffer:ux-coins"));
  expect(
    await page.evaluate(() => window.__ddd.game.campaign.haul - window.uxHaul),
  ).toBe(23);
  const back = { x: forward.x - 5, z: forward.z };
  await clickCell(back);
  await page.waitForFunction(
    (p) =>
      window.__ddd.game.party[0].x === p.x &&
      [...window.__ddd.game.paths.values()].every((path) => !path.length),
    back,
  );
  await clickCell(forward);
  await page.waitForFunction(
    (p) =>
      window.__ddd.game.party[0].x === p.x &&
      [...window.__ddd.game.paths.values()].every((path) => !path.length),
    forward,
  );
  expect(
    await page.evaluate(
      () => new Set(window.__ddd.game.party.map((h) => `${h.x},${h.z}`)).size,
    ),
  ).toBe(4);
  expect(
    await page.evaluate(() => window.__ddd.game.campaign.haul - window.uxHaul),
  ).toBe(23);
  await page.screenshot({ path: "test-results/after-coin-movement.png" });
  console.log(
    "Action switching/cancel/self confirmation, post-move controls, allied passage, next-turn and round selection, and continued movement after coins passed.",
  );
}
if (process.argv[1]?.endsWith("combat-ux-check.mjs")) {
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
    await enterGame(page);
    await page.getByRole("button", { name: "The Depths" }).click();
    await page.waitForFunction(
      () => window.__ddd.game.mode === "exploration",
      null,
      { timeout: 15000 },
    );
    await verifyCombatUX(page);
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
}
