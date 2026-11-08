import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { equipmentAppearance } from "./appearance.mjs";
import { createActorEnvironment, lightActor } from "./actor-lighting.mjs";
import {
  TOWN_SERVICES,
  TOWN_NODES,
  TOWN_EDGES,
  TownNavigator,
} from "../core/town-navigation.mjs";

export class TownView {
  constructor(assets, onArrival, canInteract) {
    this.assets = assets;
    this.onArrival = onArrival;
    this.canInteract = canInteract;
    this.navigator = new TownNavigator();
    this.active = false;
    this.angle = Math.PI / 4;
    this.zoom = 31;
    this.canvas = document.createElement("canvas");
    this.canvas.id = "town-world";
    this.canvas.setAttribute(
      "aria-label",
      "Greyhaven town map. Select a building to walk there.",
    );
    document.body.insertBefore(
      this.canvas,
      document.querySelector("#vignette"),
    );
    this.labels = document.createElement("div");
    this.labels.className = "town-map-labels";
    document.body.insertBefore(this.labels, document.querySelector("#ui"));
    this.status = document.createElement("div");
    this.status.className = "town-route-status";
    this.status.setAttribute("role", "status");
    this.labels.append(this.status);
    this.renderer = new T.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.scene = new T.Scene();
    this.scene.background = new T.Color(0x122128);
    this.camera = new T.OrthographicCamera(-20, 20, 16, -16, 0.1, 150);
    this.scene.add(new T.HemisphereLight(0xe3eef3, 0x4d5440, 2));
    const sun = new T.DirectionalLight(0xffefd4, 2.8);
    sun.position.set(-12, 24, 16);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -23,
      right: 23,
      top: 23,
      bottom: -23,
      near: 1,
      far: 80,
    });
    sun.shadow.normalBias = 0.04;
    this.scene.add(sun);
    this.environment = createActorEnvironment(this.renderer);
    this.ray = new T.Raycaster();
    this.pointer = new T.Vector2();
    this.buildings = new Map();
    this.pins = new Map();
    this.party = new T.Group();
    this.scene.add(this.party);
    this.actors = [];
    this.path = new T.Line(
      new T.BufferGeometry(),
      new T.LineBasicMaterial({
        color: 0xf3ca79,
        transparent: true,
        opacity: 0.8,
      }),
    );
    this.scene.add(this.path);
    this.marker = new T.Mesh(
      new T.RingGeometry(0.55, 0.62, 48),
      new T.MeshBasicMaterial({ color: 0xf6d286, side: T.DoubleSide }),
    );
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.position.y = 0.12;
    this.marker.visible = false;
    this.scene.add(this.marker);
    this.canvas.addEventListener("pointermove", (e) =>
      this.hover(this.serviceAt(e)),
    );
    let rotationDrag = null;
    this.canvas.addEventListener("pointerdown", (e) => {
      if (e.button === 1) {
        e.preventDefault();
        rotationDrag = { x: e.clientX, angle: this.angle };
        this.canvas.setPointerCapture(e.pointerId);
      }
    });
    this.canvas.addEventListener("pointermove", (e) => {
      if (rotationDrag && e.buttons & 4) {
        this.angle = rotationDrag.angle - (e.clientX - rotationDrag.x) * 0.008;
        this.resize();
      }
    });
    this.canvas.addEventListener("pointerup", (e) => {
      if (e.button === 1) rotationDrag = null;
    });
    this.canvas.addEventListener("pointercancel", () => (rotationDrag = null));
    this.canvas.addEventListener("auxclick", (e) => {
      if (e.button === 1) e.preventDefault();
    });
    this.canvas.addEventListener("pointerleave", () => this.hover(null));
    this.canvas.addEventListener("click", (e) => {
      const id = this.serviceAt(e);
      if (id && this.canInteract()) this.navigate(id);
    });
    this.canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.zoom = T.MathUtils.clamp(this.zoom + e.deltaY * 0.012, 24, 42);
        this.resize();
      },
      { passive: false },
    );
    window.addEventListener("resize", () => this.resize());
    this.resize();
    let last = performance.now();
    const frame = (now) => {
      requestAnimationFrame(frame);
      const dt = Math.min(0.5, (now - last) / 1000);
      last = now;
      if (this.active) this.tick(dt);
    };
    requestAnimationFrame(frame);
    this.setActive(false);
  }
  async load() {
    const names = [
      ...new Set([
        ...TOWN_SERVICES.map((s) => s.model),
        "building_well_blue",
        "wall_straight",
        "tree_single_A",
        "tree_single_B",
        "rock_single_A",
        "crate_A_small",
        "barrel",
        "hex_grass",
      ]),
    ];
    const loader = new GLTFLoader();
    this.models = new Map(
      await Promise.all(
        names.map(async (name) => [
          name,
          (await loader.loadAsync(`/assets/town/${name}.gltf`)).scene,
        ]),
      ),
    );
    const ground = this.model("hex_grass", 35);
    const groundBox = new T.Box3().setFromObject(ground);
    ground.position.y = -groundBox.max.y - 0.06;
    ground.traverse((o) => {
      if (o.isMesh)
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          m.color.set(0x98bfa5);
    });
    this.scene.add(ground);
    this.buildStreets();
    for (const service of TOWN_SERVICES) {
      const obj = this.model(service.model, service.width);
      obj.position.set(service.x, 0, service.z);
      // Pack buildings face +Z; point their entrances toward the street ring.
      const entrance = TOWN_NODES[service.node];
      obj.rotation.y = Math.atan2(
        entrance.x - service.x,
        entrance.z - service.z,
      );
      obj.userData.service = service.id;
      this.scene.add(obj);
      this.buildings.set(service.id, obj);
      const box = new T.Box3().setFromObject(obj);
      const pin = document.createElement("button");
      pin.className = "town-place";
      pin.dataset.townPlace = service.id;
      pin.setAttribute("aria-label", `Visit ${service.place}`);
      const name = document.createElement("span");
      name.textContent = service.place;
      const key = document.createElement("kbd");
      key.textContent = service.hotkey.toUpperCase();
      pin.append(name, key);
      pin.title = `${service.detail} · Walk here (${service.hotkey.toUpperCase()})`;
      pin.onclick = () => {
        if (this.canInteract()) this.navigate(service.id);
      };
      pin.onpointerenter = () => this.hover(service.id);
      pin.onpointerleave = () => this.hover(null);
      this.labels.append(pin);
      this.pins.set(service.id, {
        element: pin,
        anchor: new T.Vector3(service.x, box.max.y + 0.25, service.z),
      });
    }
    this.place("building_well_blue", 2.6, -2.6, 2.2);
    for (const [x, z] of [
      [-3, -3],
      [-3, 3],
      [3, 3],
    ]) {
      this.place("tree_single_B", x, z, 1.1);
      this.place("rock_single_A", x + 0.6, z + 0.35, 0.55);
    }
    for (const [x, z] of [
      [-13, -3],
      [-13, 5],
      [-4, 13],
      [5, 13],
      [13, 3],
      [12, -5],
      [-3, -13],
    ])
      this.place("tree_single_A", x, z, 2.8);
    for (const [x, z] of [
      [-11, -11],
      [-12, 10],
      [11, 11],
      [3, -13],
    ])
      this.place("tree_single_B", x, z, 2.1);
    for (const [x, z] of [
      [-11, -5],
      [-9, -4],
      [-8, 11],
      [10, 5],
    ])
      this.place("crate_A_small", x, z, 0.8);
    for (const [x, z] of [
      [-11, 8],
      [2, 11],
      [-2, -11],
    ])
      this.place("barrel", x, z, 0.65);
    for (const [x, z] of [
      [-13, 0],
      [13, 6],
      [5, -13],
    ])
      this.place("rock_single_A", x, z, 1.6);
    this.renderer.shadowMap.needsUpdate = true;
    this.resize();
  }
  model(name, width) {
    const obj = clone(this.models.get(name));
    obj.updateMatrixWorld(true);
    const size = new T.Box3().setFromObject(obj).getSize(new T.Vector3());
    obj.scale.multiplyScalar(width / Math.max(size.x, size.z));
    obj.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.material = Array.isArray(o.material)
          ? o.material.map((m) => m.clone())
          : o.material.clone();
      }
    });
    const box = new T.Box3().setFromObject(obj);
    const center = box.getCenter(new T.Vector3());
    obj.position.set(-center.x, -box.min.y, -center.z);
    const root = new T.Group();
    root.add(obj);
    return root;
  }
  place(name, x, z, width) {
    const obj = this.model(name, width);
    obj.position.x = x;
    obj.position.z = z;
    this.scene.add(obj);
    return obj;
  }
  buildStreets() {
    const step = 0.25,
      halfWidth = 1;
    const edges = TOWN_EDGES.map(([a, b]) => [TOWN_NODES[a], TOWN_NODES[b]]);
    const inside = (x, z) =>
      edges.some(([a, b]) =>
        a.x === b.x
          ? Math.abs(x - a.x) < halfWidth &&
            z > Math.min(a.z, b.z) - halfWidth &&
            z < Math.max(a.z, b.z) + halfWidth
          : Math.abs(z - a.z) < halfWidth &&
            x > Math.min(a.x, b.x) - halfWidth &&
            x < Math.max(a.x, b.x) + halfWidth,
      );
    const positions = [],
      colors = [],
      indices = [],
      vertices = new Map();
    const earth = new T.Color(0xa98159);
    const vertex = (x, z) => {
      const key = `${x},${z}`;
      if (vertices.has(key)) return vertices.get(key);
      const index = positions.length / 3;
      vertices.set(key, index);
      positions.push(x * step, 0.02, z * step);
      const shade =
        0.94 +
        Math.sin(x * 1.13 + z * 0.71) * 0.035 +
        Math.cos(x * 0.29 - z * 0.63) * 0.025;
      colors.push(earth.r * shade, earth.g * shade, earth.b * shade);
      return index;
    };
    // One welded surface: straight edges and no paving seams or overlapping strips.
    for (let x = -28; x < 28; x++)
      for (let z = -28; z < 28; z++) {
        if (!inside((x + 0.5) * step, (z + 0.5) * step)) continue;
        const a = vertex(x, z),
          b = vertex(x + 1, z),
          c = vertex(x, z + 1),
          d = vertex(x + 1, z + 1);
        indices.push(a, c, b, b, c, d);
      }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute(
      "position",
      new T.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new T.Mesh(
      geometry,
      new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
    );
    mesh.name = "Straight dirt streets";
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    for (const [a, b] of edges)
      for (const [t, side] of [
        [0.3, 0.84],
        [0.7, -0.84],
      ]) {
        const x = a.x + (b.x - a.x) * t + (a.x === b.x ? side : 0);
        const z = a.z + (b.z - a.z) * t + (a.z === b.z ? side : 0);
        const rock = this.place("rock_single_A", x, z, 0.14);
        rock.rotation.y = x + z;
      }
  }
  setParty(party) {
    for (const a of this.actors) {
      a.mixer.stopAllAction();
      a.mixer.uncacheRoot(a.model);
      a.lighting.dispose();
      a.model.userData.dispose?.();
      a.model.traverse((o) => {
        if (o.isSkinnedMesh) o.skeleton.dispose();
      });
      this.party.remove(a.model, a.shadow);
      a.shadow.geometry.dispose();
      a.shadow.material.dispose();
    }
    this.actors = [];
    party.forEach((hero, i) => {
      const { model, clips } = equipmentAppearance(this.assets, hero);
      model.scale.multiplyScalar(0.75);
      model.traverse((o) => {
        if (o.isMesh) o.castShadow = false;
      });
      model.position.set((i % 2) * 0.65 - 0.325, 0, Math.floor(i / 2) * 0.7);
      const mixer = new T.AnimationMixer(model),
        idle = clips.find((c) => c.name === "Idle"),
        walk = clips.find((c) => c.name === "Walking_A");
      const shadow = new T.Mesh(
        new T.CircleGeometry(0.3, 24),
        new T.MeshBasicMaterial({
          color: 0x10221d,
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
        }),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.copy(model.position);
      shadow.position.y = 0.075;
      this.party.add(shadow);
      const a = {
        model,
        shadow,
        mixer,
        idle: idle && mixer.clipAction(idle),
        walk: walk && mixer.clipAction(walk),
        moving: null,
        lighting: lightActor(model, this.environment.texture, {
          cloneMaterials: false,
        }),
      };
      this.party.add(model);
      this.actors.push(a);
    });
  }
  setActive(active, party) {
    if (active && !this.active && party) this.setParty(party);
    this.active = active;
    this.canvas.hidden = !active;
    this.labels.hidden = !active;
    if (!active) this.cancel();
  }
  navigate(id, onArrival = null) {
    this.arrivalAction = onArrival;
    this.currentService = null;
    this.navigator.navigate(id);
    this.redrawPath();
    const service = this.navigator.destination;
    this.status.textContent = `Walking to ${service.place} · ${service.detail} · Esc to cancel`;
    for (const [key, pin] of this.pins)
      pin.element.classList.toggle("destination", key === id);
    const p = TOWN_NODES[service.node];
    this.marker.position.set(p.x, 0.12, p.z);
    this.marker.visible = true;
  }
  cancel() {
    this.arrivalAction = null;
    this.currentService = null;
    this.navigator.cancel();
    this.marker.visible = false;
    this.path.geometry.dispose();
    this.path.geometry = new T.BufferGeometry();
    this.status.textContent =
      "Select a building to walk there · Hotkeys take the same route";
    for (const p of this.pins.values())
      p.element.classList.remove("destination");
  }
  redrawPath() {
    this.path.geometry.dispose();
    this.path.geometry = new T.BufferGeometry().setFromPoints(
      [this.navigator.position, ...this.navigator.path].map(
        (p) => new T.Vector3(p.x, 0.14, p.z),
      ),
    );
  }
  serviceAt(event) {
    if (!this.active) return null;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      1 - ((event.clientY - rect.top) / rect.height) * 2,
    );
    this.ray.setFromCamera(this.pointer, this.camera);
    const hits = this.ray.intersectObjects([...this.buildings.values()], true);
    for (let o = hits[0]?.object; o; o = o.parent)
      if (o.userData.service) return o.userData.service;
    return null;
  }
  hover(id) {
    if (this.hovered === id) return;
    this.hovered = id;
    this.canvas.style.cursor = id ? "pointer" : "default";
    for (const [key, obj] of this.buildings) {
      obj.traverse((o) => {
        if (o.isMesh)
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            if (m.emissive) m.emissive.setHex(key === id ? 0x241a08 : 0x000000);
      });
      this.pins.get(key)?.element.classList.toggle("hovered", key === id);
    }
  }
  rotate(dir) {
    this.angle += (dir * Math.PI) / 2;
    this.resize();
  }
  resize() {
    const width = Math.max(300, innerWidth - (innerWidth > 1000 ? 245 : 190)),
      height = Math.max(300, innerHeight - 165);
    this.renderer.setSize(width, height, false);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.canvas.style.left = `${innerWidth - width}px`;
    this.canvas.style.top = "85px";
    const aspect = width / height;
    this.camera.left = (-this.zoom * aspect) / 2;
    this.camera.right = (this.zoom * aspect) / 2;
    this.camera.top = this.zoom / 2;
    this.camera.bottom = -this.zoom / 2;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(
      Math.cos(this.angle) * 32,
      30,
      Math.sin(this.angle) * 32,
    );
    this.camera.lookAt(0, 0, 0);
    this.camera.updateMatrixWorld();
    this.positionLabels();
  }
  positionLabels() {
    const rect = this.canvas.getBoundingClientRect();
    for (const p of this.pins.values()) {
      const v = p.anchor.clone().project(this.camera);
      p.element.style.left = `${rect.left + ((v.x + 1) * rect.width) / 2}px`;
      p.element.style.top = `${rect.top + ((1 - v.y) * rect.height) / 2}px`;
    }
  }
  tick(dt) {
    const before = { ...this.navigator.position };
    const canTravel = this.canInteract();
    const arrived = canTravel ? this.navigator.advance(dt) : null,
      moving = canTravel && !!this.navigator.destination;
    this.party.position.set(
      this.navigator.position.x,
      0,
      this.navigator.position.z,
    );
    if (
      moving &&
      Math.hypot(
        this.navigator.position.x - before.x,
        this.navigator.position.z - before.z,
      ) > 0.001
    )
      this.party.rotation.y = Math.atan2(
        this.navigator.position.x - before.x,
        this.navigator.position.z - before.z,
      );
    for (const a of this.actors) {
      if (a.moving !== moving) {
        a.moving = moving;
        if (moving) {
          a.idle?.stop();
          a.walk?.reset().play();
        } else {
          a.walk?.stop();
          a.idle?.reset().play();
        }
      }
      a.mixer.update(dt);
    }
    if (arrived) {
      this.marker.visible = false;
      this.status.textContent = `${arrived.place} · ${arrived.detail}`;
      for (const p of this.pins.values())
        p.element.classList.remove("destination");
      this.currentService = arrived.id;
      const arrivalAction = this.arrivalAction;
      this.arrivalAction = null;
      if (arrivalAction) arrivalAction();
      else this.onArrival(arrived.id);
    }
    this.positionLabels();
    this.renderer.render(this.scene, this.camera);
  }
}
