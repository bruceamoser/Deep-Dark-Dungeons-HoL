import { chromium, expect } from "@playwright/test";
const gear = process.argv.includes("--gear");
const browser = await chromium.launch({
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({
      viewport: { width: 1600, height: 1000 },
    }),
    errors = [],
    warnings = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.text().includes("No target node found")) warnings.push(m.text());
  });
  await page.goto("http://127.0.0.1:5198");
  await page.waitForFunction(() => window.__ddd, null, { timeout: 45000 });
  const results = await page.evaluate(async (gear) => {
    const T = await import("/node_modules/three/build/three.module.js");
    const { equipmentAppearance } = await import("/src/view/appearance.mjs");
    const { HERO_AVATARS } = await import("/src/core/hero-avatars.mjs");
    const { game, scene: world } = window.__ddd;
    game.pause();
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:fixed;inset:0;z-index:99999";
    document.body.append(canvas);
    const renderer = new T.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(1600, 1000);
    renderer.setScissorTest(true);
    renderer.setClearColor("#17232d");
    renderer.toneMapping = T.ACESFilmicToneMapping;
    const results = [];
    let n = 0;
    for (const a of HERO_AVATARS.filter((a) => a.url)) {
      const hero = structuredClone(game.party[0]);
      hero.draft.appearance = { avatar: a.id, build: "balanced" };
      hero.preview.inventory.items = gear
        ? [
            {
              instanceId: "helm",
              carried: true,
              worn: true,
              slot: "head",
              effects: [],
            },
            {
              instanceId: "bow",
              catalogId: "item-ordinary-ranged-weapon",
              carried: true,
              held: true,
              effects: [],
            },
          ]
        : [];
      hero.torch = { held: false };
      const { model, clips } = equipmentAppearance(world.assets, hero);
      const visible = [];
      model.traverse((o) => {
        if (o.isMesh && o.visible) visible.push(o.name);
      });
      const scene = new T.Scene();
      scene.add(model);
      scene.add(new T.HemisphereLight(0xd4e5f1, 0x3c2920, 2));
      const light = new T.DirectionalLight(0xffe1b9, 3);
      light.position.set(2, 4, 3);
      scene.add(light);
      const mixer = new T.AnimationMixer(model);
      const idle = clips.find((c) => c.name === "Idle");
      if (idle) mixer.clipAction(idle).play();
      mixer.update(0.2);
      model.rotation.y = 0.25;
      model.updateMatrixWorld(true);
      const camera = new T.PerspectiveCamera(32, 320 / 250, 0.1, 100);
      camera.position.set(0, 1.1, 5.4);
      camera.lookAt(0, 1, 0);
      const x = (n % 5) * 320,
        y = 750 - Math.floor(n / 5) * 250;
      renderer.setViewport(x, y, 320, 250);
      renderer.setScissor(x, y, 320, 250);
      renderer.render(scene, camera);
      const label = document.createElement("span");
      label.textContent = a.label;
      label.style.cssText = `position:fixed;left:${x + 15}px;top:${1000 - y - 250 + 8}px;color:#e6d1a3;z-index:100000;font:15px sans-serif`;
      document.body.append(label);
      results.push({
        id: a.id,
        resolved: model.userData.avatar,
        visible: visible.length,
        paletteIntact: !model
          .getObjectsByProperty("isMesh", true)
          .some((m) =>
            m.material.customProgramCacheKey().includes("identity-"),
          ),
      });
      mixer.stopAllAction();
      model.userData.dispose();
      n++;
    }
    return results;
  }, gear);
  for (const r of results) {
    expect(r.resolved).toBe(r.id);
    expect(r.visible).toBeGreaterThan(3);
    expect(r.paletteIntact).toBe(true);
  }
  await page.screenshot({
    clip: {
      x: 0,
      y: 0,
      width: 1600,
      height: Math.ceil(results.length / 5) * 250,
    },
    path: gear
      ? "test-results/kaykit-hero-gear.png"
      : "test-results/kaykit-hero-choices.png",
  });
  expect(errors).toEqual([]);
  expect(warnings).toEqual([]);
  console.log(
    "All authored avatar models loaded, animated, rendered with intact palettes:",
    results.length,
  );
} finally {
  await browser.close();
}
