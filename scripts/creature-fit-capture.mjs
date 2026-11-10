// Read-only evidence capture. Start Vite first; never touches saves or running games.
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "@playwright/test";
import { CREATURE_ROSTER } from "../src/core/creature-roster.mjs";
const base = process.env.AUDIT_URL ?? "http://127.0.0.1:5187";
const out = path.resolve(
  process.env.AUDIT_OUT ?? "test-results/creature-fit-audit",
);
await fs.mkdir(out, { recursive: true });
let ratings;
try {
  ratings =
    process.env.AUDIT_RATINGS === "none"
      ? undefined
      : JSON.parse(
          await fs.readFile(
            process.env.AUDIT_RATINGS ??
              "docs/audits/2026-11-10-creature-fit.json",
            "utf8",
          ),
        );
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const data = JSON.parse(
  await fs.readFile("public/vendor/hol/data/creatures.json", "utf8"),
);
const selected = process.env.AUDIT_IDS?.split(",");
const rows = Object.entries(CREATURE_ROSTER)
  .filter(([id]) => !selected || selected.includes(id))
  .map(([id, casting]) => {
    const c = data.creatures.find((c) => c.id === id);
    return {
      id,
      name: c.name,
      casting,
      flavor: c.reference.flavorMarkdown,
      size: c.size,
      portrait: c.portrait,
      source: c.source,
    };
  });
if (ratings) {
  const ids = ratings.rows.map((r) => r.id);
  if (
    ids.length !== rows.length ||
    new Set(ids).size !== rows.length ||
    rows.some((r) => !ids.includes(r.id))
  )
    throw new Error("Ratings do not cover the current roster exactly.");
  for (const r of ratings.rows) {
    if (
      r.scores.length !== 6 ||
      r.scores.some((v) => !Number.isInteger(v) || v < 0 || v > 5)
    )
      throw new Error(`Invalid components: ${r.id}`);
    const raw = r.scores.reduce(
      (n, v, i) => n + (v * ratings.weights[i]) / 5,
      0,
    );
    if (raw !== r.raw || Math.min(raw, r.cap ?? 100) !== r.score)
      throw new Error(`Invalid total: ${r.id}`);
  }
}
const captureCommit = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
await fs.writeFile(
  path.join(out, "capture.json"),
  JSON.stringify(
    {
      captureCommit,
      reviewCommit: ratings?.gameCommit,
      capturedAt: new Date().toISOString(),
      note: "Renders use current working-tree source. Ratings are fixed editorial review values; rerendering does not rescore.",
    },
    null,
    2,
  ),
);
const browser = await chromium.launch({
  headless: true,
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1560, height: rows.length <= 4 ? 1040 : 1700 },
    deviceScaleFactor: 1,
  });
  await page.route("**/__creature-fit__", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><body></body>",
    }),
  );
  await page.goto(`${base}/__creature-fit__`, {
    waitUntil: "domcontentloaded",
  });
  console.log("Loading current rendering code/assets");
  page.on("console", (m) => {
    if (m.type() === "error") console.error(m.text());
  });
  const rendered = await page.evaluate(async (rows) => {
    // Vite can timestamp changed dependencies. Import the same module instances
    // as the appearance factory, otherwise a second animation library stays empty.
    const compiled = await (await fetch("/src/view/appearance.mjs")).text();
    const threeURL = compiled.match(/import \* as T from "([^"]+)"/)?.[1];
    const catalogURL = compiled.match(
      /from "([^"]*creature-roster\.mjs[^"]*)"/,
    )?.[1];
    const animationURL = compiled.match(
      /from "([^"]*animation-library\.mjs[^"]*)"/,
    )?.[1];
    if (!threeURL || !catalogURL || !animationURL)
      throw Error("Cannot resolve live appearance dependencies");
    const T = await import(threeURL);
    const { GLTFLoader } =
      await import("/node_modules/three/examples/jsm/loaders/GLTFLoader.js");
    const { CREATURE_MODELS, HUMANOID_MODELS } = await import(catalogURL);
    const { equipmentAppearance } = await import("/src/view/appearance.mjs");
    const { loadAnimationLibrary } = await import(animationURL);
    const loader = new GLTFLoader();
    await loadAnimationLibrary(loader);
    const urls = {
      ...CREATURE_MODELS,
      sword: "/assets/gear/adventurers/sword_1handed.gltf",
      bow: "/assets/gear/adventurers/bow_withString.gltf",
      shield: "/assets/gear/adventurers/shield_round_color.gltf",
    };
    const assets = new Map(
      await Promise.all(
        Object.entries(urls).map(async ([k, url]) => {
          const a = await loader.loadAsync(url);
          a.scene.traverse((o) => {
            if (o.isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
              o.material.roughness = 0.88;
            }
          });
          return [k, a];
        }),
      ),
    );
    const renderer = new T.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(300, 320);
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    const result = [];
    for (const row of rows) {
      console.log(row.id);
      const scene = new T.Scene();
      scene.background = new T.Color("#252d33");
      scene.add(new T.HemisphereLight(0xffffff, 0x586575, 2.2));
      const key = new T.DirectionalLight(0xffe4c6, 3);
      key.position.set(3, 6, 4);
      scene.add(key);
      const { model, clips } = equipmentAppearance(
        assets,
        { type: row.id },
        true,
      );
      if (
        HUMANOID_MODELS.has(row.casting.model) &&
        !clips.some((c) => c.name === "Idle")
      )
        throw Error("Missing actual idle animation for " + row.id);
      model.traverse((o) => {
        if (o.isMesh) o.frustumCulled = false;
      });
      scene.add(model);
      const mixer = new T.AnimationMixer(model);
      const clip = clips.find((c) => c.name === "Idle") ?? clips[0];
      if (clip) {
        mixer.clipAction(clip).play();
        mixer.update(0.3);
      }
      model.userData.animate?.(0.3, false);
      model.updateMatrixWorld(true);
      const box = new T.Box3().setFromObject(model);
      const camera = new T.OrthographicCamera(-1.6, 1.6, 1.8, -1.613, 0.1, 50);
      // Fixed scale across all cards: do not magnify a tiny model to hide scale errors.
      const shots = [];
      for (const pos of [
        [4, 3.5, 5],
        [-4, 2.8, -5],
      ]) {
        camera.position.set(...pos);
        camera.lookAt(0, 1, 0);
        renderer.render(scene, camera);
        shots.push(renderer.domElement.toDataURL("image/png"));
      }
      result.push({
        id: row.id,
        height: box.max.y - box.min.y,
        drawCalls: renderer.info.render.calls,
        renderedTriangles: renderer.info.render.triangles,
        shots,
      });
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      model.userData.dispose?.();
      model.traverse((o) => {
        if (o.isSkinnedMesh) o.skeleton.dispose();
      });
    }
    renderer.dispose();
    return result;
  }, rows);
  for (const r of rendered) {
    for (let i = 0; i < r.shots.length; i++)
      await fs.writeFile(
        path.join(out, `${r.id}-${i}.png`),
        Buffer.from(r.shots[i].split(",")[1], "base64"),
      );
  }
  const evidence = [];
  for (const row of rows) {
    console.log(row.id);
    const r = rendered.find((x) => x.id === row.id);
    const file = `public/vendor/hol/assets/bestiary/${row.id}.webp`;
    const portrait =
      "data:image/webp;base64," + (await fs.readFile(file)).toString("base64");
    evidence.push({
      ...row,
      height: r.height,
      drawCalls: r.drawCalls,
      renderedTriangles: r.renderedTriangles,
      portraitData: portrait,
      shots: r.shots,
    });
  }
  const escape = (s) =>
    String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll('"', "&quot;");
  const cards = evidence.map(
    (r, i) =>
      `<article data-score="${ratings?.rows.find((x) => x.id === r.id)?.score ?? ""}"><h2>${i + 1}. ${escape(r.name)} <small>${escape(r.casting.model)} · ${escape(r.casting.weapon)}</small></h2><div>${ratings ? escape(ratings.rows.find((x) => x.id === r.id).score + " / 100 · " + ratings.rows.find((x) => x.id === r.id).notes) : ""}</div><div class="pictures"><img src="${r.portraitData}"><img src="${r.shots[0]}"><img src="${r.shots[1]}"></div><p>${escape(r.flavor)}</p></article>`,
  );
  const style =
    "<style>*{box-sizing:border-box}body{margin:0;background:#10191d;color:#f2ead8;font:14px system-ui}main{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px}article{background:#243038;padding:10px;min-height:470px}h2{font-size:18px;margin:0 0 5px}small{display:block;font-size:12px;color:#e1c785}.pictures{display:flex;height:260px}.pictures img{width:33.333%;object-fit:contain}p{font-size:13px;line-height:1.4;margin:5px}header{padding:16px}</style>";
  await fs.writeFile(
    path.join(out, "comparison.html"),
    `${style}<header><h1>Creature fit evidence — source art / current front / current rear</h1>Reviewed source: ${escape(ratings?.gameCommit ?? "unrated")}. Capture checkout: ${escape(captureCommit)} (plus any local changes). Scores are fixed review values; rerendering does not rescore. Fixed model scale; neutral inspection lighting. Default idle at 0.3s. Not dungeon lighting or an animation audit. Scores are editorial judgments, not measured similarity percentages.<p><button onclick="[...document.querySelectorAll('article')].sort((a,b)=>Number(a.dataset.score)-Number(b.dataset.score)).forEach(a=>document.querySelector('main').append(a))">Lowest score first</button> <button onclick="[...document.querySelectorAll('article')].sort((a,b)=>Number(b.dataset.score)-Number(a.dataset.score)).forEach(a=>document.querySelector('main').append(a))">Highest score first</button></p></header><main>${cards.join("")}</main>`,
  );
  await fs.writeFile(
    path.join(out, "evidence.json"),
    JSON.stringify(
      evidence.map(({ shots, portraitData, ...r }) => r),
      null,
      2,
    ),
  );
  for (let i = 0; i < cards.length; i += 8) {
    await page.setContent(
      style + `<main>${cards.slice(i, i + 8).join("")}</main>`,
    );
    await page.evaluate(() =>
      Promise.all([...document.images].map((img) => img.decode())),
    );
    await page.screenshot({
      path: path.join(out, `sheet-${String(i / 8 + 1).padStart(2, "0")}.png`),
      fullPage: true,
    });
  }
  console.log(`Captured ${rows.length} source/model pairs in ${out}`);
} finally {
  await browser.close();
}
