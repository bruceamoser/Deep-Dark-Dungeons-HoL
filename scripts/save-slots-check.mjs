import { enterGame, settingsAction } from "./ui-session.mjs";
import { chromium, expect } from "@playwright/test";
export async function verifySaveSlots(page) {
  await page.evaluate(() => {
    const g = window.__ddd.game;
    g.pause();
    g.mode = "town";
    g.encounter = null;
    g.pendingDefense = null;
    g.busy = false;
    g.woundNotices = [];
    g.paths.clear();
    g.campaign.bank = 321;
    g.party.forEach((h) => {
      h.survival.status = "active";
      h.survival.hp = h.survival.maxHp;
      h.conditions = [];
    });
    g.emit("change");
    g.resume();
  });
  const original = await page.evaluate(() => window.__ddd.library.active);
  await settingsAction(page, "Runs");
  await expect(page.locator(".runs-window")).toBeVisible();
  expect(await page.evaluate(() => window.__ddd.game.suspended)).toBe(true);
  await page.locator("#run-rename").fill("The Ember Company");
  await page.locator("#rename-run button").click();
  await expect(page.locator(".runs-body main h3")).toHaveText(
    "The Ember Company",
  );
  await page.locator("#run-name").fill("Before the descent");
  await page.locator("#copy-run").click();
  await expect(page.locator("[data-run]")).toHaveCount(2);
  const checkpoint = await page.evaluate(
    async () =>
      (await window.__ddd.library.list()).find(
        (s) => s.name === "Before the descent",
      ).id,
  );
  await page.screenshot({ path: "test-results/saved-journeys.png" });
  await page.locator("#resume-run").click();
  await page.evaluate(() => {
    window.__ddd.game.campaign.bank = 654;
    window.__ddd.game.emit("change");
  });
  await settingsAction(page, "Runs");
  await page.locator("#exit-run").click();
  await expect(page.locator("#resume-run")).toHaveCount(0);
  expect(await page.evaluate(() => window.__ddd.game.suspended)).toBe(true);
  // A restart after exit opens the library, rather than entering a run.
  await page.reload();
  await page.waitForFunction(() => window.__ddd, null, { timeout: 45000 });
  await enterGame(page);
  await expect(page.locator(".runs-window")).toBeVisible();
  await page.locator(`[data-run="${checkpoint}"]`).click();
  await page.locator("#load-run").click();
  await expect(page.locator(".runs-window")).toHaveCount(0);
  expect(await page.evaluate(() => window.__ddd.game.campaign.bank)).toBe(321);
  await settingsAction(page, "Runs");
  await page.locator(`[data-run="${original}"]`).click();
  await page.locator("#load-run").click();
  await expect(page.locator(".runs-window")).toHaveCount(0);
  expect(await page.evaluate(() => window.__ddd.game.campaign.bank)).toBe(654);
  // Enter a real encounter on a hero turn and keep its exact budget in a third slot.
  const combat = await page.evaluate(() => {
    const g = window.__ddd.game;
    const e = g.enemies.find((e) => e.hp > 0);
    e.x = g.active.x + 1;
    e.z = g.active.z;
    g.mode = "combat";
    g.busy = false;
    g.encounter = g.R.startEncounter(
      [
        ...g.party.map((h) => ({ id: h.id, side: "players" })),
        { id: e.id, side: "opposition" },
      ],
      [6, 6, 6],
    );
    g.beginHero();
    g.budget.remaining.main = 0;
    g.active.survival.hp -= 2;
    g.emit("change");
    return {
      actor: g.encounter.current,
      hp: g.active.survival.hp,
      round: g.encounter.round,
    };
  });
  await page.keyboard.press("Escape");
  await expect(page.locator(".runs-window")).toBeVisible();
  await page.locator("#run-name").fill("Mid battle");
  await page.locator("#copy-run").click();
  await expect(page.locator("[data-run]")).toHaveCount(3);
  const battle = await page.evaluate(
    async () =>
      (await window.__ddd.library.list()).find((s) => s.name === "Mid battle")
        .id,
  );
  await page.locator("#run-name").fill("Another company");
  await page.locator("#new-run").click();
  await expect(page.locator(".runs-window")).toHaveCount(0);
  expect(await page.evaluate(() => window.__ddd.game.mode)).toBe("town");
  expect(await page.evaluate(() => window.__ddd.game.campaign.bank)).toBe(0);
  await settingsAction(page, "Runs");
  await page.locator(`[data-run="${battle}"]`).click();
  await page.locator("#load-run").click();
  await expect(page.locator(".runs-window")).toHaveCount(0);
  expect(
    await page.evaluate(() => {
      const g = window.__ddd.game;
      return {
        actor: g.encounter.current,
        hp: g.active.survival.hp,
        round: g.encounter.round,
      };
    }),
  ).toEqual(combat);
  expect(
    await page.evaluate(() => window.__ddd.game.budget.remaining.main),
  ).toBe(0);
  // Escape also reaches the run menu during a mandatory reaction prompt.
  await page.evaluate(() => {
    const g = window.__ddd.game;
    const foe = g.encounter.roster.find((r) => r.side === "opposition").id;
    g.encounter.current = foe;
    g.encounter.nextSide = "opposition";
    g.pendingDefense = { attacker: foe, target: g.active.id };
    g.busy = true;
    g.emit("reaction", {
      hero: g.active,
      enemy: g.enemies.find((e) => e.id === foe),
    });
  });
  await page.keyboard.press("Escape");
  await expect(page.locator(".runs-window")).toBeVisible();
  await page.locator("#exit-run").click();
  await page.locator(`[data-run="${battle}"]`).click();
  await page.locator("#load-run").click();
  await expect(page.locator(".runs-window")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Shield Block", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => !!window.__ddd.game.pendingDefense)).toBe(
    true,
  );
  await page.keyboard.press("Escape");
  await page.locator(`[data-run="${checkpoint}"]`).click();
  await page.locator("#delete-run").click();
  await expect(page.locator(".run-delete-confirm")).toContainText(
    "Before the descent",
  );
  await page.locator("#cancel-delete").click();
  expect(
    await page.evaluate(async () => (await window.__ddd.library.list()).length),
  ).toBe(4);
  await page.locator("#delete-run").click();
  await page.locator("#confirm-delete").click();
  await expect(page.locator("[data-run]")).toHaveCount(3);
  await page.locator(`[data-run="${battle}"]`).click();
  await page.locator("#delete-run").click();
  await expect(page.locator(".run-delete-confirm")).toContainText("Mid battle");
  await page.locator("#confirm-delete").click();
  await expect(page.locator("[data-run]")).toHaveCount(2);
  expect(await page.evaluate(() => window.__ddd.library.active)).toBe(null);
  await page.reload();
  await page.waitForFunction(() => window.__ddd, null, { timeout: 45000 });
  await enterGame(page);
  await expect(page.locator(".runs-window")).toBeVisible();
  await expect(page.locator(`[data-run="${battle}"]`)).toHaveCount(0);
  await page.locator(`[data-run="${original}"]`).click();
  await page.locator("#load-run").click();
  await expect(page.locator(".runs-window")).toHaveCount(0);
  console.log(
    "Named run slots, independent checkpoint, exit/restart, new company, mid-combat budget and pending reaction restoration, cancel/delete confirmation and active-run deletion/restart passed.",
  );
}
if (process.argv[1]?.endsWith("save-slots-check.mjs")) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto("http://127.0.0.1:5198");
    await page.waitForFunction(() => window.__ddd, null, { timeout: 45000 });
    await enterGame(page);
    await verifySaveSlots(page);
    expect(errors).toEqual([]);
  } catch (e) {
    await page.screenshot({ path: "test-results/save-slots-failure.png" });
    console.error(await page.locator("#toast").textContent());
    throw e;
  } finally {
    await browser.close();
  }
}
