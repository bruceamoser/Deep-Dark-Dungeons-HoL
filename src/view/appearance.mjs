import { masonAppearance } from "./mason-heroes.mjs";
import { avatarFor } from "../core/hero-avatars.mjs";
import { dressIdentity } from "./hero-identity.mjs";
import { creatureAppearance } from "./creatures.mjs";
import { CREATURE_ROSTER, HUMANOID_MODELS } from "../core/creature-roster.mjs";
import { activeItemEffects } from "../core/treasure.mjs";
import * as T from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { gameClips } from "./animation-library.mjs";
const armorNames = { light: "Rogue", medium: "Knight", heavy: "Knight" };
export function equipmentAppearance(assets, hero, enemy = false) {
  if (!enemy && assets.has("DungeonMason"))
    return masonAppearance(assets.get("DungeonMason"), hero, assets);
  const look = enemy ? CREATURE_ROSTER[hero.type] : null;
  // KayKit character models are complete rigged humanoids and take this path; the
  // Quaternius animals and constructs go to the procedural creature path.
  if (enemy && look && !HUMANOID_MODELS.has(look.model))
    return creatureAppearance(assets, hero, assets.get("bow").scene);
  const name = enemy ? (look?.model ?? "Skeleton") : avatarFor(hero);
  const items = hero.preview?.inventory.items ?? [];
  const sourceName =
    !enemy &&
    name === "PaladinHelmed" &&
    items.some((i) => i.carried && i.worn && i.slot === "head")
      ? "Paladin"
      : name;
  const model = clone(assets.get(sourceName).scene),
    owned = [];
  model.userData.avatar = name;
  model.userData.dispose = () => owned.forEach((r) => r.dispose());
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
  if (!enemy && tier !== "cloth") {
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
      // Pack filenames and mesh prefixes differ (Rogue_Hooded vs RogueHooded).
      const donor = assets
        .get(donorName)
        .scene.getObjectsByProperty("isSkinnedMesh", true)
        .find((mesh) => mesh.name.endsWith(`_${part}`));
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
    // Authored hats, helmets and visors are part of the model's silhouette.
    // Keep them unless worn head equipment explicitly replaces them.
    if (!enemy && o.isMesh && /_(Helmet|HelmetVisor|Hat|Hood)$/i.test(o.name))
      o.visible = !items.some((i) => i.carried && i.worn && i.slot === "head");
  });
  let right, left;
  model.traverse((o) => {
    const slot = o.name.toLowerCase().replace(/[._-]/g, "");
    if (slot === "handslotr") right = o;
    if (slot === "handslotl") left = o;
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
    const bow = new T.Group();
    bow.name = "Readied bow";
    const authored = clone(assets.get("bow").scene);
    authored.rotation.x = -Math.PI / 2;
    bow.add(authored);
    bow.rotation.x = Math.PI / 2;
    left.add(bow);
  }
  if (left && (held("item-ordinary-shield") || look?.shield)) {
    const shield = clone(assets.get("shield").scene);
    shield.name = "Readied shield";
    left.add(shield);
  }
  if (!enemy && hero.torch?.held) {
    const hand = melee ? left : held("item-ordinary-shield") ? right : right;
    if (hand) {
      const torch = new T.Group();
      torch.name = "Readied torch";
      torch.scale.setScalar(0.65);
      const unlit = clone(assets.get("torch").scene);
      const lit = clone(assets.get("torchLit").scene);
      unlit.name = "Authored unlit torch";
      lit.name = "Authored lit torch";
      torch.add(unlit, lit);
      model.userData.setTorchLit = (value) => {
        lit.visible = !!value;
        unlit.visible = !value;
        model.userData.torchLit = !!value;
      };
      model.userData.setTorchLit(hero.torch.lit);
      hand.add(torch);
    }
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
    // Boots and belts are already modeled into the authored outfit. A worn helm
    // uses the Knight's rigged helmet instead of an intersecting primitive shell.
    if (items.some((i) => i.carried && i.worn && i.slot === "head")) {
      const donor = assets.get("Knight").scene;
      for (const source of donor
        .getObjectsByProperty("isSkinnedMesh", true)
        .filter((m) => /_Helmet(?:Visor)?$/.test(m.name))) {
        const mapped = source.skeleton.bones.map((b) => bones.get(b.name));
        if (mapped.some((b) => !b)) continue;
        const helm = source.clone();
        helm.name = "Equipped head " + source.name;
        helm.bind(
          new T.Skeleton(
            mapped,
            source.skeleton.boneInverses.map((m) => m.clone()),
          ),
          source.bindMatrix.clone(),
        );
        model.add(helm);
      }
    }
    const enchanted = items.filter(
      (i) => i.carried && (i.held || i.worn) && i.effects?.length,
    );
    model.userData.magicItems = enchanted.map((i) => i.instanceId);
    for (const item of enchanted) {
      const tint = item.effects[0]?.color ?? 0xb591f1;
      const active = activeItemEffects(hero, item).length > 0;
      const part = item.held
        ? model.getObjectByName(
            item.catalogId.includes("ranged")
              ? "Readied bow"
              : item.catalogId.includes("shield")
                ? "Readied shield"
                : "Readied melee weapon",
          )
        : null;
      part?.traverse((o) => {
        if (!o.isMesh) return;
        const paint = (old) => {
          const m = old.clone();
          owned.push(m);
          m.emissive?.setHex(tint);
          m.emissiveIntensity = active ? 1.5 : 0.3;
          m.metalness = 0.7;
          return m;
        };
        o.material = Array.isArray(o.material)
          ? o.material.map(paint)
          : paint(o.material);
      });
      // Angular rune marks stay readable on the weapon, armor and accessories,
      // including dormant magic. Relics receive a larger three-rune crest.
      const rune = new T.Group();
      rune.name = `Enchantment runes ${item.instanceId}`;
      const geometry = new T.OctahedronGeometry(item.relic ? 0.07 : 0.045, 0);
      const material = new T.MeshStandardMaterial({
        color: tint,
        emissive: tint,
        emissiveIntensity: active ? 2.2 : 0.45,
        metalness: 0.65,
        roughness: 0.25,
      });
      owned.push(geometry, material);
      for (let n = 0; n < (item.relic ? 3 : 2); n++) {
        const mark = new T.Mesh(geometry, material);
        mark.position.set((n - 0.5) * 0.11, 0.07 * (n % 2), 0);
        rune.add(mark);
      }
      if (part) {
        rune.position.set(0, 0.25, 0.05);
        part.add(rune);
      } else {
        const bone = [...bones.values()].find((b) =>
          item.slot === "head"
            ? /^head$/i.test(b.name)
            : /spine|chest/i.test(b.name),
        );
        rune.position.set(0, item.slot === "head" ? 0.18 : 0.05, 0.22);
        (bone ?? model).add(rune);
      }
    }
  }
  // Rig dimensions are consistent; ignore hidden source accessories when scaling.
  if (!enemy) {
    // Preserve the pack's authored clothing and accessories; equipment and palette
    // choices still apply through the shared sheet/gameplay appearance pipeline.
    const wornSlot = (slot) => items.some((i) => i.worn && i.slot === slot);
    dressIdentity(model, hero, owned, {
      authoredOutfit: true,
      occupied: {
        head: wornSlot("head"),
        belt: wornSlot("waist"),
        feet: wornSlot("feet"),
        torso: tier !== "cloth",
      },
      seed: (hero.name ?? "").length + 3,
    });
  }
  if (!enemy) {
    const faded = [];
    const cloneMaterial = (source) => {
      const material = source.clone();
      material.onBeforeCompile = source.onBeforeCompile;
      material.customProgramCacheKey = source.customProgramCacheKey;
      return material;
    };
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.material = Array.isArray(o.material)
        ? o.material.map(cloneMaterial)
        : cloneMaterial(o.material);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        owned.push(m);
        faded.push({ m, opacity: m.opacity, transparent: m.transparent });
      }
    });
    let concealed = null;
    model.userData.setConcealed = (value) => {
      if (value === concealed) return;
      concealed = value;
      for (const { m, opacity, transparent } of faded) {
        m.transparent = value || transparent;
        m.opacity = value ? opacity * 0.38 : opacity;
        m.needsUpdate = true;
      }
      model.userData.concealed = value;
    };
    model.userData.setConcealed(!!hero.concealed);
  }
  model.scale.multiplyScalar(
    enemy ? (look?.theme === "kobolds" ? 0.65 : 0.95) : 0.85,
  );
  const clips = gameClips({ skeleton: /^Skeleton/.test(name) });
  return {
    model,
    clips: clips.length ? clips : (assets.get(name).animations ?? []),
  };
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
    last = performance.now(),
    zoom = 1;
  let activeHighlight = null;
  const highlight = (channel) => {
    activeHighlight = channel;
    current?.traverse((o) => {
      if (!o.isMesh) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (!m.emissive) continue;
        m.userData.previewEmissive ??= {
          colour: m.emissive.clone(),
          intensity: m.emissiveIntensity,
        };
        const selected =
          channel !== null &&
          Number(m.name.match(/^MasonChannel(\d+)/)?.[1]) === channel + 1;
        m.emissive.copy(
          selected ? new T.Color("#5fd8d0") : m.userData.previewEmissive.colour,
        );
        m.emissiveIntensity = selected
          ? 1.5
          : m.userData.previewEmissive.intensity;
      }
    });
  };
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
    canvas.dataset.avatar = current.userData.avatar;
    canvas.dataset.armor = current.userData.equipment.armor;
    canvas.dataset.weapon = current.userData.equipment.weapon;
    canvas.dataset.appearance = JSON.stringify(current.userData.appearance);
    canvas.dataset.previewWeapon = current.userData.weaponVisual?.model ?? "";
    canvas.dataset.previewBackpack = String(
      current.userData.equipment.backpack ?? false,
    );
    highlight(activeHighlight);
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
  const wheel = (e) => {
    e.preventDefault();
    zoom = T.MathUtils.clamp(zoom + e.deltaY * 0.001, 0.43, 1.3);
  };
  canvas.addEventListener("wheel", wheel, { passive: false });
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
    const height = current.userData.height ?? 1.9;
    camera.position.set(
      0,
      height * (zoom < 0.7 ? 0.8 : 0.65),
      Math.max(2.4, height * 2.7) * zoom,
    );
    camera.lookAt(0, height * (zoom < 0.7 ? 0.75 : 0.48), 0);
    renderer.render(scene, camera);
  };
  frame = requestAnimationFrame(tick);
  return {
    update,
    highlight,
    paletteAreas: () => current.userData.paletteAreas ?? [],
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
      canvas.removeEventListener("wheel", wheel);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
    },
  };
}
