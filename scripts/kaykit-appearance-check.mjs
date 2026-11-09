import { waitForGame } from "./ui-session.mjs";
import { chromium, expect } from "@playwright/test";
import fs from "node:fs/promises";
await fs.mkdir("test-results", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
  });
  const errors = [];
  const bindingWarnings = [];
  page.on("console", (m) => {
    if (m.text().includes("No target node found for track"))
      bindingWarnings.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5198");
  await waitForGame(page);
  await page.locator('[data-hero="0"]').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/kaykit-sheet.png" });
  const result = await page.evaluate(async () => {
    const T = await import("/node_modules/three/build/three.module.js");
    const { clone } =
      await import("/node_modules/three/examples/jsm/utils/SkeletonUtils.js");
    const { equipmentAppearance } = await import("/src/view/appearance.mjs");
    const { scene: gameScene, game } = window.__ddd;
    const assets = gameScene.assets;
    const panel = document.createElement("div");
    Object.assign(panel.style, {
      position: "fixed",
      inset: "0",
      background: "#18212b",
      zIndex: "99999",
      display: "grid",
      gridTemplateColumns: "repeat(6,1fr)",
      gridTemplateRows: "repeat(2,1fr)",
    });
    document.body.append(panel);
    const results = [];
    for (const mode of ["Pack original", "Game appearance"]) {
      for (const name of [
        "Knight",
        "Mage",
        "Rogue",
        "Barbarian",
        "Ranger",
        "Druid",
      ]) {
        const hero = structuredClone(game.party[0]);
        hero.model = name;
        hero.preview.inventory.items = [];
        const output =
          mode === "Pack original"
            ? { model: clone(assets.get(name).scene) }
            : equipmentAppearance(assets, hero);
        const model = output.model;
        const cell = document.createElement("div");
        cell.style.cssText =
          "position:relative;color:#eee;font:16px sans-serif;text-align:center;";
        cell.textContent = `${name} · ${mode}`;
        panel.append(cell);
        const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(260, 450);
        renderer.setPixelRatio(1);
        renderer.toneMapping = T.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.35;
        cell.append(renderer.domElement);
        const scene = new T.Scene();
        scene.add(new T.HemisphereLight(0xd4e5f1, 0x3c2920, 2));
        const key = new T.DirectionalLight(0xffd9a5, 3);
        key.position.set(2, 4, 3);
        scene.add(key);
        const rim = new T.DirectionalLight(0x7ed4d0, 4);
        rim.position.set(-3, 2, -2);
        scene.add(rim);
        scene.add(model);
        model.rotation.y = 0.3;
        model.updateMatrixWorld(true);
        const box = new T.Box3().setFromObject(model);
        const size = box.getSize(new T.Vector3());
        const center = box.getCenter(new T.Vector3());
        const camera = new T.PerspectiveCamera(32, 260 / 450, 0.1, 100);
        camera.position
          .copy(center)
          .add(new T.Vector3(0, size.y * 0.07, size.y * 2.5));
        camera.lookAt(center);
        renderer.render(scene, camera);
        if (mode === "Game appearance") {
          const visible = [];
          model.traverse((o) => {
            if (o.isMesh && o.visible) visible.push(o.name);
          });
          results.push({
            name,
            visible,
            clips: output.clips.map((c) => c.name),
          });
        }
      }
    }
    for (const tier of ["light", "medium", "heavy"]) {
      const hero = structuredClone(game.party[0]);
      hero.model = "Knight";
      hero.preview.inventory.items = [
        { carried: true, worn: true, catalogId: `item-ordinary-${tier}-armor` },
      ];
      const { model } = equipmentAppearance(assets, hero);
      const parts = [];
      model.traverse((o) => {
        if (o.isSkinnedMesh && o.visible && o.name.startsWith("Equipped_"))
          parts.push(o.name);
      });
      if (parts.length !== 5)
        throw new Error(
          `${tier} armor: expected five rebound parts, got ${parts.length}`,
        );
      model.userData.dispose();
    }
    return results;
  });
  await page.screenshot({ path: "test-results/kaykit-comparison.png" });
  if (!process.argv.includes("--capture-only")) {
    for (const row of result) {
      expect(
        row.visible.some((n) => /_Head$/.test(n)),
        `${row.name} authored head`,
      ).toBe(true);
      expect(
        row.visible.some((n) => /_Body$/.test(n)),
        `${row.name} authored body`,
      ).toBe(true);
      expect(row.visible).not.toContain("Individual face");
      expect(row.clips).toContain("Idle");
      expect(row.clips).toContain("Walking_A");
    }
    expect(result.find((r) => r.name === "Knight").visible).toContain(
      "Knight_Helmet",
    );
    expect(result.find((r) => r.name === "Mage").visible).toContain("Mage_Hat");
    expect(errors).toEqual([]);
    expect(bindingWarnings).toEqual([]);
  }
  console.log(JSON.stringify({ errors, result }, null, 2));
} finally {
  await browser.close();
}
