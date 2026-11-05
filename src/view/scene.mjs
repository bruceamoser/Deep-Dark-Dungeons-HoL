import { traitsOf } from "../core/ancestry-game.mjs";
import { partyCanSee, naturallyLit, terrainVisible } from "../core/lighting.mjs";
import { conditionVisuals } from "./conditions.mjs";
import { CREATURE_MODELS } from "../core/creature-roster.mjs";
import * as T from "three";
import { createAttackEffect } from "./combat-effects.mjs";
import { equipmentAppearance } from "./appearance.mjs";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { key, Random, distance, lineOfSight } from "../core/dungeon.mjs";
const TILE = 2.4;
const asset = (name) => `/assets/dungeon/Assets/gltf/${name}.gltf.glb`;
const color = { gold: 0xe7c17a, teal: 0x64d5c8, red: 0xe46c60 };
export class Scene {
  constructor(canvas, onClick, onHover) {
    this.canvas = canvas;
    this.onClick = onClick;
    this.onHover = onHover;
    this.torches = [];
    this.entities = new Map();
    this.props = [];
    this.interactables = new Map();
    this.effects = [];
    this.assets = new Map();
    this.angle = Math.PI / 4;
    this.zoom = 21;
    this.focus = new T.Vector3(16, 0, 16);
    this.pointer = new T.Vector2();
    this.ray = new T.Raycaster();
    this.plane = new T.Plane(new T.Vector3(0, 1, 0), 0);
    this.renderer = new T.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    this.scene = new T.Scene();
    this.scene.background = new T.Color(0x080e13);
    this.scene.fog = new T.FogExp2(0x080e13, 0.012);
    this.camera = new T.OrthographicCamera();
    this.camera.near = 0.1;
    this.camera.far = 240;
    this.scene.add(new T.HemisphereLight(0x8ba6bd, 0x26302e, 1.1));
    const moon = new T.DirectionalLight(0xa8c9e6, 1.7);
    moon.position.set(-15, 35, -12);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    moon.shadow.camera.left = -55;
    moon.shadow.camera.right = 55;
    moon.shadow.camera.top = 55;
    moon.shadow.camera.bottom = -55;
    moon.shadow.normalBias = 0.04;
    moon.shadow.bias = -0.0003;
    this.partyLight = new T.PointLight(0xb4d6ce, 12, 12, 2);
    this.scene.add(this.partyLight);
    this.scene.add(moon);
    this.scene.add(moon.target);
    this.moon = moon;
    this.world = new T.Group();
    this.scene.add(this.world);
    this.entityGroup = new T.Group();
    this.scene.add(this.entityGroup);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(
      new T.Vector2(innerWidth, innerHeight),
      0.32,
      0.65,
      1.1,
    );
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.cursor = new T.Mesh(
      new T.RingGeometry(0.72, 0.77, 48),
      new T.MeshBasicMaterial({
        color: color.gold,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      }),
    );
    this.cursor.rotation.x = -Math.PI / 2;
    this.cursor.position.y = 0.035;
    this.scene.add(this.cursor);
    this.pathGeo = new T.CircleGeometry(0.075, 12);
    this.pathMat = new T.MeshBasicMaterial({
      color: color.gold,
      transparent: true,
      opacity: 0.8,
    });
    this.pathGroup = new T.Group();
    this.scene.add(this.pathGroup);
    this.follow = true;
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("pointerup", (e) => {
      if (e.button === 2) this.endPan();
    });
    canvas.addEventListener("pointercancel", () => this.endPan());
    window.addEventListener("blur", () => this.endPan());
    window.addEventListener(
      "pointermove",
      (e) => {
        if (this.pan && e.pointerId === this.pan.pointerId && e.buttons & 2)
          this.panTo(e);
      },
      true,
    );
    canvas.addEventListener("pointermove", (e) => {
      if (this.pan) return;
      const hit = this.groundAt(e);
      if (hit) {
        this.hover = {
          x: Math.round(hit.x / TILE),
          z: Math.round(hit.z / TILE),
        };
        this.cursor.position.set(
          this.hover.x * TILE,
          0.04,
          this.hover.z * TILE,
        );
        this.cursor.visible =
          !!this.map?.tiles[key(this.hover.x, this.hover.z)];
        onHover?.(this.hover, this.interactionAt(e), e);
      }
    });
    canvas.addEventListener("pointerdown", (e) => {
      if (e.button === 2) {
        e.preventDefault();
        const anchor = this.groundAt(e);
        if (!anchor) return;
        this.follow = false;
        this.manualCamera = true;
        this.pan = { anchor, pointerId: e.pointerId, pointer: e };
        this.targetFocus = this.focus.clone();
        canvas.setPointerCapture(e.pointerId);
        canvas.style.cursor = "grabbing";
        this.highlightInteraction(null);
        onHover?.(null);
        this.showPath([]);
      }
      if (e.button === 0) {
        // A click immediately after a camera drag must use the current camera,
        // not the hover cell from before the drag.
        const hit = this.groundAt(e);
        if (hit)
          onClick(
            { x: Math.round(hit.x / TILE), z: Math.round(hit.z / TILE) },
            this.interactionAt(e),
            e,
          );
      }
    });
    canvas.addEventListener("pointerleave", () => {
      this.highlightInteraction(null);
      onHover?.(null);
    });
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.zoom = T.MathUtils.clamp(this.zoom + e.deltaY * 0.018, 13, 40);
        this.resize();
        if (this.pan) this.panTo(this.pan.pointer);
      },
      { passive: false },
    );
    window.addEventListener("resize", () => this.resize());
    this.resize();
    this.clock = new T.Clock();
    this.frame = () => {
      requestAnimationFrame(this.frame);
      this.tick(Math.min(0.05, this.clock.getDelta()));
    };
    this.frame();
  }
  groundAt(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      1 - ((e.clientY - rect.top) / rect.height) * 2,
    );
    this.camera.updateMatrixWorld();
    this.ray.setFromCamera(this.pointer, this.camera);
    return this.ray.ray.intersectPlane(this.plane, new T.Vector3());
  }
  interactionAt(e) {
    this.groundAt(e);
    this.world.updateMatrixWorld(true);
    this.entityGroup.updateMatrixWorld(true);
    const visible = (obj) => {
      for (let p = obj; p; p = p.parent) if (!p.visible) return false;
      return true;
    };
    const hit = this.ray
      .intersectObjects([this.world, this.entityGroup], true)
      .find((h) => h.object.isMesh && visible(h.object));
    for (let obj = hit?.object; obj; obj = obj.parent)
      if (obj.userData.interactionId) return obj.userData.interactionId;
      else if (obj.userData.creatureId)
        return `creature:${obj.userData.creatureId}`;
    return null;
  }
  highlightInteraction(id) {
    if (this.highlightedInteraction === id) return;
    for (const [mesh, original] of this.highlightMaterials ?? []) {
      const temporary = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      temporary.forEach((m) => m.dispose());
      mesh.material = original;
    }
    this.highlightMaterials = [];
    this.highlightedInteraction = id;
    const entry = this.interactables.get(id);
    this.canvas.style.cursor = this.pan ? "grabbing" : entry ? "pointer" : "";
    this.cursor.material.color.setHex(entry ? 0x7ae2d3 : color.gold);
    if (!entry) return;
    this.showPath([]);
    entry.obj.traverse((mesh) => {
      if (!mesh.isMesh) return;
      const original = mesh.material;
      const highlight = (m) => {
        const copy = m.clone();
        copy.emissive?.setHex(
          entry.item.kind === "cache" ? 0x8766d8 : 0x31aa92,
        );
        copy.emissiveIntensity = 0.7;
        return copy;
      };
      mesh.material = Array.isArray(original)
        ? original.map(highlight)
        : highlight(original);
      this.highlightMaterials.push([mesh, original]);
    });
  }
  syncInteractions(items) {
    const ids = new Set(items.map((i) => i.id));
    for (const [id, entry] of this.interactables)
      if (!ids.has(id)) {
        if (id === this.highlightedInteraction) this.highlightInteraction(null);
        this.world.remove(entry.obj);
        this.props = this.props.filter((p) => p.obj !== entry.obj);
        this.interactables.delete(id);
      }
    for (const item of items) {
      let entry = this.interactables.get(item.id);
      if (!entry) {
        const stairs = ["entrance", "descent"].includes(item.kind);
        const obj = this.prop(
          stairs ? "stairs" : "chest",
          item.x,
          item.z - (item.kind === "entrance" ? 2 : 0),
          stairs ? 1.2 : 0.9,
          item.kind === "entrance" ? Math.PI : 0,
        );
        obj.userData.interactionId = item.id;
        entry = { obj, item };
        this.interactables.set(item.id, entry);
      }
      entry.item = item;
      entry.obj.userData.empty = item.available === false;
    }
  }
  panTo(e) {
    const hit = this.groundAt(e);
    if (!hit) return;
    const delta = this.pan.anchor.clone().sub(hit);
    this.focus.add(delta);
    this.targetFocus = this.focus.clone();
    this.camera.position.add(delta);
    this.camera.updateMatrixWorld();
    this.pan.pointer = e;
  }
  endPan() {
    const pointerId = this.pan?.pointerId;
    this.pan = null;
    this.canvas.style.cursor = "";
    if (pointerId !== undefined && this.canvas.hasPointerCapture(pointerId))
      this.canvas.releasePointerCapture(pointerId);
  }
  async load() {
    const loader = new GLTFLoader();
    const entries = {
      Knight: "/assets/adventurer/Characters/gltf/Knight.glb",
      Rogue: "/assets/adventurer/Characters/gltf/Rogue_Hooded.glb",
      Mage: "/assets/adventurer/Characters/gltf/Mage.glb",
      Barbarian: "/assets/adventurer/Characters/gltf/Barbarian.glb",
      Skeleton: "/assets/skeleton/Characters/gltf/Skeleton_Warrior.glb",
      ...CREATURE_MODELS,
      sword: "/assets/adventurer/Assets/gltf/sword_1handed.gltf",
      staff: "/assets/adventurer/Assets/gltf/staff.gltf",
      bow: "/assets/adventurer/Assets/gltf/crossbow_2handed.gltf",
      arrow: "/assets/adventurer/Assets/gltf/arrow.gltf",
      shield: "/assets/adventurer/Assets/gltf/shield_round_color.gltf",
      floor: asset("floor_tile_large"),
      pillar: asset("pillar_decorated"),
      wall: asset("wall"),
      torch: asset("torch_mounted"),
      rubble: asset("rubble_large"),
      barrel: asset("barrel_large"),
      table: asset("table_long_decorated_A"),
      candles: asset("candle_triple"),
      shelf: asset("shelf_small_candles"),
      chest: "/assets/dungeon/Assets/gltf/chest.glb",
      stairs: asset("stairs_wide"),
      banner: asset("banner_patternB_green"),
    };
    await Promise.all(
      Object.entries(entries).map(async ([name, url]) => {
        try {
          const g = await loader.loadAsync(url);
          g.scene.traverse((o) => {
            if (o.isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
              o.material.roughness = 0.88;
            }
          });
          this.assets.set(name, g);
        } catch (e) {
          if (
            Object.hasOwn(CREATURE_MODELS, name) ||
            [
              "Knight",
              "Rogue",
              "Mage",
              "Barbarian",
              "Skeleton",
              "sword",
              "arrow",
              "floor",
            ].includes(name)
          )
            throw e;
          console.warn("Optional scenery missing:", name);
        }
      }),
    );
  }
  model(name, height) {
    const asset = this.assets.get(name);
    if (!asset) return new T.Group();
    const obj = clone(asset.scene);
    if (height) {
      const box = new T.Box3().setFromObject(obj),
        size = box.getSize(new T.Vector3());
      obj.scale.multiplyScalar(height / size.y);
    }
    return obj;
  }
  prop(name, x, z, height, rotation = 0) {
    if (
      ["pillar", "shelf", "barrel"].includes(name) &&
      !this.map.obstacles?.[key(Math.round(x), Math.round(z))]
    )
      return new T.Group();
    const obj = this.model(name, height);
    obj.position.set(x * TILE, 0, z * TILE);
    obj.rotation.y = rotation;
    this.world.add(obj);
    this.props.push({ obj, x, z });
    return obj;
  }
  build(map) {
    this.clearEffects();
    this.highlightInteraction(null);
    this.interactables.clear();
    this.map = map;
    for (const p of this.world.children.slice()) this.world.remove(p);
    this.props = [];
    this.tiles = [];
    this.torches = [];
    const rng = new Random(map.seed + map.depth);
    const tileGeo = new T.BoxGeometry(TILE - 0.035, 0.35, TILE - 0.035),
      base = new T.MeshStandardMaterial({ color: 0x53646a, roughness: 0.95 });
    const entries = Object.values(map.tiles);
    this.floor = new T.InstancedMesh(tileGeo, base, entries.length);
    this.floor.receiveShadow = true;
    const mat = new T.Matrix4();
    entries.forEach((p, i) => {
      mat.makeTranslation(p.x * TILE, -0.19, p.z * TILE);
      this.floor.setMatrixAt(i, mat);
      this.floor.setColorAt(i, new T.Color(0.25, 0.28, 0.29));
      this.tiles.push(p);
    });
    this.world.add(this.floor);
    // Authored floor panels break up the foundations without a draw call per tile.
    const source = this.model("floor");
    source.updateMatrixWorld(true);
    const bounds = new T.Box3().setFromObject(source),
      size = bounds.getSize(new T.Vector3());
    source.traverse((o) => {
      if (!o.isMesh) return;
      const inst = new T.InstancedMesh(o.geometry, o.material, entries.length);
      inst.receiveShadow = true;
      const scale = new T.Matrix4().makeScale(
        TILE / size.x,
        Math.min(1, TILE / size.x),
        TILE / size.z,
      );
      entries.forEach((p, i) => {
        const m = new T.Matrix4()
          .makeTranslation(p.x * TILE, 0, p.z * TILE)
          .multiply(scale)
          .multiply(o.matrixWorld);
        inst.setMatrixAt(i, m);
      });
      this.world.add(inst);
      this.tilesDetail ??= [];
      this.tilesDetail.push(inst);
    });
    for (const p of entries) {
      for (const [dx, dz] of [
        [-1, 0],
        [0, -1],
        [1, 0],
        [0, 1],
      ]) {
        if (map.tiles[key(p.x + dx, p.z + dz)]) continue;
        const high = dx < 0 || dz < 0;
        let wall;
        if (high) {
          wall = this.model("wall", 2.8);
          const width = new T.Box3()
            .setFromObject(wall)
            .getSize(new T.Vector3()).x;
          wall.scale.x *= TILE / width;
          wall.rotation.y = dx ? Math.PI / 2 : 0;
          wall.position.set(
            (p.x + dx * 0.49) * TILE,
            0,
            (p.z + dz * 0.49) * TILE,
          );
        } else {
          wall = new T.Mesh(
            new T.BoxGeometry(
              dx ? 0.32 : TILE + 0.1,
              0.48,
              dz ? 0.32 : TILE + 0.1,
            ),
            new T.MeshStandardMaterial({ color: 0x44535a, roughness: 0.95 }),
          );
          wall.position.set(
            (p.x + dx * 0.49) * TILE,
            0.16,
            (p.z + dz * 0.49) * TILE,
          );
          wall.castShadow = true;
          wall.receiveShadow = true;
        }
        this.world.add(wall);
        this.props.push({ obj: wall, x: p.x, z: p.z });
      }
    }
    for (const r of map.rooms) {
      for (const [x, z] of [
        [r.x + 0.1, r.z + 0.1],
        [r.x + r.w - 1.1, r.z + 0.1],
      ]) {
        this.prop("pillar", x, z, 3.4);
        if (!naturallyLit(map, { x: r.cx, z: r.cz })) continue;
        this.prop("torch", x + 0.35, z + 0.25, 1.25);
        const light = new T.PointLight(0xffb05d, 30, 12, 2);
        light.position.set((x + 0.4) * TILE, 2.2, (z + 0.4) * TILE);
        this.world.add(light);
        this.torches.push({ light, x, z, phase: rng.next() * 6 });
        const glow = new T.Mesh(
          new T.SphereGeometry(0.12, 8, 8),
          new T.MeshStandardMaterial({
            color: 0xffb348,
            emissive: 0xff8928,
            emissiveIntensity: 5,
          }),
        );
        glow.position.copy(light.position);
        this.world.add(glow);
        this.props.push({ obj: glow, x, z });
      }
      this.prop("banner", r.cx, r.z - 0.2, 2.7);
      this.prop("shelf", r.x + 0.05, r.cz, 1.7, Math.PI / 2);
      this.prop("barrel", r.x + r.w - 1.2, r.z + 0.65, 1.0);
      this.prop("barrel", r.x + r.w - 1.65, r.z + 1.1, 0.75);
      this.prop(
        "rubble",
        r.x + r.w - 1.3,
        r.z + r.h - 1.3,
        0.35,
        rng.next() * 6,
      );
    }
    const portal = new T.PointLight(0x70d9d3, 30, 10, 2);
    portal.position.set(map.exit.x * TILE, 2, map.exit.z * TILE);
    this.world.add(portal);
    this.props.push({ obj: portal, ...map.exit });
    const dustGeo = new T.BufferGeometry(),
      positions = [];
    for (const room of map.rooms)
      for (let i = 0; i < 32; i++)
        positions.push(
          (room.x + rng.next() * room.w) * TILE,
          0.4 + rng.next() * 3,
          (room.z + rng.next() * room.h) * TILE,
        );
    dustGeo.setAttribute(
      "position",
      new T.Float32BufferAttribute(positions, 3),
    );
    const dust = new T.Points(
      dustGeo,
      new T.PointsMaterial({
        color: 0xc4b48d,
        size: 0.025,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      }),
    );
    this.world.add(dust);
    this.endPan();
    this.manualCamera = false;
    this.focus.set(map.start.x * TILE, 0, map.start.z * TILE);
    this.targetFocus = this.focus.clone();
  }
  addEntity(data, isEnemy = false) {
    const appearance = equipmentAppearance(this.assets, data, isEnemy);
    const group = new T.Group(),
      model = appearance.model;
    group.add(model);
    if (isEnemy) group.userData.creatureId = data.id;
    group.position.set(data.x * TILE, 0.04, data.z * TILE);
    this.entityGroup.add(group);
    const ring = new T.Mesh(
      new T.RingGeometry(0.53, 0.58, 48),
      new T.MeshBasicMaterial({
        color: isEnemy ? color.red : color.teal,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    group.add(ring);
    const mixer = new T.AnimationMixer(model),
      clips = appearance.clips;
    const entity = {
      group,
      model,
      ring,
      mixer,
      clips,
      data,
      isEnemy,
      statusVisuals: conditionVisuals(group, model.userData.height ?? 1.8),
      action: null,
      lock: 0,
    };
    if (!isEnemy) {
      entity.torchLight = new T.PointLight(0xffa346, 0, 5.8 * TILE, 2);
      entity.torchLight.position.set(0, 1.65, 0);
      group.add(entity.torchLight);
    }
    this.entities.set(data.id, entity);
    this.animate(data.id, "Idle");
    return entity;
  }
  resetEntities(party, enemies) {
    this.clearEffects();
    for (const e of this.entities.values()) {
      e.statusVisuals.dispose();
      e.model.userData.dispose?.();
      e.mixer.stopAllAction();
      e.mixer.uncacheRoot(e.model);
      e.model.traverse((o) => {
        if (o.isSkinnedMesh) o.skeleton.dispose();
      });
      e.ring.geometry.dispose();
      e.ring.material.dispose();
      this.entityGroup.remove(e.group);
    }
    this.entities.clear();
    for (const h of party) this.addEntity(h);
    for (const e of enemies) this.addEntity(e, true);
  }
  animate(id, name, once = false) {
    const e = this.entities.get(id);
    if (!e) return;
    const clip =
      e.clips.find((c) => c.name === name) ??
      e.clips.find((c) => c.name === "Idle");
    if (!clip || (!once && e.action?.getClip() === clip)) return;
    const next = e.mixer.clipAction(clip);
    next.reset().setLoop(once ? T.LoopOnce : T.LoopRepeat, once ? 1 : Infinity);
    next.clampWhenFinished = once;
    next.play();
    if (e.action && e.action !== next) e.action.fadeOut(0.18);
    next.fadeIn(0.18);
    e.action = next;
    if (once) e.lock = clip.duration;
  }
  floatingText({ id, text, kind }) {
    this.floating ??= [];
    const node = document.createElement("div");
    node.className = `combat-float ${kind}`;
    node.textContent = text;
    node.dataset.recipient = id;
    document.body.append(node);
    const lane = this.floating.filter((f) => f.id === id && f.age < 0.8).length;
    this.floating.push({ id, node, age: -lane * 0.12, lane });
  }
  clearFloatingText() {
    for (const f of this.floating ?? []) f.node.remove();
    this.floating = [];
  }
  updateFloatingText(dt) {
    for (const f of [...(this.floating ?? [])]) {
      f.age += dt;
      const e = this.entities.get(f.id);
      if (f.age > 2.1 || !e) {
        f.node.remove();
        this.floating.splice(this.floating.indexOf(f), 1);
        continue;
      }
      f.node.hidden = f.age < 0;
      const p = e.group.position
        .clone()
        .add(
          new T.Vector3(
            0,
            (e.model.userData.height ?? 1.9) + 0.25 + Math.max(0, f.age) * 0.5,
            0,
          ),
        )
        .project(this.camera);
      f.node.style.left = `${((p.x + 1) * innerWidth) / 2}px`;
      f.node.style.top = `${((1 - p.y) * innerHeight) / 2 - f.lane * 32}px`;
      f.node.style.opacity = String(Math.min(1, (2.1 - f.age) * 2.5));
    }
  }
  attackEffect(data, callbacks) {
    const effect = createAttackEffect(this, data, callbacks);
    if (effect) this.effects.push(effect);
    return effect;
  }
  clearEffects() {
    for (const effect of this.effects) effect.dispose();
    this.effects.length = 0;
  }
  queueMovement(steps) {
    for (const { heroId, points } of steps) {
      const entity = this.entities.get(heroId);
      if (!entity) continue;
      entity.travel ??= [];
      for (const p of points) {
        const point = new T.Vector3(p.x * TILE, 0.04, p.z * TILE);
        if (!entity.travel.at(-1)?.equals(point)) entity.travel.push(point);
      }
    }
  }
  freezePositions() {
    for (const e of this.entities.values()) {
      e.travel = [];
      e.group.position.set(e.data.x * TILE, 0.04, e.data.z * TILE);
      this.animate(e.data.id, "Idle");
    }
    this.targetFocus = this.focus.clone();
  }
  focusOn(p, enableFollow = true) {
    if (this.pan) return;
    this.manualCamera = false;
    if (enableFollow) this.follow = true;
    this.targetFocus = new T.Vector3(p.x * TILE, 0, p.z * TILE);
  }
  rotate(dir) {
    if (this.pan) return;
    this.manualCamera = false;
    this.angle += (dir * Math.PI) / 2;
  }
  showPath(path) {
    this.pathGroup.clear();
    for (const p of path) {
      const dot = new T.Mesh(this.pathGeo, this.pathMat);
      dot.rotation.x = -Math.PI / 2;
      dot.position.set(p.x * TILE, 0.06, p.z * TILE);
      this.pathGroup.add(dot);
    }
  }
  updateVisibility(party, seen) {
    const visible = (p) => partyCanSee(this.map, party, p);
    this.tiles.forEach((p, i) => {
      const v = terrainVisible(this.map, party, p);
      if (v) seen[key(p.x, p.z)] = true;
      const explored = seen[key(p.x, p.z)];
      const c = new T.Color(v ? 0xffffff : explored ? 0x444d55 : 0x020407);
      this.floor.setColorAt(i, c);
      for (const mesh of this.tilesDetail ?? []) mesh.setColorAt(i, c);
    });
    this.floor.instanceColor.needsUpdate = true;
    for (const mesh of this.tilesDetail ?? [])
      mesh.instanceColor.needsUpdate = true;
    for (const p of this.props)
      p.obj.visible = !!seen[key(Math.round(p.x), Math.round(p.z))];
    for (const t of this.torches)
      t.light.visible = !!seen[key(Math.round(t.x), Math.round(t.z))];
    for (const { obj, item } of this.interactables.values())
      obj.visible =
        visible(item) ||
        (item.kind === "descent" &&
          party.some(
            (h) =>
              h.survival.status === "active" &&
              traitsOf(h).some((t) => t.stairs),
          ));
    for (const e of this.entities.values())
      if (e.isEnemy)
        e.group.visible =
          (e.data.hp > 0 || e.pendingImpacts > 0 || e.deathGrace > 0) &&
          visible(e.data);
  }
  tick(dt) {
    const t = this.clock.elapsedTime;
    for (const e of this.entities.values()) {
      e.mixer.update(dt);
      if (e.torchLight) {
        e.torchLight.intensity =
          e.data.torch?.lit || e.data.lantern
            ? 24 + Math.sin(t * 11) * 2 + Math.sin(t * 17)
            : 0;
        const flame = e.model.getObjectByName("Torch flame");
        if (flame) {
          flame.visible = !!e.data.torch?.lit;
          flame.scale.y = 1 + Math.sin(t * 13) * 0.12;
        }
      }
      e.statusVisuals.sync(
        e.data.conditions ?? [],
        e.isEnemy ? e.data.hp > 0 : e.data.survival.status !== "dead",
      );
      e.statusVisuals.update(t, this.camera);
      e.lock = Math.max(0, e.lock - dt);
      e.deathGrace = Math.max(0, (e.deathGrace ?? 0) - dt);
      const target =
          e.travel?.[0] ??
          new T.Vector3(e.data.x * TILE, 0.04, e.data.z * TILE),
        delta = target.clone().sub(e.group.position);
      const moving = delta.length() > 0.02;
      e.model.userData.animate?.(t, moving);
      // Resolve a pushed target visually after contact, even though the rules
      // have already committed its new square.
      if (moving && !e.pendingImpacts) {
        e.group.rotation.y = Math.atan2(delta.x, delta.z);
        e.group.position.addScaledVector(
          delta,
          Math.min(1, (dt * 16) / delta.length()),
        );
      }
      if (e.travel?.length && e.group.position.distanceTo(target) <= 0.02)
        e.travel.shift();
      if (!e.lock && !e.pendingImpacts) {
        const dead = e.isEnemy
          ? e.data.hp <= 0
          : ["dying", "stable", "dead"].includes(e.data.survival.status);
        this.animate(
          e.data.id,
          dead ? "Death_A_Pose" : moving ? "Walking_A" : "Idle",
        );
      }
      if (e.isEnemy && e.data.hp <= 0 && !e.pendingImpacts && !e.deathGrace)
        e.group.visible = false;
      e.ring.material.opacity = e.data.selected ? 0.95 : 0.35;
      e.ring.scale.setScalar(e.data.selected ? 1.15 : 1);
    }
    // Sample animated weapon transforms after advancing the rig for this frame.
    for (const effect of [...this.effects]) {
      if (!effect.update(dt)) {
        effect.dispose();
        this.effects.splice(this.effects.indexOf(effect), 1);
      }
    }
    for (const o of this.torches)
      o.light.intensity =
        28 + Math.sin(t * 5 + o.phase) * 3 + Math.sin(t * 11 + o.phase) * 1.5;
    if (!this.manualCamera) {
      if (this.targetFocus)
        this.focus.lerp(this.targetFocus, 1 - Math.exp(-dt * 5));
      const offset = new T.Vector3(
        Math.cos(this.angle) * 32,
        27,
        Math.sin(this.angle) * 32,
      );
      this.camera.position.lerp(
        this.focus.clone().add(offset),
        1 - Math.exp(-dt * 6),
      );
      this.camera.lookAt(this.focus);
    }
    this.moon.position.copy(this.focus).add(new T.Vector3(-15, 35, -12));
    this.moon.target.position.copy(this.focus);
    const selected = [...this.entities.values()].find(
      (e) => !e.isEnemy && e.data.selected,
    );
    this.partyLight.position
      .copy(selected?.group.position ?? this.focus)
      .add(new T.Vector3(0, 4, 0));
    this.updateFloatingText(dt);
    this.composer.render();
  }
  resize() {
    const aspect = innerWidth / innerHeight;
    this.camera.left = (-this.zoom * aspect) / 2;
    this.camera.right = (this.zoom * aspect) / 2;
    this.camera.top = this.zoom / 2;
    this.camera.bottom = -this.zoom / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    this.composer.setSize(innerWidth, innerHeight);
  }
}
