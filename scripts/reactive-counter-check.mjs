import { expect } from "@playwright/test";
export async function verifyReactiveCounters(page) {
  const saved = await page.evaluate(() =>
    structuredClone(window.__ddd.game.snapshot()),
  );
  try {
    await page.evaluate(() => {
      const g = window.__ddd.game;
      g.pause();
      window.counterAdvance = g.advance;
      g.advance = () => {};
      g.mode = "exploration";
      g.selected = 0;
      g.paths.clear();
      g.busy = false;
      g.pendingDefense = null;
      g.woundNotices = [];
      const h = g.active;
      h.conditions = [];
      h.survival.hp = h.survival.maxHp;
      h.survival.status = "active";
      g.dice = (n = 3) => Array(n).fill(6);
      g.enemies = [
        {
          id: "counter-sentry",
          name: "Sentry",
          x: h.x + 1,
          z: h.z,
          hp: 200,
          maxHp: 200,
          conditions: [],
          group: 999,
        },
      ];
      g.detect(g.enemies);
      h.preview.state.abilities.push(
        "power-retaliating-guard",
        "ability-shield-block",
      );
      g.useAbility("power-retaliating-guard");
      g.enemyManeuver(g.enemies[0]);
      g.enemyAttack(g.enemies[0], h);
    });
    await expect(
      page.getByText("Counterattack prepared.", { exact: true }),
    ).toBeVisible();
    await expect(page.locator("#use-block")).toBeVisible();
    await page.screenshot({ path: "test-results/reactive-counter-choice.png" });
    await page.locator("#skip-block").click();
    const result = await page.evaluate(() => {
      const g = window.__ddd.game;
      return {
        hp: g.enemies[0].hp,
        reaction: g.budgets[g.active.id]?.remaining.reaction,
        log: g.log,
      };
    });
    expect(result.hp).toBeLessThan(200);
    expect(result.reaction).toBe(0);
    expect(result.log.join("\n")).toContain("ripostes");
    console.log(
      "Prepared counter reaction choice, automatic return strike and Reaction spend passed.",
    );
  } finally {
    await page.evaluate((saved) => {
      const g = window.__ddd.game;
      g.advance = window.counterAdvance;
      delete g.dice;
      g.load(saved, { resume: false });
      g.emit("floor");
      g.emit("change");
    }, saved);
  }
}
