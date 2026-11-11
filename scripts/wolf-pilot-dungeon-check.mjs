import { verifyBestiaryPreview } from "./bestiary-preview-check.mjs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { chromium, expect } from "@playwright/test";
import { waitForGame } from "./ui-session.mjs";

// Normal terminal sandbox context; never use Playwright's Electron launcher.
const root = path.resolve(import.meta.dirname, "..");
const out = path.resolve(
  root,
  process.env.DDD_WOLF_OUTPUT ?? "test-results/wolf-pilot-dungeon",
);
await fs.mkdir(out, { recursive: true });
const userData = await fs.mkdtemp(path.join(os.tmpdir(), "fld-wolf-"));
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
let browser, page;
let log = "";
const errors = [];
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
  if (process.env.DDD_VERIFY_APPROVED_BESTIARY === "1")
    await verifyBestiaryPreview(page);
  if (await page.locator("#modal .close").count())
    await page.locator("#modal .close").click();
  await page.locator(".town-destination[data-action=descend]").click();
  await page.waitForFunction(() => window.__ddd.game.mode === "exploration");
  const fixture = await page.evaluate(() => {
    const { game: g, scene: s, C } = window.__ddd;
    const r = g.map.rooms.toSorted((a, b) => b.w * b.h - a.w * a.h)[0];
    const x = r.cx,
      z = r.cz;
    const card = C.creatures.creatures.find((c) => c.id === "creature-wolf");
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
      id: `wolf-test-${i}`,
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
    window.wolfReview = { events, center: { x, z } };
    g.emit("floor");
    g.emit("change");
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
    window.wolfReview.fitCamera = () => {
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
    window.wolfReview.fitCamera();
    window.wolfReview.cameraTimer = setInterval(
      window.wolfReview.fitCamera,
      50,
    );

    return {
      room: { x, z },
      heroes: g.party.length,
      creatures: g.enemies.length,
      clips: s.entities
        .get("wolf-test-0")
        .clips.filter((c) =>
          ["Idle", "Walking_A", "Bite_Front", "Hit_A", "Death_A_Pose"].includes(
            c.name,
          ),
        )
        .map((c) => ({ name: c.name, duration: c.duration })),
    };
  });
  expect(fixture.heroes).toBe(4);
  expect(fixture.creatures).toBe(6);
  expect(fixture.clips.map((c) => c.name)).toEqual([
    "Idle",
    "Walking_A",
    "Bite_Front",
    "Hit_A",
    "Death_A_Pose",
  ]);
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
    expect(m.avatar).toBe("WolfPilot");
    expect(m.visible).toBe(true);
    expect(m.triangles).toBeLessThan(130000);
    expect(m.bones).toBe(23);
    expect(m.roughness.every((r) => r > 0 && r <= 0.45)).toBe(true);
  }
  await page.screenshot({ path: path.join(out, "dungeon-six.png") });
  // Exercise the game movement presentation before allowing ranged enemies to
  // settle into melee distance. Actual AI combat follows unchanged.
  await page.evaluate(() => {
    const { game: g } = window.__ddd;
    g.enemies[0].z++;
    g.emit("change");
  });
  await page.waitForFunction(() =>
    window.wolfReview.events.some(
      (e) => e.id === "wolf-test-0" && e.actual === "Walking_A",
    ),
  );
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const { game: g } = window.__ddd;
    g.campOpening = "opposition";
    g.dice = (n = 3) => Array(n).fill(3);
    g.detect(g.enemies);
    window.wolfReview.resolveDecisions = () => {
      const retain = document.querySelector("#retain-actions");
      if (retain) {
        const restrictions = g.restrictions(g.active);
        const count =
          3 - Math.min(3, Math.max(restrictions.dazed, restrictions.grappled));
        [...document.querySelectorAll('[name="retained"]')].forEach(
          (box, i) => {
            box.checked = i < count;
          },
        );
        retain.click();
      }
    };
    window.wolfReview.driver = setInterval(() => {
      window.wolfReview.resolveDecisions();
      if (g.pendingDefense) document.querySelector("#skip-block")?.click();
      if (g.pendingProvocation)
        document.querySelector("#skip-opportunity")?.click();
      if (g.mode === "combat" && !g.busy && g.encounter?.nextSide === "players")
        document.querySelector('[data-action="end"]')?.click();
    }, 250);
  });
  await page.waitForFunction(() =>
    window.wolfReview.events.some((e) => e.name === "Bite_Front"),
  );
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
    let biteFrames = 0,
      minInFrame = 10;
    let start, previous;
    await new Promise((resolve) => {
      const tick = (t) => {
        start ??= t;
        if (previous !== undefined) samples.push(t - previous);
        previous = t;
        window.wolfReview.fitCamera();
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
        if (s.effects.some((e) => e.kind === "unarmed")) biteFrames++;
        counts.push(
          [...s.entities.values()].filter((e) => e.group.visible).length,
        );
        calls.push(s.renderer.info.render.calls);
        triangles.push(s.renderer.info.render.triangles);
        s.renderer.info.reset();
        if (t - start < 20000) requestAnimationFrame(tick);
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
        "20s live dungeon combat, AI turns; heroes pass turns, boosted fixture HP",
      biteFrames,
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
  await fs.writeFile(
    path.join(out, "performance.json"),
    JSON.stringify(performanceReport, null, 2),
  );
  await page.screenshot({ path: path.join(out, "combat.png") });
  // Capture separately AFTER timing: encoding/capture must not contaminate FPS.
  const videoFrames = [];
  const recorder = await page.context().newCDPSession(page);
  recorder.on("Page.screencastFrame", (frame) => {
    videoFrames.push({ data: frame.data, time: frame.metadata.timestamp });
    recorder
      .send("Page.screencastFrameAck", { sessionId: frame.sessionId })
      .catch(() => {});
  });
  await recorder.send("Page.startScreencast", {
    format: "jpeg",
    quality: 85,
    maxWidth: 1600,
    maxHeight: 1000,
    everyNthFrame: 2,
  });
  await page.waitForTimeout(8000);
  await recorder.send("Page.stopScreencast");
  await recorder.detach();
  const framesDir = path.join(out, "video-frames");
  await fs.mkdir(framesDir, { recursive: true });
  const concat = [];
  for (let i = 0; i < videoFrames.length; i++) {
    const name = `frame-${String(i).padStart(4, "0")}.jpg`;
    await fs.writeFile(
      path.join(framesDir, name),
      Buffer.from(videoFrames[i].data, "base64"),
    );
    concat.push(
      `file '${name}'`,
      `duration ${Math.max(0.001, (videoFrames[i + 1]?.time ?? videoFrames[i].time + 1 / 30) - videoFrames[i].time)}`,
    );
  }
  await fs.writeFile(
    path.join(framesDir, "frames.txt"),
    concat.join("\n") + "\n",
  );
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      path.join(framesDir, "frames.txt"),
      "-vf",
      "fps=30",
      "-c:v",
      "libx264",
      "-crf",
      "19",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      path.join(out, "dungeon-motion.mp4"),
    ],
    { stdio: "ignore" },
  );
  await page.evaluate(() => clearInterval(window.wolfReview.driver));
  // Finish remaining opposition turns, then deal an actual lethal melee hit.
  for (let i = 0; i < 80; i++) {
    const ready = await page.evaluate(() => {
      const g = window.__ddd.game;
      window.wolfReview.resolveDecisions();
      if (g.pendingDefense) document.querySelector("#skip-block")?.click();
      if (g.pendingProvocation)
        document.querySelector("#skip-opportunity")?.click();
      return !g.busy && g.encounter?.nextSide === "players";
    });
    if (ready) break;
    await page.waitForTimeout(250);
  }
  const targetId = await page.evaluate(() => {
    const { game: g } = window.__ddd;
    const h = g.active;
    // After benchmarking only: permit the finishing blow despite accumulated
    // grapple restrictions. AI/combat conditions were unchanged during timing.
    h.conditions = [];
    if (g.budgets[h.id]) g.budgets[h.id].remaining.main = 1;
    window.wolfReview.resolveDecisions();
    g.select(g.party.indexOf(h));
    const target = g.enemies[0];
    const square = Object.values(g.map.tiles).find(
      (p) =>
        Math.max(Math.abs(p.x - target.x), Math.abs(p.z - target.z)) === 1 &&
        !g.map.obstacles[`${p.x},${p.z}`] &&
        !g.enemies.some((e) => e.x === p.x && e.z === p.z) &&
        !g.party.some((e) => e !== h && e.x === p.x && e.z === p.z),
    );
    if (!square) throw Error("No melee test square");
    h.x = square.x;
    h.z = square.z;
    g.emit("change");
    g.move(square);
    return target.id;
  });
  await page.waitForFunction(
    () => !window.__ddd.game.paths.get(window.__ddd.game.active.id)?.length,
  );
  await page.evaluate((id) => {
    const g = window.__ddd.game;
    g.dice = (n = 3) => Array(n).fill(6);
    g.enemies.find((e) => e.id === id).hp = 1;
    g.attack(id, "melee");
  }, targetId);
  await page.waitForFunction(
    (id) =>
      window.wolfReview.events.some((e) => e.id === id && e.name === "Hit_A"),
    targetId,
  );
  await page.waitForFunction((id) => {
    const e = window.__ddd.scene.entities.get(id);
    return (
      e.action?.getClip().name === "Death_A_Pose" &&
      e.action.time > e.action.getClip().duration * 0.65 &&
      e.group.visible
    );
  }, targetId);
  await page.screenshot({ path: path.join(out, "death.png") });
  await page.waitForFunction((id) => {
    const actor = window.__ddd.scene.entities.get(id);
    return (
      actor.action?.getClip().name === "Death_A_Pose" &&
      actor.action.clampWhenFinished &&
      actor.action.time >= actor.action.getClip().duration - 0.001 &&
      !actor.group.visible
    );
  }, targetId);
  const events = await page.evaluate(() => window.wolfReview.events);
  for (const clip of fixture.clips)
    expect(
      events.some(
        (e) => e.id.startsWith("wolf-test-") && e.actual === clip.name,
      ),
      clip.name,
    ).toBe(true);
  // Verify the actual main process and renderer retained their sandbox context.
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
  expect(errors).toEqual([]);
  expect(performanceReport.alive).toBe(6);
  expect(performanceReport.biteFrames).toBeGreaterThan(0);
  expect(performanceReport.turnsAdvanced).toBeGreaterThan(2);
  expect(performanceReport.minVisible).toBe(10);
  expect(performanceReport.minInFrame).toBe(10);
  expect(performanceReport.fps).toBeGreaterThan(30);
  await fs.rm(path.join(out, "failure.json"), { force: true });
  await fs.rm(path.join(out, "failure.png"), { force: true });
  const report = {
    fixture,
    models,
    performance: performanceReport,
    events,
    sandbox,
    errors,
  };
  await fs.writeFile(
    path.join(out, "results.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        performance: performanceReport,
        clips: [
          ...new Set(
            events
              .filter((e) => e.id.startsWith("wolf-test-"))
              .map((e) => e.actual),
          ),
        ],
        sandbox,
        errors,
      },
      null,
      2,
    ),
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
