// Muted private preview: real GLB/embedded clips, no game integration or saves.
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { chromium } from "@playwright/test";
const [input, out] = process.argv.slice(2);
if (!input || !out)
  throw Error("Usage: review-equipped-creature.mjs PRIVATE.glb PRIVATE_OUTPUT");
await fs.mkdir(out, { recursive: true });
const bytes = await fs.readFile(input);
const browser = await chromium.launch({
  headless: true,
  args: ["--mute-audio"],
});
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/__goblin_preview", (r) =>
    r.fulfill({
      contentType: "text/html; charset=utf-8",
      body: '<!doctype html><body style="margin:0"></body>',
    }),
  );
  await page.route("**/__goblin.glb", (r) =>
    r.fulfill({ contentType: "model/gltf-binary", body: bytes }),
  );
  await page.goto(
    (process.env.AUDIT_URL ?? "http://127.0.0.1:5197") + "/__goblin_preview",
  );
  const info = await page.evaluate(async () => {
    const src = await (await fetch("/src/view/appearance.mjs")).text();
    const T = await import(src.match(/import \* as T from "([^"]+)"/)[1]);
    const { GLTFLoader } =
      await import("/node_modules/three/examples/jsm/loaders/GLTFLoader.js");
    const a = await new GLTFLoader().loadAsync("/__goblin.glb");
    const model = a.scene;
    const scene = new T.Scene();
    scene.background = new T.Color("#202b2b");
    scene.add(model, new T.HemisphereLight(0xf2f0e6, 0x545b50, 2.0));
    const key = new T.DirectionalLight(0xffeed7, 3);
    key.position.set(3, 5, 6);
    scene.add(key);
    const rim = new T.DirectionalLight(0xc6e1ed, 1.5);
    rim.position.set(-3, 2, -3);
    scene.add(rim);
    const floor = new T.Mesh(
      new T.PlaneGeometry(20, 20),
      new T.MeshStandardMaterial({ color: "#202b2b", roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    scene.add(floor);
    const renderer = new T.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(900, 900);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    document.body.append(renderer.domElement);
    const camera = new T.OrthographicCamera(-1.5, 1.5, 1.5, -1.5, 0.01, 50);
    const mixer = new T.AnimationMixer(model);
    const helmet = [];
    model.traverse((o) => {
      if (o.userData.pilotPart === "helmet") helmet.push(o);
      if (o.isMesh) o.frustumCulled = false;
    });
    function frame(
      name,
      seconds,
      view = "quarter",
      bare = false,
      close = false,
    ) {
      for (const o of helmet) o.visible = !bare;
      mixer.stopAllAction();
      const clip = a.animations.find((c) => c.name === name);
      if (!clip) throw Error("Missing " + name);
      const action = mixer.clipAction(clip);
      action.reset().setLoop(T.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.play();
      mixer.setTime(Math.min(seconds, clip.duration));
      const zoom = close ? 0.69 : 1.45;
      camera.left = -zoom;
      camera.right = zoom;
      camera.top = zoom;
      camera.bottom = -zoom;
      camera.updateProjectionMatrix();
      const positions = {
        front: [0, 1.9, 6],
        quarter: [3, 2.8, 6],
        side: [6, 2, 0],
        back: [0, 1.9, -6],
      };
      camera.position.set(...positions[view]);
      camera.lookAt(0, close ? 1.03 : 0.65, 0);
      model.updateMatrixWorld(true);
      renderer.render(scene, camera);
    }
    window.preview = { frame, renderer, model, clips: a.animations };
    frame("Idle", 0.2);
    return {
      clips: a.animations.map((c) => ({ name: c.name, duration: c.duration })),
      helmetGroups: helmet.length,
    };
  });

  for (const [name, view, bare, close] of [
    ["equipped", "quarter", false, false],
    ["front", "front", false, false],
    ["side", "side", false, false],
    ["back", "back", false, false],
    ["bare-head", "quarter", true, true],
    ["bare-front", "front", true, true],
  ]) {
    await page.evaluate(
      (v) => window.preview.frame("Idle", 0.2, v.view, v.bare, v.close),
      { view, bare, close },
    );
    await page.screenshot({ path: path.join(out, name + ".png") });
  }
  const frames = path.join(out, "frames");
  await fs.mkdir(frames, { recursive: true });
  let idx = 0;
  const segments = [];
  for (const [label, name, repeats, hold] of [
    ["Idle", "Idle", 3, 0],
    ["Walk", "Walking_A", 3, 0],
    ["Weapon attack", "1H_Melee_Attack_Slice_Diagonal", 3, 0],
    ...(info.clips.some((c) => c.name === "Unarmed_Melee_Attack_Punch_A")
      ? [["Melee backup", "Unarmed_Melee_Attack_Punch_A", 2, 0]]
      : []),
    ["Hit reaction", "Hit_A", 2, 0],
    ["Death", "Death_A_Pose", 1, 1],
  ]) {
    const clip = info.clips.find((c) => c.name === name);
    const count = Math.ceil(clip.duration * 30);
    const start = idx;
    for (let repeat = 0; repeat < repeats; repeat++)
      for (let i = 0; i < count; i++) {
        await page.evaluate((v) => window.preview.frame(v.name, v.t), {
          name,
          t: i / 30,
        });
        await page.screenshot({
          path: path.join(frames, String(idx++).padStart(4, "0") + ".png"),
        });
      }
    for (let i = 0; i < hold * 30; i++) {
      await page.evaluate((v) => window.preview.frame(v.name, v.t), {
        name,
        t: clip.duration,
      });
      await page.screenshot({
        path: path.join(frames, String(idx++).padStart(4, "0") + ".png"),
      });
    }
    segments.push({ label, clip: name, startFrame: start, endFrame: idx - 1 });
  }
  if (errors.length) throw Error(errors.join("\n"));
  await fs.writeFile(
    path.join(out, "capture.json"),
    JSON.stringify(
      {
        input,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        ...info,
        frames: idx,
        fps: 30,
        segments,
        errors,
        scope:
          "Private preview at source animation speed; no gameplay performance claim",
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ frames: idx, segments, errors }));
} finally {
  await browser.close();
}
