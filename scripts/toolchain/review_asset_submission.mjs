// Separate neutral/pose render of a worker GLB before game integration.
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
const [input, output, scaleText = "0.85"] = process.argv.slice(2);
if (!input || !output)
  throw Error(
    "Usage: node review_asset_submission.mjs input.glb output-dir [scale]",
  );
const scale = Number(scaleText);
if (!Number.isFinite(scale) || scale <= 0 || scale > 2)
  throw Error("Invalid review scale");
const bytes = await fs.readFile(input);
if (bytes.length > 20_000_000 || bytes.readUInt32LE(0) !== 0x46546c67)
  throw Error("Invalid/oversized GLB submission");
const manifest = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
if (
  [...(manifest.buffers ?? []), ...(manifest.images ?? [])].some((x) => x.uri)
)
  throw Error("Review requires embedded GLB resources");
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--mute-audio"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1536, height: 1400 },
  });
  const warnings = [];
  page.on("console", (m) => {
    if (m.type() === "warning" || m.type() === "error") warnings.push(m.text());
  });
  await page.route("**/__asset_review__", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: "<!doctype html><body></body>",
    }),
  );
  await page.route("**/__worker.glb", (r) =>
    r.fulfill({ contentType: "model/gltf-binary", body: bytes }),
  );
  await page.goto(
    (process.env.AUDIT_URL ?? "http://127.0.0.1:5187") + "/__asset_review__",
  );
  const result = await page.evaluate(async (scale) => {
    const source = await (await fetch("/src/view/appearance.mjs")).text();
    const threeURL = source.match(/import \* as T from "([^"]+)"/)?.[1];
    if (!threeURL) throw Error("Cannot locate the game Three.js module");
    const T = await import(threeURL);
    const { GLTFLoader } =
      await import("/node_modules/three/examples/jsm/loaders/GLTFLoader.js");
    const { loadAnimationLibrary, gameClips } =
      await import("/src/view/animation-library.mjs");
    const loader = new GLTFLoader();
    await loadAnimationLibrary(loader);
    const asset = await loader.loadAsync("/__worker.glb"),
      model = asset.scene;
    model.scale.multiplyScalar(scale);
    model.traverse((o) => {
      if (o.isMesh) o.frustumCulled = false;
    });
    const scene = new T.Scene();
    scene.background = new T.Color("#252d33");
    scene.add(model, new T.HemisphereLight(0xffffff, 0x586575, 2.2));
    const key = new T.DirectionalLight(0xffe4c6, 3);
    key.position.set(3, 6, 4);
    scene.add(key);
    const renderer = new T.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(512, 512);
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    const camera = new T.OrthographicCamera(-1.6, 1.6, 1.6, -1.6, 0.1, 50),
      mixer = new T.AnimationMixer(model),
      clips = gameClips();
    const poses = [],
      shots = [];
    function sample() {
      model.updateMatrixWorld(true);
      let finite = true,
        fingerprint = 0,
        count = 0;
      const bounds = new T.Box3();
      model.traverse((o) => {
        if (!o.isMesh) return;
        o.skeleton?.update();
        for (let i = 0; i < o.geometry.attributes.position.count; i++) {
          const v = new T.Vector3();
          o.getVertexPosition(i, v);
          v.applyMatrix4(o.matrixWorld);
          finite &&= [v.x, v.y, v.z].every(Number.isFinite);
          bounds.expandByPoint(v);
          fingerprint += v.x * 0.31 + v.y * 0.73 + v.z * 0.29;
          count++;
        }
      });
      return {
        finite,
        fingerprint,
        count,
        min: bounds.min.toArray(),
        max: bounds.max.toArray(),
      };
    }
    for (const name of [
      "Idle",
      "Walking_A",
      "1H_Melee_Attack_Slice_Diagonal",
      "Hit_A",
      "Death_A_Pose",
    ]) {
      mixer.stopAllAction();
      const clip = clips.find((c) => c.name === name);
      if (!clip) throw Error("Missing shared clip " + name);
      mixer.clipAction(clip).play();
      mixer.update(Math.min(0.3, clip.duration * 0.4));
      poses.push({ name, ...sample() });
      for (const [view, position] of name === "Idle"
        ? [
            ["front", [0, 2, 5]],
            ["side", [5, 2, 0]],
            ["back", [0, 2, -5]],
            ["three-quarter", [4, 3.5, 5]],
          ]
        : [[name, [4, 3.5, 5]]]) {
        camera.position.set(...position);
        camera.lookAt(0, 1.1, 0);
        renderer.render(scene, camera);
        shots.push({
          name: view,
          png: renderer.domElement.toDataURL("image/png"),
        });
      }
    }
    const drawCalls = renderer.info.render.calls;
    renderer.dispose();
    return {
      poses,
      shots,
      drawCalls,
      boneNames: model.getObjectsByProperty("isBone", true).map((b) => b.name),
    };
  }, scale);
  for (const s of result.shots)
    await fs.writeFile(
      path.join(output, s.name + ".png"),
      Buffer.from(s.png.split(",")[1], "base64"),
    );
  const report = {
    input: path.resolve(input),
    bytes: bytes.length,
    textures: manifest.textures?.length ?? 0,
    embeddedImages: manifest.images?.length ?? 0,
    scale,
    materials: manifest.materials?.length ?? 0,
    meshCount: manifest.meshes?.length ?? 0,
    triangles: (manifest.meshes ?? [])
      .flatMap((m) => m.primitives)
      .reduce(
        (n, p) =>
          n + manifest.accessors[p.indices ?? p.attributes.POSITION].count / 3,
        0,
      ),
    ...result,
    warnings,
  };
  delete report.shots;
  if (
    result.poses.some((p) => !p.finite || p.count === 0) ||
    new Set(result.poses.map((p) => Math.round(p.fingerprint * 1000))).size !==
      5
  )
    throw Error("Invalid or unchanged animated geometry");
  if (
    warnings.some((w) =>
      /PropertyBinding|No target node|couldn.t bind/i.test(w),
    )
  )
    throw Error("Animation binding warning: " + warnings.join("\n"));
  await fs.writeFile(
    path.join(output, "review.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  const cards = result.shots
    .map((s) => `<article><h2>${s.name}</h2><img src="${s.png}"></article>`)
    .join("");
  await page.setContent(
    "<style>body{margin:0;background:#172229;color:#ead9ad;font:16px system-ui}main{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}article{text-align:center}img{width:100%}h2{font-size:18px;margin:6px}</style><main>" +
      cards +
      "</main>",
  );
  await page.evaluate(() =>
    Promise.all([...document.images].map((i) => i.decode())),
  );
  await page.screenshot({
    path: path.join(output, "contact-sheet.png"),
    fullPage: true,
  });
  console.log(
    JSON.stringify({
      ...report,
      poses: report.poses.map((p) => ({
        name: p.name,
        finite: p.finite,
        count: p.count,
      })),
    }),
  );
} finally {
  await browser.close();
}
