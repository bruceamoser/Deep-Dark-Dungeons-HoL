import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
const [input, out] = process.argv.slice(2);
await fs.mkdir(out, { recursive: true });
const bytes = await fs.readFile(input);
const browser = await chromium.launch({
  headless: true,
  args: ["--mute-audio"],
});
try {
  const page = await browser.newPage({
      viewport: { width: 1400, height: 850 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/__air_preview", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: '<body style="margin:0;background:#16212b"><div id="labels" style="position:absolute;top:30px;width:100%;display:flex;justify-content:space-around;color:#ddd4b4;font:20px Georgia"><span>Current ribbon vortex</span><span>Sculpted wind pilot</span></div><div id="phase" style="position:absolute;bottom:35px;text-align:center;width:100%;color:#ddd4b4;font:24px Georgia"></div></body>',
    }),
  );
  await page.route("**/__air.glb", (r) =>
    r.fulfill({ contentType: "model/gltf-binary", body: bytes }),
  );
  await page.goto("http://127.0.0.1:5197/__air_preview");
  const info = await page.evaluate(async () => {
    const src = await (await fetch("/src/view/air-elemental.mjs")).text();
    const T = await import(src.match(/import \* as T from "([^"]+)"/)[1]);
    const { GLTFLoader } =
      await import("/node_modules/three/examples/jsm/loaders/GLTFLoader.js");
    const { airElementalAppearance } =
      await import("/src/view/air-elemental.mjs");
    const { creatureAppearance } = await import("/src/view/creatures.mjs");
    const loader = new GLTFLoader(),
      asset = await loader.loadAsync("/__air.glb"),
      old = await loader.loadAsync("/assets/creatures/pilots/AirVortex.glb");
    const fresh = airElementalAppearance(asset),
      baseline = creatureAppearance(
        new Map([["AirVortex", old]]),
        { type: "creature-air-elemental" },
        null,
      );
    const scene = new T.Scene();
    scene.background = new T.Color("#16212b");
    scene.add(new T.HemisphereLight(0xe4f6ff, 0x4e5964, 2));
    const key = new T.DirectionalLight(0xffefda, 3);
    key.position.set(3, 6, 5);
    scene.add(key);
    const rim = new T.DirectionalLight(0x8dccff, 2);
    rim.position.set(-4, 2, -3);
    scene.add(rim);
    const plane = new T.Mesh(
      new T.PlaneGeometry(30, 30),
      new T.MeshStandardMaterial({ color: "#263641", roughness: 0.8 }),
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.01;
    scene.add(plane);
    const left = new T.Group(),
      right = new T.Group();
    left.add(baseline.model);
    right.add(fresh.model);
    left.position.x = -1.6;
    right.position.x = 1.6;
    scene.add(left, right);
    const renderer = new T.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(1400, 850);
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    document.body.append(renderer.domElement);
    const camera = new T.OrthographicCamera(
      -3.8,
      3.8,
      2.307,
      -2.307,
      0.01,
      100,
    );
    camera.position.set(0, 3, 8);
    camera.lookAt(0, 0.95, 0);
    const rigs = [baseline, fresh].map((p) => ({
      ...p,
      mixer: new T.AnimationMixer(p.model),
    }));
    const frame = (clip, t, angle = 0) => {
      for (const p of rigs) {
        p.mixer.stopAllAction();
        const c = p.clips.find((c) => c.name === clip);
        const a = p.mixer.clipAction(c);
        a.reset().setLoop(T.LoopOnce, 1);
        a.clampWhenFinished = true;
        a.play();
        p.mixer.setTime(Math.min(t, c.duration));
        p.model.userData.animate?.(t, clip === "Walking_A");
      }
      left.rotation.y = right.rotation.y = angle;
      scene.updateMatrixWorld(true);
      renderer.render(scene, camera);
    };
    window.airPreview = { frame };
    frame("Idle", 0.5);
    const stats = { triangles: 0, meshes: 0, materials: new Set() };
    fresh.model.traverse((o) => {
      if (o.isMesh) {
        stats.triangles +=
          (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
        stats.meshes++;
        stats.materials.add(o.material.uuid);
      }
    });
    return {
      triangles: stats.triangles,
      drawCalls: stats.meshes,
      materials: stats.materials.size,
      clips: fresh.clips.map((c) => ({ name: c.name, duration: c.duration })),
    };
  });
  for (const [name, a] of [
    ["front", 0],
    ["side", Math.PI / 2],
    ["back", Math.PI],
  ]) {
    await page.evaluate((a) => window.airPreview.frame("Idle", 0.4, a), a);
    await page.screenshot({ path: path.join(out, name + ".png") });
  }
  const frames = path.join(out, "frames");
  await fs.mkdir(frames, { recursive: true });
  let n = 0;
  for (const [label, clip, duration] of [
    ["Idle · circulating wind", "Idle", 2],
    ["Travel · leaning into motion", "Walking_A", 1.7],
    ["Attack · gathering and releasing a gust", "Spellcast_Shoot", 2],
    ["Hit · disrupted wind reforms", "Hit_A", 0.9],
    ["Death · the vortex disperses", "Death_A_Pose", 1.7],
  ]) {
    const d = info.clips.find((c) => c.name === clip).duration;
    for (let i = 0; i < duration * 30; i++) {
      await page.evaluate(
        ({ label, clip, t }) => {
          document.querySelector("#phase").textContent = label;
          window.airPreview.frame(clip, t);
        },
        {
          label,
          clip,
          t: clip === "Death_A_Pose" ? Math.min(i / 30, d) : (i / 30) % d,
        },
      );
      await page.screenshot({
        path: path.join(frames, String(n++).padStart(4, "0") + ".png"),
      });
    }
  }
  if (errors.length) throw Error(errors.join("\n"));
  await fs.writeFile(
    path.join(out, "review.json"),
    JSON.stringify({ ...info, frames: n, errors }, null, 2),
  );
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-framerate",
      "30",
      "-i",
      path.join(frames, "%04d.png"),
      "-c:v",
      "libx264",
      "-crf",
      "19",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      path.join(out, "air-elemental-comparison.mp4"),
    ],
    { stdio: "ignore" },
  );
  console.log(JSON.stringify(info));
} finally {
  await browser.close();
}
