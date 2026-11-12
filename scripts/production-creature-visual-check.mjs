// Visual routing/animation acceptance only. No FPS sampling or balance claim.
import fs from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { waitForGame, settingsAction } from "./ui-session.mjs";
const [id, output] = process.argv.slice(2);
if (!id || !output)
  throw Error("Usage: production-creature-visual-check.mjs creature-ID OUTPUT");
const manifest = JSON.parse(
  await fs.readFile(
    new URL("../config/approved-creature-assets.json", import.meta.url),
  ),
);
const entry = manifest.assets.find((a) => a.creatureId === id);
if (!entry) throw Error("Missing manifest entry");
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--mute-audio"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(process.env.AUDIT_URL ?? "http://127.0.0.1:5198");
  await waitForGame(page);
  if (await page.locator("#modal .close").count())
    await page.locator("#modal .close").click();
  await settingsAction(page, "Bestiary");
  const guide = page.getByRole("dialog", { name: "Dungeon bestiary" });
  await guide.locator(`button[data-creature="${id}"]`).click();
  const canvas = guide.locator("canvas");
  await expect(canvas).toHaveAttribute("data-model", entry.model);
  const clips = {};
  for (const pose of ["idle", "walk", "attack", "hit", "death"]) {
    await guide.getByLabel("Model animation").selectOption(pose);
    await expect(canvas).toHaveAttribute("data-pose", pose);
    clips[pose] = await canvas.getAttribute("data-clip");
    if (!clips[pose]) throw Error(`No actual clip for ${pose}`);
    await page.waitForTimeout(pose === "death" ? 650 : 200);
    await page.screenshot({ path: path.join(output, `bestiary-${pose}.png`) });
  }
  await guide.locator(".close").click();
  await page.locator(".town-destination[data-action=descend]").click();
  await page.waitForFunction(() => window.__ddd.game.mode === "exploration");
  const modelCheck = await page.evaluate(
    ({ id, model }) => {
      const { game: g, scene: s, C } = window.__ddd;
      const r = g.map.rooms.toSorted((a, b) => b.w * b.h - a.w * a.h)[0],
        x = r.cx,
        z = r.cz;
      const c = C.creatures.creatures.find((c) => c.id === id),
        template = g.enemies[0];
      for (let a = x - 4; a <= x + 4; a++)
        for (let b = z - 4; b <= z + 4; b++) {
          g.map.tiles[`${a},${b}`] = { x: a, z: b };
          delete g.map.obstacles[`${a},${b}`];
          g.seen[`${a},${b}`] = true;
        }
      g.map.lights.push({ x, z, radius: 10 });
      g.party.forEach((h, i) =>
        Object.assign(h, {
          x: x - 2 + (i % 2),
          z: z - 1 + Math.floor(i / 2) * 2,
        }),
      );
      g.enemies = Array.from({ length: 6 }, (_, i) => ({
        ...template,
        id: `visual-${i}`,
        type: id,
        name: c.name,
        group: 999,
        x: x + 1 + Math.floor(i / 3),
        z: z - 2 + (i % 3) * 2,
        hp: c.hp.max,
        maxHp: c.hp.max,
        conditions: [],
        dead: false,
      }));
      g.emit("floor");
      g.emit("change");
      s.zoom = 18;
      s.angle = (3 * Math.PI) / 4;
      s.follow = false;
      s.resize();
      s.focusOn({ x, z }, false);
      s.focus.copy(s.targetFocus);
      s.camera.position
        .copy(s.focus)
        .add({ x: Math.cos(s.angle) * 32, y: 27, z: Math.sin(s.angle) * 32 });
      s.camera.lookAt(s.focus);
      s.manualCamera = true;
      return { expected: model, available: s.assets.has(model) };
    },
    { id, model: entry.model },
  );
  expect(modelCheck.available).toBe(true);
  await page.waitForTimeout(1000);
  const instances = await page.evaluate(() =>
    [...window.__ddd.scene.entities.values()]
      .filter((e) => e.data.id.startsWith("visual-"))
      .map((e) => ({
        avatar: e.model.userData.avatar,
        clips: e.clips.map((c) => c.name),
        position: e.group.position.toArray(),
      })),
  );
  expect(instances.length).toBe(6);
  for (const instance of instances) expect(instance.avatar).toBe(entry.model);
  let ambientReview;
  if (entry.runtime?.ambient === "ash-smoke") {
    ambientReview = await page.evaluate(() => {
      return [...window.__ddd.scene.entities.values()]
        .filter((e) => e.data.id.startsWith("visual-"))
        .map((e) => {
          const smoke = e.model.getObjectByName("Ash smoke");
          if (!smoke) throw Error("Missing authored ash smoke");
          const before = [...smoke.geometry.attributes.position.array];
          e.model.userData.animate(2);
          const after = [...smoke.geometry.attributes.position.array];
          return {
            points: after.length / 3,
            moved: before.some((v, i) => Math.abs(v - after[i]) > 0.001),
            finite: after.every(Number.isFinite),
          };
        });
    });
    for (const row of ambientReview)
      expect(row).toEqual({ points: 18, moved: true, finite: true });
  }
  await page.screenshot({ path: path.join(output, "dungeon-look.png") });
  let projectileReview;
  const projectileKind = entry.runtime?.attack?.kind;
  if (
    ["bottle", "arrow", "sonic", "sling", "dart", "cold", "radiant"].includes(
      projectileKind,
    )
  ) {
    const frameFolder =
      projectileKind === "bottle"
        ? "throw-frames"
        : projectileKind === "sonic"
          ? "resonance-frames"
          : "shot-frames";
    await fs.mkdir(path.join(output, frameFolder), { recursive: true });
    await page.evaluate((kind) => {
      const s = window.__ddd.scene;
      window.__savedTick = s.tick;
      s.tick = () => {};
      const actor = s.entities.get("visual-5"),
        target = [...s.entities.values()].find((e) => !e.isEnemy);
      actor.travel = [];
      s.clearEffects();
      window.__throwReview = {
        actor,
        target,
        fx: s.attackEffect({
          attacker: actor.data.id,
          target: target.data.id,
          spell: ["bottle", "sonic", "cold", "radiant"].includes(kind),
          ranged: ["arrow", "sling", "dart"].includes(kind),
          element: kind === "bottle" ? "fire" : undefined,
          damage: 0,
        }),
      };
      s.camera.zoom *= 1.8;
      s.camera.updateProjectionMatrix();
      const middle = actor.group.position
        .clone()
        .lerp(target.group.position, 0.5);
      s.camera.position.add(middle.clone().sub(s.focus));
      s.camera.lookAt(middle);
    }, projectileKind);
    const samples = [];
    const release = entry.runtime.attack.release;
    for (
      let frame = 0;
      frame <
      Math.max(
        45,
        Math.ceil(
          (Math.max(release, entry.runtime.attack.recover ?? 0) + 0.9) * 30,
        ),
      );
      frame++
    ) {
      samples.push(
        await page.evaluate(() => {
          const s = window.__ddd.scene,
            { actor, fx } = window.__throwReview;
          actor.mixer.update(1 / 30);
          s.scene.updateMatrixWorld(true);
          fx.update(1 / 30);
          s.renderer.render(s.scene, s.camera);
          const flask =
            actor.model.getObjectByName("Firestarter_held_flask") ??
            actor.model.getObjectByName("Firestarter held flask") ??
            actor.model.getObjectByName("Slinger_stone") ??
            actor.model.getObjectByName("Loaded_Dart") ??
            actor.model.getObjectByName("Archer_arrow");
          const arrow = actor.model.getObjectByName("arrowBone"),
            nock =
              actor.model.getObjectByName("BowJoint05") ??
              actor.model.getObjectByName("BowNock"),
            hand =
              actor.model.getObjectByName("weapon_r") ??
              actor.model.getObjectByName("handslotr") ??
              actor.model.getObjectByName("handslot.r");
          return {
            time: fx.age,
            kind: fx.kind,
            held: flask
              ? flask.visible
              : arrow
                ? arrow.scale.x > 0.5
                : undefined,
            nockGap:
              nock && hand
                ? nock
                    .getWorldPosition(nock.position.clone())
                    .distanceTo(hand.getWorldPosition(hand.position.clone()))
                : undefined,
            projectile: fx.projectile.visible,
            meshes: fx.projectile.children.length,
            position: fx.projectile.position.toArray(),
          };
        }),
      );
      await page.screenshot({
        path: path.join(
          output,
          frameFolder,
          `${String(frame).padStart(4, "0")}.png`,
        ),
      });
    }
    const flying = samples.find(
      (s) => s.time > release + 0.03 && s.time < release + 0.13,
    );
    expect(flying.kind).toBe(projectileKind);
    if (!["sonic", "cold", "radiant"].includes(projectileKind))
      expect(flying.held).toBe(false);
    expect(flying.meshes).toBeGreaterThan(0);
    expect(flying.projectile).toBe(true);
    if (!["sonic", "cold", "radiant"].includes(projectileKind))
      expect(samples.at(-1).held).toBe(true);
    expect(samples.every((s) => s.position.every(Number.isFinite))).toBe(true);
    if (projectileKind === "arrow")
      expect(
        samples
          .filter((s) => s.time >= release - 0.13 && s.time <= release - 0.03)
          .every((s) => s.nockGap < 0.06),
      ).toBe(true);
    await page.evaluate(() => {
      window.__throwReview.fx.dispose();
      window.__ddd.scene.effects = [];
      window.__ddd.scene.tick = window.__savedTick;
    });
    projectileReview = {
      samples,
      scope:
        "Actual game projectile effect sampled at fixed animation times; no FPS measurement",
    };
  }
  expect(errors).toEqual([]);
  await fs.writeFile(
    path.join(output, "results.json"),
    JSON.stringify(
      {
        id,
        model: entry.model,
        hash: entry.sha256,
        clips,
        instances,
        projectileReview,
        ambientReview,
        errors,
        scope:
          "Actual game bestiary + dungeon appearance routing; muted isolated browser context; performance deferred",
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ id, model: entry.model, clips, errors }));
} finally {
  await browser.close();
}
