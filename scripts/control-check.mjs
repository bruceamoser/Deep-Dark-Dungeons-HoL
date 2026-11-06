import { chromium, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";
export async function verifyControls(page) {
  const before = await page.evaluate(() => ({
    focus: window.__ddd.scene.focus.toArray(),
    party: window.__ddd.game.party.map((h) => [h.x, h.z]),
    zoom: window.__ddd.scene.zoom,
  }));
  const grab = async (start, end) => {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down({ button: "right" });
    const grabbed = await page.evaluate(({ x, y }) => {
      const camera = window.__ddd.scene.camera,
        rect = document.querySelector("#world").getBoundingClientRect();
      const nx = ((x - rect.left) / rect.width) * 2 - 1,
        ny = 1 - ((y - rect.top) / rect.height) * 2;
      const near = camera.position.clone().set(nx, ny, -1).unproject(camera),
        far = camera.position.clone().set(nx, ny, 1).unproject(camera);
      const ground = near.clone().lerp(far, -near.y / (far.y - near.y));
      return {
        point: ground.toArray(),
        quaternion: camera.quaternion.toArray(),
        height: camera.position.y,
      };
    }, start);
    await page.mouse.move(end.x, end.y, { steps: 8 });
    const check = async () => {
      const actual = await page.evaluate((point) => {
        const camera = window.__ddd.scene.camera,
          rect = document.querySelector("#world").getBoundingClientRect();
        const projected = camera.position
          .clone()
          .fromArray(point)
          .project(camera);
        return {
          x: rect.left + ((projected.x + 1) * rect.width) / 2,
          y: rect.top + ((1 - projected.y) * rect.height) / 2,
          quaternion: camera.quaternion.toArray(),
          height: camera.position.y,
        };
      }, grabbed.point);
      expect(Math.abs(actual.x - end.x)).toBeLessThan(0.5);
      expect(Math.abs(actual.y - end.y)).toBeLessThan(0.5);
      expect(actual.quaternion).toEqual(grabbed.quaternion);
      expect(actual.height).toBeCloseTo(grabbed.height, 8);
    };
    await check();
    await page.waitForTimeout(150);
    await check();
    await page.mouse.up({ button: "right" });
    await page.waitForTimeout(250);
    await check();
  };
  await grab({ x: 850, y: 400 }, { x: 1010, y: 470 });
  // Start another grab while a rotation is still easing. Grabbing stops that
  // motion, and pointer capture keeps the anchor even over the party sidebar.
  await page.keyboard.press("e");
  await grab({ x: 800, y: 400 }, { x: 180, y: 320 });
  await page.mouse.move(850, 400);
  await page.mouse.wheel(0, -240);
  const after = await page.evaluate(() => ({
    focus: window.__ddd.scene.focus.toArray(),
    party: window.__ddd.game.party.map((h) => [h.x, h.z]),
    zoom: window.__ddd.scene.zoom,
    follow: window.__ddd.scene.follow,
  }));
  expect(after.party).toEqual(before.party);
  expect(after.focus).not.toEqual(before.focus);
  expect(after.zoom).toBeLessThan(before.zoom);
  expect(after.follow).toBe(false);
  await page.getByRole("button", { name: "Formation", exact: false }).click();
  await page.locator("#formation-kind").selectOption("column");
  await page.locator('[data-up="3"]').click();
  await page.getByRole("button", { name: "Apply formation" }).click();
  expect(await page.evaluate(() => window.__ddd.game.campaign.order)).toEqual([
    "hero-0",
    "hero-1",
    "hero-3",
    "hero-2",
  ]);
  expect(await page.evaluate(() => window.__ddd.game.campaign.formation)).toBe(
    "column",
  );
  await page.locator('[data-action="sound"]').click();
  await page.locator("#volume").fill("0.8");
  await page.getByRole("button", { name: "Play test sound" }).click();
  const audio = await page.evaluate(() => {
    const { sound } = window.__ddd;
    const values = new Float32Array(sound.analyser.fftSize);
    sound.analyser.getFloatTimeDomainData(values);
    return {
      state: sound.context.state,
      energy: Math.sqrt(values.reduce((n, v) => n + v * v, 0) / values.length),
    };
  });
  expect(audio.state).toBe("running");
  expect(audio.energy).toBeGreaterThan(0.0001);
  await page.getByRole("button", { name: "Toggle mute" }).click();
  await page.waitForTimeout(350);
  expect(
    await page.evaluate(() => {
      const s = window.__ddd.sound,
        a = new Float32Array(s.analyser.fftSize);
      s.analyser.getFloatTimeDomainData(a);
      return Math.max(...a.map(Math.abs));
    }),
  ).toBeLessThan(0.0001);
  await page.getByRole("button", { name: "Toggle mute" }).click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Character", exact: false }).click();
  await expect(page.locator(".attribute-grid > div")).toHaveCount(6);
  await expect(page.locator(".equipment-list")).toContainText("Shield");
  await page.screenshot({ path: "test-results/character-sheet.png" });
  await page.getByRole("button", { name: "Close", exact: true }).click();
  // Controlled encounter, rendered controls and actual pointer input thereafter.
  await page.evaluate(() => {
    const { game: g, scene: s } = window.__ddd;
    g.paths.clear();
    g.selected = 3;
    g.mode = "exploration";
    g.party.forEach((h, i) =>
      Object.assign(h, {
        x: g.map.start.x + (i % 2),
        z: g.map.start.z + Math.floor(i / 2),
        selected: i === 3,
      }),
    );
    g.enemies = [
      {
        id: "controls-enemy",
        x: g.map.start.x,
        z: g.map.start.z - 2,
        hp: 10,
        maxHp: 10,
        name: "Bone sentry",
        group: 999,
        conditions: [],
      },
    ];
    g.dice = (n = 3) => Array(n).fill(6);
    s.resetEntities(g.party, g.enemies);
    s.focusOn(g.active);
    g.detect();
  });
  await page.keyboard.press("f");
  await page.waitForTimeout(700);
  const companions = await page.evaluate(() =>
    window.__ddd.game.party.slice(0, 3).map((h) => [h.x, h.z]),
  );
  await page.getByRole("button", { name: "Actions", exact: false }).click();
  await page.locator('[data-card="power-ember-lance"]').click();
  const target = await page.evaluate(() => {
    const { game: g, scene: s } = window.__ddd,
      e = g.enemies[0],
      v = s.camera.position
        .clone()
        .set(e.x * 2.4, 0, e.z * 2.4)
        .project(s.camera);
    return {
      x: ((v.x + 1) * innerWidth) / 2,
      y: ((1 - v.y) * innerHeight) / 2,
    };
  });
  await page.mouse.move(target.x, target.y);
  await page.mouse.click(target.x, target.y);
  await page.waitForFunction(() => window.__ddd.game.enemies[0].hp === 4);
  expect(
    await page.evaluate(() => window.__ddd.game.enemies[0].conditions[0]),
  ).toMatchObject({ key: "burning", rating: 1 });
  expect(
    await page.evaluate(() =>
      window.__ddd.game.party.slice(0, 3).map((h) => [h.x, h.z]),
    ),
  ).toEqual(companions);
  const move = await page.evaluate(() => {
    const { game: g, scene: s } = window.__ddd,
      h = g.active;
    const p = { x: h.x + 1, z: h.z };
    const v = s.camera.position
      .clone()
      .set(p.x * 2.4, 0, p.z * 2.4)
      .project(s.camera);
    return {
      p,
      x: ((v.x + 1) * innerWidth) / 2,
      y: ((1 - v.y) * innerHeight) / 2,
      focus: s.targetFocus.toArray(),
    };
  });
  await page.mouse.move(move.x, move.y);
  await page.mouse.click(move.x, move.y);
  await page.waitForFunction(
    (p) =>
      window.__ddd.game.active.x === p.x && window.__ddd.game.active.z === p.z,
    move.p,
  );
  expect(
    await page.evaluate(() =>
      window.__ddd.game.party.slice(0, 3).map((h) => [h.x, h.z]),
    ),
  ).toEqual(companions);
  expect(
    await page.evaluate(() => window.__ddd.scene.targetFocus.toArray()),
  ).toEqual(move.focus);
  await page.screenshot({ path: "test-results/learned-actions.png" });
  await page.evaluate(() => {
    const g = window.__ddd.game;
    g.awardXP("control-training", 400, "Training test expedition");
    g.enemies[0].hp = 0;
    g.mode = "exploration";
    g.encounter = null;
    g.party[0].survival.hp = 3;
    g.party[0].survival.gritAvailable = 0;
    g.emit("change");
  });
  await page.getByRole("button", { name: "Return", exact: false }).click();
  await page.locator('[data-hero="0"]').click();
  await page.locator('[data-tab="journey"]').click();
  await page.getByRole("button", { name: "Develop this hero" }).click();
  await expect(page.locator(".training-banner")).toContainText("10");
  await page.locator('[data-step="7"]').click();
  await page.getByRole("button", { name: "Commit training" }).click();
  expect(
    await page.evaluate(() => ({
      level: window.__ddd.game.party[0].preview.state.level,
      hp: window.__ddd.game.party[0].survival.hp,
      grit: window.__ddd.game.party[0].survival.gritAvailable,
    })),
  ).toEqual({ level: 2, hp: 3, grit: 0 });
  console.log(
    "Earned level and native workshop training preserved spent HP/Grit.",
  );
  console.log(
    "Right-drag camera, wheel zoom, marching order, full sheet, nonzero/muted audio, Ember Lance and actor-only tactical movement passed.",
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1000 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:5198");
    await page.waitForFunction(() => window.__ddd);
    await page.getByRole("button", { name: "Enter the depths" }).click();
    await verifyControls(page);
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
}
