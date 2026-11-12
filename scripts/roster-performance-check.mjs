import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium, expect } from "@playwright/test";
import { waitForGame } from "./ui-session.mjs";

// Normal terminal sandbox context; never use Playwright's Electron launcher.
const root = path.resolve(import.meta.dirname, "..");
const out = path.resolve(
  root,
  process.env.DDD_ROSTER_OUTPUT ?? "test-results/roster-performance",
);
await fs.mkdir(out, { recursive: true });
const userData = await fs.mkdtemp(path.join(os.tmpdir(), "fld-roster-"));
let browser, page;
let log = "";
const errors = [];
const manifest = JSON.parse(
  await fs.readFile(path.join(root, "config/approved-creature-assets.json")),
);
const startIndex = Number(process.env.DDD_ROSTER_START ?? 0);
if (
  !Number.isInteger(startIndex) ||
  startIndex < 0 ||
  startIndex >= manifest.assets.length
)
  throw Error("Invalid start index");
const reports = startIndex
  ? JSON.parse(await fs.readFile(path.join(out, "results.json"))).reports.slice(
      0,
      startIndex,
    )
  : [];
expect(reports).toHaveLength(startIndex);
for (let i = 0; i < reports.length; i++) {
  expect(reports[i].id).toBe(manifest.assets[i].creatureId);
  expect(reports[i].model).toBe(manifest.assets[i].model);
  expect(reports[i].performance.minVisible).toBe(10);
  expect(reports[i].performance.minInFrame).toBe(10);
  expect(reports[i].performance.fps).toBeGreaterThan(30);
}
const child = spawn(
  "/usr/bin/aa-exec",
  [
    "-p",
    "unconfined",
    "--",
    process.env.DDD_NATIVE_EXECUTABLE ?? path.join(root, "launch-game.sh"),
    "--remote-debugging-port=0",
    "--mute-audio",
  ],
  {
    cwd: root,
    detached: true,
    stdio: ["ignore", "ignore", "pipe"],
    env: { ...process.env, DDD_TEST_USER_DATA: userData },
  },
);
try {
  const endpoint = await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(Error(log || "Launcher timeout")),
      60000,
    );
    child.once("error", reject);
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(Error(`Launcher ${code}: ${log}`));
    });
    child.stderr.on("data", (chunk) => {
      log += chunk;
      const url = log.match(/DevTools listening on (ws:\/\/\S+)/)?.[1];
      if (url) {
        clearTimeout(timer);
        resolve(url);
      }
    });
  });
  browser = await chromium.connectOverCDP(endpoint);
  const context = browser.contexts()[0];
  page = context.pages()[0] ?? (await context.waitForEvent("page"));
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1600, height: 1000 });
  await waitForGame(page);
  const drafts = await page.evaluate(() =>
    window.__ddd.game.party.map((h) => h.draft),
  );
  for (const entry of manifest.assets.slice(startIndex)) {
    await page.reload();
    await waitForGame(page);
    await page.evaluate((drafts) => window.__ddd.game.fresh(drafts), drafts);
    if (await page.locator("#modal .close").count())
      await page.locator("#modal .close").click();
    await page.locator(".town-destination[data-action=descend]").click();
    await page.waitForFunction(() => window.__ddd.game.mode === "exploration");
    const fixture = await page.evaluate((creatureId) => {
      const { game: g, scene: s, C } = window.__ddd;
      const r = g.map.rooms.toSorted((a, b) => b.w * b.h - a.w * a.h)[0];
      const x = r.cx,
        z = r.cz;
      const card = C.creatures.creatures.find((c) => c.id === creatureId);
      const template = g.enemies[0];
      // Spacious fixture inside a real generated dungeon, six normal stat cards.
      // Elevated hero HP prevents attrition interrupting a sustained render sample.
      for (let a = x - 4; a <= x + 4; a++)
        for (let b = z - 4; b <= z + 4; b++) {
          g.map.tiles[`${a},${b}`] = { x: a, z: b };
          delete g.map.obstacles[`${a},${b}`];
          g.seen[`${a},${b}`] = true;
        }
      g.map.lights.push({ x, z, radius: 10 });
      g.party.forEach((h, i) => {
        Object.assign(h, {
          x: x - 1 - (i % 2),
          z: z - 1 + Math.floor(i / 2) * 2,
        });
        h.survival.hp = 500;
        h.survival.maxHp = 500;
      });
      g.enemies = Array.from({ length: 6 }, (_, i) => ({
        ...template,
        id: `roster-test-${i}`,
        type: card.id,
        name: card.name,
        group: 999,
        x: x + 1 + Math.floor(i / 3),
        z: z - 2 + (i % 3) * 2,
        hp: card.hp.max,
        maxHp: card.hp.max,
        stability: card.defenses.stability,
        conditions: [],
        aiState: {},
      }));
      const events = [];
      const animate = s.animate;
      s.animate = function (id, name, once) {
        const previous = this.entities.get(id)?.action;
        animate.call(this, id, name, once);
        const e = this.entities.get(id);
        if (e?.action !== previous)
          events.push({
            id,
            name,
            actual: e.action?.getClip().name,
            t: performance.now(),
          });
      };
      window.rosterReview = { events, center: { x, z } };
      g.emit("floor");
      g.emit("change");
      // Render-load fixture only: smoke/concealment must not make a faster
      // benchmark by culling opponents. Rules and AI still see real conditions.
      for (const entity of s.entities.values())
        if (entity.isEnemy)
          Object.defineProperty(entity.group, "visible", {
            configurable: true,
            get: () => true,
            set: () => {},
          });
      s.zoom = 22;
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
      window.rosterReview.fitCamera = () => {
        s.camera.updateMatrixWorld(true);
        const points = [];
        for (const e of s.entities.values()) {
          points.push(
            e.group.position.clone().applyMatrix4(s.camera.matrixWorldInverse),
          );
          const top = e.group.position.clone();
          top.y += e.model.userData.height ?? 1.8;
          points.push(top.applyMatrix4(s.camera.matrixWorldInverse));
        }
        const xs = points.map((p) => p.x),
          ys = points.map((p) => p.y);
        const x0 = Math.min(...xs),
          x1 = Math.max(...xs),
          y0 = Math.min(...ys),
          y1 = Math.max(...ys);
        const aspect = innerWidth / innerHeight;
        const half = Math.max(7, (y1 - y0) / 1.0, (x1 - x0) / (1.28 * aspect));
        s.camera.translateX((x0 + x1) / 2);
        s.camera.translateY((y0 + y1) / 2 - half * 0.15);
        s.camera.left = -half * aspect;
        s.camera.right = half * aspect;
        s.camera.top = half;
        s.camera.bottom = -half;
        s.camera.updateProjectionMatrix();
        s.camera.updateMatrixWorld(true);
      };
      window.rosterReview.fitCamera();
      window.rosterReview.cameraTimer = setInterval(
        window.rosterReview.fitCamera,
        50,
      );

      return {
        room: { x, z },
        heroes: g.party.length,
        creatures: g.enemies.length,
        clips: s.entities.get("roster-test-0").clips.map((c) => c.name),
      };
    }, entry.creatureId);
    expect(fixture.heroes).toBe(4);
    expect(fixture.creatures).toBe(6);
    await page.waitForTimeout(2200);
    const models = await page.evaluate(() =>
      [...window.__ddd.scene.entities.values()]
        .filter((e) => e.isEnemy)
        .map((e) => {
          let triangles = 0,
            meshes = 0,
            bones = 0,
            roughness = [];
          e.model.traverse((o) => {
            if (o.isMesh) {
              meshes++;
              triangles +=
                (o.geometry.index?.count ??
                  o.geometry.attributes.position.count) / 3;
              roughness.push(o.material.roughness);
              bones = Math.max(bones, o.skeleton?.bones.length ?? 0);
            }
          });
          return {
            avatar: e.model.userData.avatar,
            visible: e.group.visible,
            triangles,
            meshes,
            bones,
            roughness,
          };
        }),
    );
    for (const m of models) {
      expect(m.avatar).toBe(entry.model);
      expect(m.visible).toBe(true);
    }
    await page.evaluate(() => {
      const { game: g } = window.__ddd;
      g.enemies[0].z++;
      g.emit("change");
    });
    await page.waitForFunction(() =>
      window.rosterReview.events.some(
        (e) => e.id === "roster-test-0" && e.actual === "Walking_A",
      ),
    );
    await page.waitForTimeout(700);
    await page.evaluate(() => {
      const { game: g } = window.__ddd;
      g.campOpening = "opposition";
      g.dice = (n = 3) => Array(n).fill(3);
      g.detect(g.enemies);
      window.rosterReview.resolveDecisions = () => {
        const retain = document.querySelector("#retain-actions");
        if (retain) {
          const restrictions = g.restrictions(g.active);
          const count =
            3 -
            Math.min(3, Math.max(restrictions.dazed, restrictions.grappled));
          [...document.querySelectorAll('[name="retained"]')].forEach(
            (box, i) => {
              box.checked = i < count;
            },
          );
          retain.click();
        }
      };
      window.rosterReview.driver = setInterval(() => {
        window.rosterReview.resolveDecisions();
        if (g.pendingDefense) document.querySelector("#skip-block")?.click();
        if (g.pendingProvocation)
          document.querySelector("#skip-opportunity")?.click();
        if (
          g.mode === "combat" &&
          !g.busy &&
          g.encounter?.nextSide === "players"
        )
          document.querySelector('[data-action="end"]')?.click();
      }, 250);
    });

    await page.waitForTimeout(1500);
    const performanceReport = await page.evaluate(async () => {
      const { scene: s, game: g } = window.__ddd;
      const originalReset = s.renderer.info.autoReset;
      s.renderer.info.autoReset = false;
      s.renderer.info.reset();
      const startSerial = g.encounter.serial;
      const samples = [],
        counts = [],
        calls = [],
        triangles = [];
      let effectFrames = 0,
        minInFrame = 10;
      let start, previous;
      await new Promise((resolve) => {
        const tick = (t) => {
          start ??= t;
          if (previous !== undefined) samples.push(t - previous);
          previous = t;
          window.rosterReview.fitCamera();
          const inFrame = [...s.entities.values()].filter((e) => {
            const p = e.group.position.clone().project(s.camera);
            return (
              e.group.visible &&
              Math.abs(p.x) < 0.85 &&
              Math.abs(p.y) < 0.85 &&
              Math.abs(p.z) <= 1
            );
          }).length;
          minInFrame = Math.min(minInFrame, inFrame);
          if (s.effects.length) effectFrames++;
          counts.push(
            [...s.entities.values()].filter((e) => e.group.visible).length,
          );
          calls.push(s.renderer.info.render.calls);
          triangles.push(s.renderer.info.render.triangles);
          s.renderer.info.reset();
          if (t - start < 10000) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
      s.renderer.info.autoReset = originalReset;
      const sorted = [...samples].sort((a, b) => a - b),
        gl = s.renderer.getContext(),
        ext = gl.getExtension("WEBGL_debug_renderer_info");
      const average = samples.reduce((a, b) => a + b, 0) / samples.length;
      return {
        scope:
          "10s live dungeon combat, AI turns; heroes pass, boosted HP, six enemy models forced rendered through concealment",
        effectFrames,
        turnsAdvanced: g.encounter.serial - startSerial,
        minInFrame,
        frames: samples.length,
        fps: 1000 / average,
        medianMs: sorted[Math.floor(sorted.length * 0.5)],
        p95Ms: sorted[Math.floor(sorted.length * 0.95)],
        p99Ms: sorted[Math.floor(sorted.length * 0.99)],
        maxMs: sorted.at(-1),
        framesOver33ms: samples.filter((n) => n > 33.34).length,
        minVisible: Math.min(...counts),
        maxCalls: Math.max(...calls),
        maxTriangles: Math.max(...triangles),
        gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null,
        viewport: [innerWidth, innerHeight, devicePixelRatio],
        drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
        alive: g.enemies.filter((e) => e.hp > 0).length,
        heroStatus: g.party.map((h) => h.survival.status),
      };
    });
    const events = await page.evaluate(() => window.rosterReview.events);
    const report = {
      id: entry.creatureId,
      model: entry.model,
      fixture,
      models,
      performance: performanceReport,
      events,
    };
    reports.push(report);
    await fs.writeFile(
      path.join(out, "results.json"),
      JSON.stringify({ reports, errors }, null, 2),
    );
    await page.screenshot({ path: path.join(out, `${entry.creatureId}.png`) });
    console.log(JSON.stringify({ id: entry.creatureId, ...performanceReport }));
    expect(performanceReport.alive).toBe(6);
    expect(performanceReport.minVisible).toBe(10);
    expect(performanceReport.minInFrame).toBe(10);
    expect(performanceReport.fps).toBeGreaterThan(30);
    expect(performanceReport.turnsAdvanced).toBeGreaterThan(0);
  }
  expect(reports).toHaveLength(manifest.assets.length);
  expect(errors).toEqual([]);
  const cdp = await browser.newBrowserCDPSession();
  const processes = (await cdp.send("SystemInfo.getProcessInfo")).processInfo;
  const renderer = processes.find((p) => p.type === "renderer");
  const main = processes.find((p) => p.type === "browser");
  const sandbox = {
    mainProfile: (
      await fs.readFile(`/proc/${main.id}/attr/current`, "utf8")
    ).trim(),
    executable: await fs.readlink(`/proc/${main.id}/exe`),
    rendererSeccomp: (
      await fs.readFile(`/proc/${renderer.id}/status`, "utf8")
    ).match(/^Seccomp:\s*(\d+)/m)?.[1],
    arguments: (await fs.readFile(`/proc/${main.id}/cmdline`, "utf8"))
      .split("\0")
      .filter(Boolean),
  };
  expect(sandbox.mainProfile).toBe("unconfined");
  expect(sandbox.rendererSeccomp).toBe("2");
  expect(sandbox.arguments.join(" ")).toMatch(/(?:^|\s)--mute-audio(?:\s|$)/);
  expect(sandbox.arguments.join(" ")).not.toMatch(
    /(?:^|\s)--no-sandbox(?:\s|$)/,
  );
  expect(sandbox.executable).not.toContain(" ");
  await fs.rm(path.join(out, "failure.json"), { force: true });
  await fs.rm(path.join(out, "failure.png"), { force: true });
  await fs.writeFile(
    path.join(out, "complete.json"),
    JSON.stringify({ count: reports.length, errors, sandbox }, null, 2),
  );
} catch (e) {
  if (page)
    await page
      .screenshot({ path: path.join(out, "failure.png") })
      .catch(() => {});
  await fs.writeFile(
    path.join(out, "failure.json"),
    JSON.stringify({ error: e.stack, errors, log }, null, 2),
  );
  throw e;
} finally {
  await browser?.close().catch(() => {});
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {}
  await fs.rm(userData, { recursive: true, force: true });
}
