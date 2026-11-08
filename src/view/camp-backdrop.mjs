import * as T from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { equipmentAppearance } from "./appearance.mjs";

// A separate, disposable scene: shared source meshes/textures are never mutated.
export function campBackdrop(canvas, assets, heroes) {
  const renderer = new T.WebGLRenderer({
    canvas,
    alpha: false,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  const scene = new T.Scene();
  scene.background = new T.Color(0x0b151c);
  scene.fog = new T.FogExp2(0x0b151c, 0.055);
  const camera = new T.PerspectiveCamera(39, 1, 0.1, 70);
  camera.position.set(8, 6.3, 10);
  camera.lookAt(0, 1, 0);
  scene.add(new T.HemisphereLight(0x8da5bc, 0x493320, 1.5));
  const moon = new T.DirectionalLight(0x9dbdd9, 2);
  moon.position.set(-8, 10, -6);
  scene.add(moon);
  const fireLight = new T.PointLight(0xffa350, 65, 18, 1.6);
  fireLight.position.set(0, 1.3, 0);
  scene.add(fireLight);
  const owned = [];
  const actors = [];
  const mixers = [];
  function mesh(geo, mat, pos = [0, 0, 0]) {
    const m = new T.Mesh(geo, mat);
    m.position.set(...pos);
    scene.add(m);
    owned.push(geo, mat);
    return m;
  }
  function prop(name, pos, scale) {
    const source = assets?.get(name)?.scene;
    if (!source) return;
    const model = clone(source);
    const box = new T.Box3().setFromObject(model);
    const size = box.getSize(new T.Vector3());
    model.scale.setScalar(scale / Math.max(size.x, size.y, size.z));
    model.position.set(...pos);
    model.position.y -= box.min.y * model.scale.x;
    scene.add(model);
  }
  mesh(
    new T.CylinderGeometry(10, 10, 0.2, 48),
    new T.MeshStandardMaterial({ color: 0x303438, roughness: 1 }),
    [0, -0.15, 0],
  );
  for (let x = -3; x <= 3; x++)
    for (let z = -3; z <= 2; z++) prop("floor", [x * 2.4, -0.05, z * 2.4], 2.4);
  for (let i = 0; i < 7; i++) {
    prop(i % 3 === 0 ? "wallCracked" : "wall", [(i - 3) * 2.4, 0, -5.4], 3);
  }
  prop("pillar", [-7, 0, -4.5], 4);
  prop("pillar", [7, 0, -4.5], 4);
  prop("supplyCrates", [4.9, 0, -3], 1.6);
  prop("barrel", [-4, 0, -3.5], 1.5);
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    mesh(
      new T.DodecahedronGeometry(0.24, 0),
      new T.MeshStandardMaterial({ color: 0x74716a, roughness: 1 }),
      [Math.cos(a) * 0.88, 0.12, Math.sin(a) * 0.88],
    );
  }
  for (let i = 0; i < 3; i++) {
    const log = mesh(
      new T.CylinderGeometry(0.15, 0.2, 1.65, 7),
      new T.MeshStandardMaterial({ color: 0x503722, roughness: 1 }),
      [0, 0.22, 0],
    );
    log.rotation.set(Math.PI / 2, 0, (i * Math.PI) / 3);
  }
  const flames = [];
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4;
    const f = mesh(
      new T.ConeGeometry(0.24 + (i % 2) * 0.08, 0.9, 5),
      new T.MeshBasicMaterial({
        color: i % 2 ? 0xffaa44 : 0xf06a29,
        transparent: true,
        opacity: 0.82,
      }),
      [Math.cos(a) * 0.3, 0.55 + (i % 3) * 0.12, Math.sin(a) * 0.3],
    );
    flames.push(f);
  }
  const sparks = Array.from({ length: 22 }, (_, i) =>
    mesh(
      new T.SphereGeometry(0.025, 4, 4),
      new T.MeshBasicMaterial({ color: i % 2 ? 0xffd27a : 0xee722b }),
      [0, 0, 0],
    ),
  );
  heroes.forEach((hero, i) => {
    const angle = (i / 4) * Math.PI * 2 + 0.3,
      x = Math.cos(angle) * 2.7,
      z = Math.sin(angle) * 2.7;
    const bed = mesh(
      new T.BoxGeometry(0.9, 0.12, 1.85),
      new T.MeshStandardMaterial({
        color: [0x4a6261, 0x676149, 0x5a5267, 0x67534a][i],
        roughness: 1,
      }),
      [x, 0.08, z],
    );
    bed.rotation.y = -angle;
    if (hero.survival.status !== "active") return;
    const out = equipmentAppearance(assets, {
      ...hero,
      torch: { held: false, lit: false },
      preview: {
        ...hero.preview,
        inventory: {
          ...hero.preview.inventory,
          items: hero.preview.inventory.items.map((item) => ({
            ...item,
            held: false,
          })),
        },
      },
    });
    out.model.position.set(x, 0.16, z);
    out.model.rotation.y = -angle - Math.PI / 2;
    out.model.traverse((o) => {
      if (o.isMesh) o.frustumCulled = false;
    });
    scene.add(out.model);
    actors.push(out.model);
    const mixer = new T.AnimationMixer(out.model),
      clip = out.clips.find((c) => c.name === "Idle");
    if (clip) mixer.clipAction(clip).play();
    mixers.push(mixer);
  });
  let frame,
    disposed = false,
    last = performance.now();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function draw(now) {
    if (disposed) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const width = canvas.clientWidth,
      height = canvas.clientHeight;
    if (
      width &&
      height &&
      (canvas.width !== Math.round(width * renderer.getPixelRatio()) ||
        canvas.height !== Math.round(height * renderer.getPixelRatio()))
    ) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    const t = reduce ? 1 : now / 1000;
    flames.forEach((f, i) => {
      f.scale.y = 1 + Math.sin(t * 7 + i * 2) * 0.18;
      f.rotation.y = t * 0.35 + i;
    });
    fireLight.intensity = 65 + Math.sin(t * 8) * 5 + Math.sin(t * 13) * 3;
    sparks.forEach((s, i) => {
      const p = (t * 0.35 + i * 0.19) % 1;
      s.position.set(
        Math.sin(i * 11 + t) * p * 0.9,
        0.4 + p * 3.2,
        Math.cos(i * 7 + t) * p * 0.8,
      );
      s.material.opacity = 1 - p;
      s.material.transparent = true;
    });
    if (!reduce) mixers.forEach((m) => m.update(dt));
    renderer.render(scene, camera);
    canvas.dataset.frames = String(Number(canvas.dataset.frames ?? 0) + 1);
    frame = requestAnimationFrame(draw);
  }
  frame = requestAnimationFrame(draw);
  const dispose = () => {
    disposed = true;
    cancelAnimationFrame(frame);
    mixers.forEach((m) => m.stopAllAction());
    for (const a of actors) {
      a.userData.dispose?.();
      a.traverse((o) => {
        if (o.isSkinnedMesh) o.skeleton.dispose();
      });
    }
    owned.forEach((o) => o.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
  };
  dispose.setFire = (lit) => {
    fireLight.visible = lit;
    flames.forEach((f) => (f.visible = lit));
    sparks.forEach((s) => (s.visible = lit));
  };
  return dispose;
}
