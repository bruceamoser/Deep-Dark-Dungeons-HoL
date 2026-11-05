import { creatureAppearance } from "./creatures.mjs";
import { CREATURE_ROSTER } from "../core/creature-roster.mjs";
import { activeItemEffects } from "../core/treasure.mjs";
import * as T from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
const armorNames = { light: "Rogue", medium: "Knight", heavy: "Knight" };
// Original recurve bow: curved wooden limbs, a wrapped grip and a taut string.
const bowAsset = (() => {
  const g = new T.Group();
  g.name = "Readied bow";
  const points = [
    [-0.12, 0.75, 0],
    [0.12, 0.57, 0],
    [0.27, 0.3, 0],
    [0.15, 0, 0],
    [0.27, -0.3, 0],
    [0.12, -0.57, 0],
    [-0.12, -0.75, 0],
  ].map((p) => new T.Vector3(...p));
  g.add(
    new T.Mesh(
      new T.TubeGeometry(new T.CatmullRomCurve3(points), 32, 0.035, 8, false),
      new T.MeshStandardMaterial({ color: 0x6c3821, roughness: 0.6 }),
    ),
  );
  const string = new T.BufferGeometry().setFromPoints([points[0], points[6]]);
  g.add(new T.Line(string, new T.LineBasicMaterial({ color: 0xddcdae })));
  const grip = new T.Mesh(
    new T.CylinderGeometry(0.055, 0.055, 0.2, 8),
    new T.MeshStandardMaterial({ color: 0x262322, roughness: 1 }),
  );
  grip.position.x = 0.15;
  g.add(grip);
  for (const y of [-0.27, 0.27]) {
    const binding = new T.Mesh(
      new T.SphereGeometry(0.048, 8, 6),
      new T.MeshStandardMaterial({
        color: 0xc3a15b,
        metalness: 0.65,
        roughness: 0.35,
      }),
    );
    binding.position.set(0.255, y, 0);
    g.add(binding);
  }
  return g;
})();
export function equipmentAppearance(assets, hero, enemy = false) {
  const look = enemy ? CREATURE_ROSTER[hero.type] : null;
  if (
    enemy &&
    look &&
    ![
      "Skeleton",
      "SkeletonRogue",
      "SkeletonMage",
      "Knight",
      "Rogue",
      "Mage",
      "Barbarian",
    ].includes(look.model)
  )
    return creatureAppearance(assets, hero, bowAsset);
  const name = enemy ? (look?.model ?? "Skeleton") : hero.model;
  const model = clone(assets.get(name).scene),
    owned = [];
  model.userData.dispose = () => owned.forEach((r) => r.dispose());
  const items = hero.preview?.inventory.items ?? [];
  const armor = items.find(
    (i) =>
      i.carried &&
      i.worn &&
      /item-ordinary-(light|medium|heavy)-armor/.test(i.catalogId),
  );
  const tier =
    armor?.catalogId.match(/(light|medium|heavy)-armor/)[1] ?? "cloth";
  const bones = new Map();
  model.traverse((o) => {
    if (o.isBone) bones.set(o.name, o);
  });
  if (!enemy) {
    const replacements = [];
    model.traverse((o) => {
      if (
        o.isSkinnedMesh &&
        /_(Body|ArmLeft|ArmRight|LegLeft|LegRight)$/.test(o.name)
      )
        replacements.push(o);
    });
    for (const old of replacements) {
      const part = old.name.split("_").at(-1),
        donorName =
          tier === "medium" && part !== "Body"
            ? "Rogue"
            : (armorNames[tier] ?? "Mage");
      const donor =
        assets
          .get(donorName)
          .scene.getObjectByName(
            `${donorName === "Rogue" ? "Rogue_Hooded" : donorName}_${part}`,
          ) ??
        assets.get(donorName).scene.getObjectByName(`${donorName}_${part}`);
      if (!donor?.isSkinnedMesh) continue;
      const mapped = donor.skeleton.bones.map((b) => bones.get(b.name));
      if (mapped.some((b) => !b)) continue;
      const mesh = donor.clone();
      mesh.name = `Equipped_${tier}_${part}`;
      mesh.bind(
        new T.Skeleton(
          mapped,
          donor.skeleton.boneInverses.map((m) => m.clone()),
        ),
        donor.bindMatrix.clone(),
      );
      old.parent.add(mesh);
      old.visible = false;
    }
  }
  model.traverse((o) => {
    if (
      o.isMesh &&
      /sword|shield|axe|crossbow|knife|dagger|wand|staff|spellbook|mug|throwable/i.test(
        o.name,
      )
    )
      o.visible = false;
    if (o.isMesh && /helmet|_hat/i.test(o.name))
      o.visible = enemy && look?.shield;
    if (
      enemy &&
      hero.type === "creature-animated-armor" &&
      o.isMesh &&
      /head|face/i.test(o.name)
    )
      o.visible = false;
  });
  let right, left;
  model.traverse((o) => {
    if (["handslotr", "handslot.r"].includes(o.name)) right = o;
    if (["handslotl", "handslot.l"].includes(o.name)) left = o;
  });
  const held = (id) =>
    items.find((i) => i.carried && i.held && i.catalogId === id);
  const melee = held("item-ordinary-melee-weapon"),
    ranged = held("item-ordinary-ranged-weapon") || look?.weapon === "bow";
  if (
    right &&
    ((enemy &&
      !ranged &&
      ["melee", "spear", "chain"].includes(look?.weapon ?? "melee")) ||
      melee)
  ) {
    const sword = clone(assets.get("sword").scene);
    sword.name = "Readied melee weapon";
    if (melee?.hands === 2) sword.scale.multiplyScalar(1.35);
    right.add(sword);
  }
  if (ranged && left) {
    const bow = bowAsset.clone();
    bow.rotation.z = Math.PI / 2;
    left.add(bow);
  }
  if (left && (held("item-ordinary-shield") || look?.shield)) {
    const shield = clone(assets.get("shield").scene);
    shield.name = "Readied shield";
    left.add(shield);
  }
  model.userData.equipment = {
    armor: tier,
    weapon: ranged
      ? "bow"
      : melee
        ? "melee"
        : enemy
          ? (look?.weapon ?? "melee")
          : "unarmed",
    shield: !!held("item-ordinary-shield"),
  };
  if (!enemy) {
    const adorn = (slot, boneName, geometry, position) => {
      const item = items.find((i) => i.worn && i.slot === slot);
      if (!item) return;
      const material = new T.MeshStandardMaterial({
        color: activeItemEffects(hero, item)[0]?.color ?? 0x776b52,
        metalness: 0.7,
        roughness: 0.35,
      });
      owned.push(geometry, material);
      const mesh = new T.Mesh(geometry, material);
      mesh.name = `Equipped ${slot}`;
      mesh.position.set(...position);
      const bone = [...bones.values()].find((b) => boneName.test(b.name));
      (bone ?? model).add(mesh);
    };
    adorn(
      "head",
      /^head$/i,
      new T.CylinderGeometry(0.29, 0.26, 0.12, 8, true),
      [0, 0.15, 0],
    );
    adorn(
      "waist",
      /hips|pelvis/i,
      new T.BoxGeometry(0.49, 0.1, 0.32),
      [0, 0, 0],
    );
    for (const side of ["l", "r"])
      adorn(
        "feet",
        new RegExp(`foot[._]?${side}$`, "i"),
        new T.BoxGeometry(0.17, 0.14, 0.3),
        [0, 0, 0.06],
      );
    const glowing = items
      .filter((i) => i.held)
      .flatMap((i) => activeItemEffects(hero, i))
      .find((e) => e.effect === "damage");
    if (glowing)
      model.traverse((o) => {
        if (o.isMesh && o.parent?.name === "Readied melee weapon") {
          o.material = o.material.clone();
          owned.push(o.material);
          o.material.emissive.setHex(glowing.color);
          o.material.emissiveIntensity = 0.7;
        }
      });
  }
  // Rig dimensions are consistent; ignore hidden source accessories when scaling.
  model.scale.multiplyScalar(enemy ? 0.95 : 0.85);
  return { model, clips: assets.get(name).animations };
}
export function heroPreview(canvas, assets, hero) {
  const renderer = new T.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 1.35, 4.8);
  camera.lookAt(0, 0.9, 0);
  scene.add(new T.HemisphereLight(0xd4e5f1, 0x3c2920, 2));
  for (const [color, power, pos] of [
    [0xffd9a5, 3, [2, 4, 3]],
    [0x7ed4d0, 4, [-3, 2, -2]],
  ]) {
    const l = new T.DirectionalLight(color, power);
    l.position.set(...pos);
    scene.add(l);
  }
  const pedestal = new T.Mesh(
    new T.CylinderGeometry(0.66, 0.75, 0.12, 64),
    new T.MeshStandardMaterial({
      color: 0x26383c,
      metalness: 0.5,
      roughness: 0.4,
    }),
  );
  pedestal.position.y = -0.07;
  scene.add(pedestal);
  let current,
    mixer,
    frame,
    angle = 0.28,
    drag = null,
    last = performance.now();
  const update = (h) => {
    if (current) {
      current.userData.dispose?.();
      mixer.stopAllAction();
      mixer.uncacheRoot(current);
      current.traverse((o) => {
        if (o.isSkinnedMesh) o.skeleton.dispose();
      });
      scene.remove(current);
    }
    const out = equipmentAppearance(assets, h);
    current = out.model;
    scene.add(current);
    mixer = new T.AnimationMixer(current);
    const idle = out.clips.find((c) => c.name === "Idle");
    if (idle) mixer.clipAction(idle).play();
    canvas.dataset.armor = current.userData.equipment.armor;
    canvas.dataset.weapon = current.userData.equipment.weapon;
  };
  update(hero);
  const down = (e) => {
      drag = e.clientX;
      canvas.setPointerCapture(e.pointerId);
    },
    move = (e) => {
      if (drag !== null) {
        angle += (e.clientX - drag) * 0.012;
        drag = e.clientX;
      }
    },
    up = () => (drag = null);
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  const resize = new ResizeObserver(() => {
    const r = canvas.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  });
  resize.observe(canvas);
  const tick = (now) => {
    frame = requestAnimationFrame(tick);
    mixer.update(Math.min(0.05, (now - last) / 1000));
    last = now;
    current.rotation.y = angle;
    renderer.render(scene, camera);
  };
  frame = requestAnimationFrame(tick);
  return {
    update,
    dispose() {
      cancelAnimationFrame(frame);
      resize.disconnect();
      current.userData.dispose?.();
      mixer.stopAllAction();
      mixer.uncacheRoot(current);
      current.traverse((o) => {
        if (o.isSkinnedMesh) o.skeleton.dispose();
      });
      pedestal.geometry.dispose();
      pedestal.material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
    },
  };
}
