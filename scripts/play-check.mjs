import { chromium, expect } from "@playwright/test";
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
  await page.getByRole("button", { name: "The company register" }).click();
  await page.locator("#create-roster-hero").click();
  await expect(page.locator("#hero-name")).toBeVisible();
  await expect(page.locator("#hero-name")).toHaveValue("");
  await page.locator('[data-preset="borin-bridgekeeper"]').click();
  await page.locator("#hero-name").fill("Borin of Greyhaven");
  await page.locator("#hero-name").blur();
  await page.locator('[data-step="7"]').click();
  await page.getByRole("button", { name: "Save hero to repository" }).click();
  await expect(page.locator(".creator-window")).toHaveCount(0);
  await page.locator("#assign-roster-hero").click();
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => window.__ddd.game.party[0].name)).toBe(
    "Borin of Greyhaven",
  );
  await page.getByRole("button", { name: "Enter the depths" }).click();
  await page.waitForTimeout(500);
  const click = async (p) => {
    const at = await page.evaluate(({ x, z }) => {
      const v = window.__ddd.scene.camera.position
        .clone()
        .set(x * 2.4, 0, z * 2.4)
        .project(window.__ddd.scene.camera);
      return {
        x: ((v.x + 1) * innerWidth) / 2,
        y: ((1 - v.y) * innerHeight) / 2,
      };
    }, p);
    await page.mouse.move(at.x, at.y);
    await page.mouse.click(at.x, at.y);
  };
  const dest = await page.evaluate(() => ({
    x: window.__ddd.game.active.x - 2,
    z: window.__ddd.game.active.z,
  }));
  await click(dest);
  await page.waitForFunction(
    (p) =>
      window.__ddd.game.active.x === p.x && window.__ddd.game.active.z === p.z,
    dest,
  );
  console.log("Real-time point-and-click movement passed.");
  // Deterministic nearby encounter fixture, then exercise ordinary rendered controls.
  await page.evaluate(() => {
    const { game: g, scene: s } = window.__ddd;
    g.paths.clear();
    g.party.forEach((h, i) =>
      Object.assign(h, {
        x: g.map.start.x + (i % 2),
        z: g.map.start.z + Math.floor(i / 2),
      }),
    );
    g.enemies = [
      {
        id: "fixture-enemy",
        x: g.map.start.x,
        z: g.map.start.z - 1,
        hp: 10,
        maxHp: 10,
        type: "creature-bone-sentry",
        name: "Bone sentry",
        group: 999,
      },
    ];
    g.dice = (n = 3) => Array(n).fill(6);
    s.resetEntities(g.party, g.enemies);
    s.focusOn(g.active);
    g.detect();
  });
  await expect(page.locator(".phase")).toContainText("YOUR COMPANY");
  await page.waitForTimeout(1800);
  await click(await page.evaluate(() => window.__ddd.game.enemies[0]));
  await page
    .waitForFunction(() => window.__ddd.game.enemies[0].hp === 8, {
      timeout: 5000,
    })
    .catch(async (e) => {
      console.log(
        await page.evaluate(() => ({
          toast: document.querySelector("#toast").textContent,
          mode: window.__ddd.game.mode,
          log: window.__ddd.game.log,
          hp: window.__ddd.game.enemies[0].hp,
          selected: window.__ddd.game.selected,
        })),
      );
      throw e;
    });
  expect(
    await page.evaluate(() => window.__ddd.game.enemies[0].reactionUsed),
  ).toBe(true);
  expect(
    await page.evaluate(() =>
      window.__ddd.game.enemies[0].conditions.some((c) => c.key === "prone"),
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() => window.__ddd.game.budget.remaining.main),
  ).toBe(0);
  await page.getByRole("button", { name: "End turn" }).click();
  await page.getByRole("button", { name: "Shield Block", exact: true }).click();
  await page.waitForFunction(
    () =>
      !window.__ddd.game.busy &&
      window.__ddd.game.encounter.nextSide === "players",
  );
  await page.screenshot({ path: "test-results/combat.png" });
  console.log(
    "Recruitment, legal attack, action cost, opponent defense and alternating turns passed.",
  );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  expect(
    await page.evaluate(
      async () =>
        JSON.parse(await window.__ddd.library.read(window.__ddd.library.active))
          .campaign.mode,
    ),
  ).toBe("combat");
  expect(errors).toEqual([]);
  console.log("Save and browser runtime checks passed.");
} finally {
  await browser.close();
}
