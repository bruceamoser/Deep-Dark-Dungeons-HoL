// Render the six exact GLBs side by side without opening a game or save.
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chromium } from "@playwright/test";

const [root, output] = process.argv.slice(2);
if (!root || !output)
  throw Error("Provide the fitted asset root and review directory");
const variants = ["male", "female"];
const looks = ["base", "scout", "light-armor"];
const files = new Map();
for (const variant of variants)
  for (const look of looks)
    files.set(
      `/${variant}-${look}.glb`,
      await fs.readFile(path.join(root, variant, "fit", `${look}.glb`)),
    );
const frames = path.join(output, "frames");
await fs.mkdir(frames, { recursive: true });
const browser = await chromium.launch({ args: ["--mute-audio"] });
const fps = 24;
const plan = [
  ["base", "Idle", 3, "Base bodies", true],
  ["scout", "Idle", 1.5, "Scout clothing · Ready"],
  ["scout", "Walking_A", 2.3, "Scout clothing · Walk"],
  [
    "scout",
    "1H_Melee_Attack_Slice_Diagonal",
    1.4,
    "Scout clothing · Sword strike",
  ],
  ["light-armor", "Idle", 3, "Light leather armor", true],
  ["light-armor", "Walking_A", 2.3, "Light leather armor · Walk"],
  [
    "light-armor",
    "1H_Melee_Attack_Slice_Diagonal",
    1.4,
    "Light leather armor · Sword strike",
  ],
  ["light-armor", "Block_A", 1.3, "Light leather armor · Shield block"],
  ["light-armor", "Hit_A", 1, "Light leather armor · Hit reaction"],
  ["light-armor", "Death_A_Pose", 2.1, "Light leather armor · Fall"],
];
try {
  const page = await browser.newPage({
    viewport: { width: 1100, height: 660 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/__halfling", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><meta charset="utf-8"><style>
      body{margin:0;background:#212725;color:#ece3d2;font-family:Georgia,serif}
      header,footer{position:absolute;left:0;width:100%;text-align:center}
      header{top:24px;font-size:28px}footer{bottom:22px;display:flex;justify-content:center;gap:360px;font-size:21px}
      canvas{display:block}</style><header></header><footer><span>Male halfling</span><span>Female halfling</span></footer>`,
    }),
  );
  for (const [name, bytes] of files)
    await page.route(`**${name}`, (route) =>
      route.fulfill({ body: bytes, contentType: "model/gltf-binary" }),
    );
  await page.goto(
    `${process.env.AUDIT_URL ?? "http://127.0.0.1:5198"}/__halfling`,
  );
  const metadata = await page.evaluate(
    async ({ variants, looks }) => {
      const source = await (await fetch("/src/view/appearance.mjs")).text();
      const T = await import(source.match(/import \* as T from "([^"]+)"/)[1]);
      const { GLTFLoader } =
        await import("/node_modules/three/examples/jsm/loaders/GLTFLoader.js");
      const loader = new GLTFLoader();
      const groups = {};
      const scene = new T.Scene();
      scene.background = new T.Color("#262d29");
      scene.add(new T.HemisphereLight(0xfff2d8, 0x5d695f, 2.1));
      for (const [color, intensity, position] of [
        [0xffecd6, 2.7, [3, 5, 6]],
        [0xc0d7e6, 1.4, [-3, 3, -4]],
      ]) {
        const light = new T.DirectionalLight(color, intensity);
        light.position.set(...position);
        scene.add(light);
      }
      const floor = new T.Mesh(
        new T.PlaneGeometry(24, 24),
        new T.MeshStandardMaterial({ color: "#303933", roughness: 1 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.015;
      scene.add(floor);
      const renderer = new T.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true,
      });
      renderer.setSize(innerWidth, innerHeight);
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.03;
      document.body.append(renderer.domElement);
      const camera = new T.OrthographicCamera(
        -1.65,
        1.65,
        0.99,
        -0.99,
        0.01,
        30,
      );
      const summaries = {};
      for (const look of looks) {
        groups[look] = [];
        for (const [i, variant] of variants.entries()) {
          const asset = await loader.loadAsync(`/${variant}-${look}.glb`);
          asset.scene.position.x = i === 0 ? -0.74 : 0.74;
          asset.scene.visible = false;
          scene.add(asset.scene);
          const mixer = new T.AnimationMixer(asset.scene);
          let skinnedMeshes = 0;
          let triangles = 0;
          asset.scene.traverse((obj) => {
            if (obj.isSkinnedMesh) {
              obj.frustumCulled = false;
              skinnedMeshes++;
            }
            if (obj.isMesh)
              triangles +=
                (obj.geometry.index?.count ??
                  obj.geometry.attributes.position.count) / 3;
          });
          summaries[`${variant}-${look}`] = {
            triangles,
            skinnedMeshes,
            clips: asset.animations.map((clip) => clip.name),
          };
          groups[look].push({ asset, mixer });
        }
      }
      window.frame = (look, clip, seconds, title, angle, loop) => {
        document.querySelector("header").textContent = title;
        for (const [name, entries] of Object.entries(groups))
          for (const { asset, mixer } of entries) {
            asset.scene.visible = name === look;
            if (!asset.scene.visible) continue;
            mixer.stopAllAction();
            const animation = asset.animations.find(
              (item) => item.name === clip,
            );
            if (!animation) throw Error(`Missing clip ${clip}`);
            const action = mixer.clipAction(animation);
            action.reset().setLoop(T.LoopOnce, 1);
            action.clampWhenFinished = true;
            action.play();
            mixer.setTime(
              loop
                ? seconds % animation.duration
                : Math.min(seconds, animation.duration),
            );
            asset.scene.rotation.y = angle;
            asset.scene.updateMatrixWorld(true);
          }
        camera.position.set(1.0, 2.05, 6);
        camera.lookAt(0, 0.67, 0);
        renderer.render(scene, camera);
      };
      return summaries;
    },
    { variants, looks },
  );
  let index = 0;
  for (const [look, clip, duration, title, turn] of plan) {
    for (let i = 0; i < Math.round(duration * fps); i++) {
      const t = i / fps;
      await page.evaluate(
        (args) => window.frame(...args),
        [
          look,
          clip,
          t,
          title,
          turn ? (t / duration) * Math.PI * 2 - 0.13 : -0.24,
          clip === "Walking_A" || clip === "Idle",
        ],
      );
      await page.screenshot({
        path: path.join(frames, `${String(index++).padStart(4, "0")}.png`),
      });
    }
  }
  if (errors.length) throw Error(errors.join("\n"));
  await fs.writeFile(
    path.join(output, "verification.json"),
    JSON.stringify(
      {
        frames: index,
        fps,
        errors,
        metadata,
        hashes: Object.fromEntries(
          [...files].map(([name, bytes]) => [
            name,
            createHash("sha256").update(bytes).digest("hex"),
          ]),
        ),
      },
      null,
      2,
    ),
  );
  execFileSync("ffmpeg", [
    "-loglevel",
    "error",
    "-y",
    "-framerate",
    String(fps),
    "-i",
    path.join(frames, "%04d.png"),
    "-frames:v",
    String(index),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "19",
    "-movflags",
    "+faststart",
    path.join(output, "halfling-motion.mp4"),
  ]);
} finally {
  await browser.close();
}
