// Actual Three.js skinning/clip preview; capture is not a performance benchmark.
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
      viewport: { width: 1280, height: 800 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/__wolf_review", (r) =>
    r.fulfill({
      contentType: "text/html; charset=utf-8",
      body: '<body style="margin:0;background:#202b2b"><div id="labels" style="position:absolute;top:30px;width:100%;display:flex;justify-content:space-around;color:#e3dcc7;font:22px Georgia"><span>Original game wolf</span><span>Wolf pilot · existing mesh refined</span></div><div id="phase" style="position:absolute;bottom:35px;width:100%;text-align:center;color:#e3dcc7;font:23px Georgia"></div></body>',
    }),
  );
  await page.route("**/__wolf.glb", (r) =>
    r.fulfill({ contentType: "model/gltf-binary", body: bytes }),
  );
  await page.goto(
    (process.env.AUDIT_URL ?? "http://127.0.0.1:5197") + "/__wolf_review",
  );
  const info = await page.evaluate(async () => {
    const src = await (await fetch("/src/view/appearance.mjs")).text(),
      T = await import(src.match(/import \* as T from "([^"]+)"/)[1]);
    const { GLTFLoader } =
      await import("/node_modules/three/examples/jsm/loaders/GLTFLoader.js");
    const loader = new GLTFLoader(),
      assets = await Promise.all([
        loader.loadAsync("/assets/creatures/Wolf.glb"),
        loader.loadAsync("/__wolf.glb"),
      ]);
    const scene = new T.Scene();
    scene.background = new T.Color("#202b2b");
    scene.add(new T.HemisphereLight(0xf3f1e7, 0x536779, 2));
    const key = new T.DirectionalLight(0xffefd9, 3);
    key.position.set(3, 6, 5);
    scene.add(key);
    const rim = new T.DirectionalLight(0xc6e1ed, 1.5);
    rim.position.set(-3, 2, -3);
    scene.add(rim);
    const floor = new T.Mesh(
      new T.PlaneGeometry(40, 40),
      new T.MeshStandardMaterial({ color: "#283333", roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    scene.add(floor);
    const renderer = new T.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(1280, 800);
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    document.body.append(renderer.domElement);
    const camera = new T.OrthographicCamera(
      -3.7,
      3.7,
      2.3125,
      -2.3125,
      0.01,
      50,
    );
    const actors = assets.map((a, i) => {
      const root = new T.Group(),
        model = a.scene;
      root.add(model);
      model.updateMatrixWorld(true);
      const box = new T.Box3().setFromObject(model),
        scale = 1.05 / (box.max.y - box.min.y);
      model.scale.multiplyScalar(scale);
      model.position.y -= box.min.y * scale;
      model.position.z -= (box.min.z + box.max.z) * 0.5 * scale;
      root.position.x = i ? 1.65 : -1.65;
      scene.add(root);
      model.traverse((o) => {
        if (o.isMesh) o.frustumCulled = false;
      });
      return {
        root,
        model,
        clips: a.animations,
        mixer: new T.AnimationMixer(model),
      };
    });
    const baseline = {
      Idle: "Idle",
      Walking_A: "Walk",
      Bite_Front: "Headbutt",
      Hit_A: "Idle",
      Death_A_Pose: "Death",
    };
    function frame(name, t, view = "quarter", solo = false) {
      document.getElementById("labels").style.display = solo ? "none" : "flex";
      actors[0].root.visible = !solo;
      actors[1].root.position.x = solo ? 0 : 1.65;
      for (let i = 0; i < actors.length; i++) {
        const a = actors[i];
        a.mixer.stopAllAction();
        const clip = a.clips.find(
          (c) => c.name === (i ? name : baseline[name]),
        );
        if (!clip) throw Error("Missing " + name + " in " + i);
        const action = a.mixer.clipAction(clip);
        action.reset().setLoop(T.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.play();
        a.mixer.setTime(Math.min(t, clip.duration));
      }
      const half = solo ? 1.15 : 2.3125;
      camera.left = -half * 1.6;
      camera.right = half * 1.6;
      camera.top = half;
      camera.bottom = -half;
      camera.updateProjectionMatrix();
      const positions = {
        front: [0, 1.9, 7],
        side: [7, 2, 0],
        back: [0, 1.9, -7],
        quarter: [3, 2.7, 7],
      };
      camera.position.set(...positions[view]);
      camera.lookAt(0, 0.5, 0);
      scene.updateMatrixWorld(true);
      renderer.render(scene, camera);
    }
    function bounds() {
      const b = new T.Box3();
      let finite = true;
      const a = actors[1];
      a.model.traverse((o) => {
        if (!o.isMesh) return;
        o.skeleton?.update();
        for (let i = 0; i < o.geometry.attributes.position.count; i++) {
          const v = new T.Vector3();
          o.getVertexPosition(i, v);
          v.applyMatrix4(o.matrixWorld);
          finite &&= [v.x, v.y, v.z].every(Number.isFinite);
          b.expandByPoint(v);
        }
      });
      return { finite, min: b.min.toArray(), max: b.max.toArray() };
    }
    window.review = { frame, bounds };
    frame("Idle", 0);
    return {
      clips: assets[1].animations.map((c) => ({
        name: c.name,
        duration: c.duration,
      })),
      baselineHit: "No source hit clip; baseline holds idle for comparison",
    };
  });
  for (const v of ["front", "side", "back", "quarter"]) {
    await page.evaluate((v) => window.review.frame("Idle", 0, v, true), v);
    await page.screenshot({ path: path.join(out, v + ".png") });
  }
  await page.evaluate(() =>
    window.review.frame("Bite_Front", 0.375, "side", true),
  );
  await page.screenshot({ path: path.join(out, "bite-open.png") });
  await page.evaluate(() =>
    window.review.frame("Death_A_Pose", 1.46, "quarter", true),
  );
  await page.screenshot({ path: path.join(out, "death.png") });
  const frames = path.join(out, "frames");
  await fs.mkdir(frames, { recursive: true });
  let index = 0;
  const segments = [],
    bounds = [];
  for (const [label, name, repeats] of [
    ["Idle", "Idle", 1],
    ["Walk", "Walking_A", 2],
    ["Bite", "Bite_Front", 2],
    ["Hit reaction · original has no clip", "Hit_A", 2],
    ["Death", "Death_A_Pose", 1],
  ]) {
    const clip = info.clips.find((c) => c.name === name);
    if (!clip) throw Error("Missing " + name);
    const start = index,
      count = Math.ceil(clip.duration * 24) + 1;
    for (let r = 0; r < repeats; r++)
      for (let i = 0; i < count; i++) {
        await page.evaluate(
          ({ name, t, label }) => {
            window.review.frame(name, t);
            document.getElementById("phase").textContent = label;
          },
          { name, t: i / 24, label },
        );
        if (r === 0 && i % 6 === 0)
          bounds.push({
            name,
            t: i / 24,
            ...(await page.evaluate(() => window.review.bounds())),
          });
        await page.screenshot({
          path: path.join(frames, String(index++).padStart(4, "0") + ".png"),
        });
      }
    segments.push({ name, start, end: index - 1 });
  }
  if (errors.length || bounds.some((b) => !b.finite))
    throw Error("Render error/nonfinite pose " + errors);
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-framerate",
      "24",
      "-i",
      path.join(frames, "%04d.png"),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "19",
      "-movflags",
      "+faststart",
      path.join(out, "wolf-comparison.mp4"),
    ],
    { stdio: "ignore" },
  );
  await fs.writeFile(
    path.join(out, "review.json"),
    JSON.stringify(
      { input, ...info, frames: index, segments, bounds, errors },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ frames: index, segments, errors }));
} finally {
  await browser.close();
}
