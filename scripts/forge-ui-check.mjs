import { expect } from "@playwright/test";
import { learn, drafts } from "../tests/forge-fixture.mjs";
export async function chooseNode(page, id, { buy = true } = {}) {
  await page
    .getByRole("searchbox", { name: "Search forge" })
    .fill(
      id === "arms:0:0"
        ? "Melee attack"
        : id === "armor:0:0"
          ? "Light armor"
          : "",
    );
  if (id === "arms:0:0" || id === "armor:0:0")
    await page.locator(`[data-result="${id}"]`).click();
  else {
    const title = await page
      .locator(`.forge-node[data-node="${id}"]`)
      .getAttribute("aria-label");
    await page
      .getByRole("searchbox", { name: "Search forge" })
      .fill(title.split(" · ")[0]);
    await page.locator(`[data-result="${id}"]`).click();
  }
  if (buy) await page.locator(`[data-buy-node="${id}"]`).click();
}
export async function fillForgeHero(
  page,
  { name = "Mara of the Gate", learnAttack = true } = {},
) {
  await page.locator("#hero-name").fill(name);
  await page.locator("#hero-name").blur();
  for (const key of ["brawn", "fortitude", "agility"])
    await page.locator(`[data-attribute="${key}"]`).selectOption("1");
  await page.locator('[data-step="1"]').click();
  await page.locator("#ancestry").selectOption("ancestry-dwarf");
  await page.locator('[data-trait="trait-dwarf-deep-constitution"]').click();
  await page.locator('[data-trait="trait-dwarf-carved-history"]').click();
  await page.locator('[data-step="2"]').click();
  await page.locator("#class").selectOption("class-protector");
  await page
    .locator(
      '[data-origin-key="class"][data-origin-discipline="discipline-guard"]',
    )
    .click();
  for (const [kind, id, discipline] of [
    ["culture", "origin-culture-walled-communities", "armor"],
    ["background", "origin-background-household-guard", "arms"],
  ]) {
    await page.locator(`[data-origin="${kind}"]`).selectOption(id);
    await expect(
      page.locator(`.forge-origin-options [data-origin-key="${kind}"]`).first(),
    ).toBeVisible();
    await page
      .locator(
        `[data-origin-key="${kind}"][data-origin-discipline="discipline-${discipline}"]`,
      )
      .click();
  }
  if (learnAttack) {
    await page.locator('[data-step="4"]').click();
    await page.locator("#open-creation-forge").click();
    await chooseNode(page, "arms:0:0");
    await chooseNode(page, "armor:0:0");
    await page.locator(".forge-close").click();
  }
}
export async function verifyForgeUI(page) {
  const saved = await page.evaluate(() =>
    structuredClone(window.__ddd.game.snapshot()),
  );
  try {
    await page.locator('[data-action="training"]').click();
    await expect(page.locator(".dossier-disciplines")).toContainText("Arms");
    await page.locator("#open-build-forge").click();
    await expect(
      page.getByRole("dialog", { name: "Discipline forge" }),
    ).toBeVisible();
    await expect(page.locator(".forge-svg")).toBeVisible();
    await expect(page.locator(".forge-path-view")).toBeHidden();
    await expect(page.locator(".forge-node")).toHaveCount(377);
    await page.screenshot({ path: "test-results/forge-atlas.png" });
    await page.locator('[data-discipline="arms"]').click();
    const verifyLabels = async () => {
      const boxes = await page.locator(".forge-svg").evaluate((svg) => {
        const visible = (n) =>
          getComputedStyle(n).visibility === "visible" &&
          Number(getComputedStyle(n).opacity) > 0 &&
          getComputedStyle(n).display !== "none";
        const rect = (n) => {
          const b = n.getBoundingClientRect();
          return { x: b.x, y: b.y, w: b.width, h: b.height };
        };
        return {
          labels: [...svg.querySelectorAll(".forge-node-label")]
            .filter(visible)
            .map(rect),
          circles: [
            ...svg.querySelectorAll(".node-body,.forge-contact circle"),
          ].map(rect),
        };
      });
      expect(boxes.labels.length).toBeGreaterThan(9);
      const overlaps = (a, b) =>
        a.x < b.x + b.w - 1 &&
        a.x + a.w > b.x + 1 &&
        a.y < b.y + b.h - 1 &&
        a.y + a.h > b.y + 1;
      for (let i = 0; i < boxes.labels.length; i++) {
        for (let j = i + 1; j < boxes.labels.length; j++)
          expect(overlaps(boxes.labels[i], boxes.labels[j])).toBe(false);
        for (const circle of boxes.circles)
          expect(overlaps(boxes.labels[i], circle)).toBe(false);
      }
    };
    await verifyLabels();
    await page.screenshot({ path: "test-results/forge-connected-tree.png" });
    await page.setViewportSize({ width: 1100, height: 720 });
    await page.locator('[data-discipline="arms"]').click();
    await verifyLabels();
    await page.screenshot({ path: "test-results/forge-connected-compact.png" });
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.locator('[data-discipline="arms"]').click();
    await page.locator('[data-view="columns"]').click();
    await expect(page.locator(".forge-path-column")).toHaveCount(4);
    await page.screenshot({ path: "test-results/forge-optional-columns.png" });
    await page.locator('[data-view="columns"]').click();
    await expect(page.locator(".forge-svg")).toBeVisible();
    const world = page.locator(".forge-world"),
      before = await world.getAttribute("transform"),
      box = await page.locator(".forge-svg").boundingBox();
    await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.5);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(
      box.x + box.width * 0.55 + 70,
      box.y + box.height * 0.5 + 35,
      { steps: 8 },
    );
    await page.mouse.up({ button: "right" });
    const after = await world.getAttribute("transform");
    expect(after).not.toBe(before);
    const vals = (s) =>
      s
        .match(/translate\(([-.\d]+) ([-.\d]+)\)/)
        .slice(1)
        .map(Number);
    expect(vals(after)[0] - vals(before)[0]).toBeCloseTo(70);
    expect(vals(after)[1] - vals(before)[1]).toBeCloseTo(35);
    await page.mouse.wheel(0, -300);
    expect(await world.getAttribute("transform")).not.toBe(after);
    await chooseNode(page, "arms:0:1", { buy: false });
    await page.locator("[data-refund-node]").click();
    await expect(page.locator(".forge-refund-list")).toContainText(
      "Heavy edge",
    );
    await page.locator("[data-confirm-refund]").click();
    await expect(page.locator(".forge-currency b")).toHaveText("2");
    await chooseNode(page, "arms:0:1");
    await expect(page.locator(".forge-currency b")).toHaveText("1");
    await chooseNode(page, "arms:0:2");
    await expect(page.locator(".forge-currency b")).toHaveText("0");
    await page.locator(".forge-close").click();
    await page.keyboard.press("Escape");
    await page.evaluate(() =>
      window.__ddd.game.awardXP("forge-native", 975, "Forge trial"),
    );
    await page.locator('[data-hero="0"]').click();
    await page.locator("#sheet-training").click();
    await page.locator(".forge-train").click();
    await expect(page.locator(".forge-currency")).toContainText("LEVEL 3");
    await expect(page.locator(".forge-currency b")).toHaveText("8");
    await chooseNode(page, "marksmanship:origin");
    await chooseNode(page, "marksmanship:0:0");
    await chooseNode(page, "marksmanship:0:1");
    await chooseNode(page, "marksmanship:0:2");
    await chooseNode(page, "marksmanship:0:3");
    await page.screenshot({ path: "test-results/forge-ballistics.png" });
    await page.locator(".forge-close").click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.reload();
    await page.waitForFunction(() => window.__ddd);
    expect(
      await page.evaluate(
        () => window.__ddd.game.party[0].preview.forge.profiles.ranged,
      ),
    ).toEqual([2, 3, 5]);
    const d = structuredClone(drafts[0]);
    d.progression.level = 30;
    d.forge.nodes = [];
    learn(d, "intersection:cinder-tempest");
    d.forge.nodes = d.forge.nodes.filter(
      (id) => !["intersection:cinder-tempest", "storm:0:3"].includes(id),
    );
    await page.evaluate((d) => {
      const g = window.__ddd.game;
      g.awardXP("forge-gate", 10000000, "Gate trial");
      g.forgeCommit(0, d);
    }, d);
    await page.locator('[data-hero="0"]').click();
    await page.locator("#sheet-training").click();
    await chooseNode(page, "intersection:cinder-tempest", { buy: false });
    await expect(
      page.locator('[data-buy-node="intersection:cinder-tempest"]'),
    ).toBeDisabled();
    await expect(page.locator(".forge-prerequisites .learned")).toHaveCount(2);
    await page.screenshot({ path: "test-results/forge-gate-locked.png" });
    await chooseNode(page, "storm:0:3");
    await chooseNode(page, "intersection:cinder-tempest", { buy: false });
    await expect(
      page.locator('[data-buy-node="intersection:cinder-tempest"]'),
    ).toBeEnabled();
    await page.screenshot({ path: "test-results/forge-gate-open.png" });
    await page.locator('[data-buy-node="intersection:cinder-tempest"]').click();
    expect(
      await page.evaluate(() =>
        window.__ddd.game
          .powerIds(window.__ddd.game.party[0])
          .includes("power-forge-cinder-tempest"),
      ),
    ).toBe(true);
    await page.locator(".forge-close").click();
    await page.keyboard.press("Escape");
    console.log(
      "Forge atlas, grab panning, zoom, search, cascade refunds, training, multiple origins, profiles, three-contact gates and persistence passed.",
    );
  } finally {
    if (await page.locator("#modal-root > *").count())
      await page.keyboard.press("Escape");
    await page.evaluate((s) => {
      window.__ddd.game.load(s);
      window.__ddd.game.emit("change");
    }, saved);
  }
}
