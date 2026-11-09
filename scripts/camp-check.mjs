import { settingsAction, waitForGame } from "./ui-session.mjs";
import { expect } from "@playwright/test";
export async function verifyDungeonCamp(page) {
  const saved = await page.evaluate(() =>
    structuredClone(window.__ddd.game.snapshot()),
  );
  try {
    await page.evaluate(() => {
      const g = window.__ddd.game;
      g.pause();
      g.mode = "exploration";
      g.enemies = [];
      g.selected = 0;
      g.paths.clear();
      g.campWanderers = () => [];
      for (const h of g.party) {
        h.survival.hp = Math.max(1, h.survival.hp - 10);
        h.survival.gritAvailable = 0;
      }
      g.party[0].wounds.push({
        id: "native-camp-wound",
        record: structuredClone(
          g.C.wounds.records.find((w) => w.recoveryValue > 3),
        ),
        effects: [],
        applied: true,
      });
      g.party[0].survival.wounds++;
      g.emit("party");
      g.emit("change");
    });
    await expect(
      page.locator('.topbar [aria-label="Creatures in the area"]'),
    ).toBeVisible();
    await expect(page.locator('[data-action="rest"]')).toHaveCount(0);
    await settingsAction(page, "Camp & supplies");
    await expect(
      page.getByRole("dialog", { name: "Dungeon camp", exact: true }),
    ).toBeVisible();
    await page.waitForFunction(
      () =>
        Number(
          document.querySelector(".camp-landscape canvas")?.dataset.frames,
        ) > 3,
    );
    await expect(page.locator("[data-camp-slot]")).toHaveCount(8);
    await expect(page.locator(".camp-danger")).toContainText(
      "Enemies may interrupt the camp",
    );
    const firstRisk = await page.locator(".camp-danger p").innerText();
    await page.locator("#camp-length").selectOption("16");
    expect(await page.locator(".camp-danger p").innerText()).not.toBe(
      firstRisk,
    );
    await page.locator("#camp-length").selectOption("8");
    await expect(
      page.locator('select[data-camp-hero] option[value^="forage-"]'),
    ).toHaveCount(0);
    await expect(page.locator(".camp-forage-odds")).toHaveCount(0);
    await expect(
      page.getByRole("dialog", { name: "Dungeon camp", exact: true }),
    ).not.toContainText(/d100|find chance|% interruption/);
    await page.evaluate(() => window.__ddd.scene.clearFloatingText());
    await page.screenshot({ path: "test-results/dungeon-camp-preview.png" });
    console.log(
      "Camp-screen preview captured at test-results/dungeon-camp-preview.png",
    );
    await expect(page.locator(".camp-stocks")).toContainText("Dressings");
    await expect(page.locator(".camp-health").first()).toContainText(
      "HP now → end",
    );
    const medic = await page.evaluate(() => window.__ddd.game.party[2].heroId);
    await page
      .locator(`[data-camp-hero="${medic}"][data-camp-slot="0"]`)
      .selectOption("heal");
    await expect(
      page.locator(`[data-camp-target="${medic}"][data-target-slot="0"]`),
    ).toBeVisible();
    await expect(page.locator(".camp-member").nth(2)).toContainText(
      "+4 HP/hour",
    );
    await page
      .locator(`[data-camp-hero="${medic}"][data-camp-slot="1"]`)
      .selectOption("treat");
    await expect(
      page.locator(`[data-camp-target="${medic}"][data-target-slot="1"]`),
    ).toContainText("Borin");
    await page.screenshot({ path: "test-results/dungeon-camp-medical.png" });
    await page.setViewportSize({ width: 1100, height: 720 });
    await page.screenshot({ path: "test-results/dungeon-camp-compact.png" });
    await page.setViewportSize({ width: 1600, height: 1000 });
    const before = await page.evaluate(() =>
      window.__ddd.game.party.map((h) => h.survival.hp),
    );
    await page.locator("#camp-hour").click();
    expect(
      await page.evaluate(() => window.__ddd.game.campaign.camp.elapsed),
    ).toBe(1);
    expect(
      await page.evaluate(() =>
        window.__ddd.game.party.map((h) => h.survival.hp),
      ),
    ).toEqual(before.map((hp, i) => hp + (i === 0 ? 0 : 2)));
    const worker = await page.evaluate(() => window.__ddd.game.party[1].heroId);
    await page
      .locator(`[data-camp-hero="${worker}"][data-camp-slot="0"]`)
      .selectOption("guard");
    expect(
      await page.evaluate(() => window.__ddd.game.campaign.camp.elapsed),
    ).toBe(1);
    await page.keyboard.press("Escape");
    await settingsAction(page, "Save");
    await page.reload();
    await waitForGame(page);
    expect(
      await page.evaluate(() => window.__ddd.game.campaign.camp.elapsed),
    ).toBe(1);
    await page.evaluate(() => {
      const g = window.__ddd.game;
      g.pause();
      g.campWanderers = () => [];
      g.supplyDie = (die) => die;
      g.campaign.supplyNotices = [];
      g.emit("change");
    });
    await settingsAction(page, "Camp & supplies");
    await expect(page.locator("#camp-run")).toHaveText("Continue camp");
    await page.locator("#camp-run").click();
    await page.waitForFunction(
      () => window.__ddd.game.campaign.camp.status === "complete",
      null,
      { timeout: 20000 },
    );
    const result = await page.evaluate(() => ({
      sleep: Object.values(window.__ddd.game.campaign.camp.sleepHours),
      grit: window.__ddd.game.party.map((h) => h.survival.gritAvailable),
    }));
    expect(result.sleep).toEqual([6, 6, 6, 6]);
    expect(result.grit).toEqual([0, 0, 0, 0]);
    expect(
      await page.evaluate(
        () =>
          window.__ddd.game.party[0].wounds.find(
            (w) => w.id === "native-camp-wound",
          ).treatment.attempts.length,
      ),
    ).toBe(1);
    await page.screenshot({ path: "test-results/dungeon-camp-complete.png" });
    await page.keyboard.press("Escape");
    console.log(
      "Native dungeon camp planning, animation, hourly sleep healing, pause/save/reload, six-hour rota and unchanged Grit passed.",
    );
  } finally {
    if (await page.locator(".dungeon-camp").count())
      await page.keyboard.press("Escape");
    await page.evaluate((saved) => {
      const g = window.__ddd.game;
      delete g.campWanderers;
      delete g.supplyDie;
      g.load(saved, { resume: false });
      g.emit("floor");
      g.emit("change");
    }, saved);
  }
}
