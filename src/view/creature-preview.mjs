import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { equipmentAppearance } from "./appearance.mjs";
import { CREATURE_ROSTER } from "../core/creature-roster.mjs";
import { createActorEnvironment, lightActor } from "./actor-lighting.mjs";

// One context per open field guide; models are copies of the actual game assets.
export function creaturePreview(canvas, assets, creatureId) {
  const renderer = new T.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = T.ACESFilmicToneMapping;
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(34, 1, 0.05, 100);
  const environment = createActorEnvironment(renderer);
  scene.add(new T.HemisphereLight(0xd4e5f1, 0x302a24, 1.5));
  for (const [colour, intensity, position] of [
    [0xffe3bb, 2.5, [3, 5, 4]],
    [0x8ab9c4, 1.8, [-3, 3, -2]],
  ]) {
    const light = new T.DirectionalLight(colour, intensity);
    light.position.set(...position);
    scene.add(light);
  }
  const base = new T.Mesh(
    new T.CylinderGeometry(1, 1.06, 0.06, 48),
    new T.MeshStandardMaterial({ color: 0x26383c, roughness: 0.8 }),
  );
  scene.add(base);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.minPolarAngle = 0.15;
  controls.maxPolarAngle = Math.PI * 0.85;
  controls.mouseButtons = {
    LEFT: T.MOUSE.ROTATE,
    MIDDLE: T.MOUSE.DOLLY,
    RIGHT: T.MOUSE.ROTATE,
  };
  const center = new T.Vector3(),
    extent = new T.Vector3(1, 2, 1);
  let current,
    mixer,
    lighting,
    clips = [],
    pose = "idle",
    radius = 1;
  let frame,
    disposed = false,
    elapsed = 0,
    last = performance.now();
  const poses = () => {
    const weapon = CREATURE_ROSTER[canvas.dataset.creature]?.weapon;
    const candidates = {
      idle: ["Idle"],
      walk: ["Walking_A"],
      attack: [
        weapon === "spell"
          ? "Spellcast_Shoot"
          : ["bow", "dart", "sling"].includes(weapon)
            ? "2H_Ranged_Shoot"
            : ["claw", "bite", "slam"].includes(weapon)
              ? "Unarmed_Melee_Attack_Punch_A"
              : "1H_Melee_Attack_Slice_Diagonal",
        "1H_Melee_Attack_Slice_Diagonal",
      ],
      hit: ["Hit_A"],
      death: ["Death_A_Pose"],
    };
    return Object.fromEntries(
      Object.entries(candidates).map(([key, names]) => [
        key,
        names.map((name) => clips.find((c) => c.name === name)).find(Boolean),
      ]),
    );
  };
  const play = (name) => {
    const clip = poses()[name];
    if (!clip && !["idle", "walk"].includes(name)) return;
    pose = name;
    canvas.dataset.pose = pose;
    mixer.stopAllAction();
    if (clip) mixer.clipAction(clip).reset().play();
    mixer.update(0.1);
    current.userData.animate?.(elapsed, pose === "walk");
  };
  const reset = () => {
    controls.target.copy(center);
    const direction = new T.Vector3(0.65, 0.3, 1).normalize();
    const inverseView = new T.Quaternion()
      .setFromRotationMatrix(
        new T.Matrix4().lookAt(direction, new T.Vector3(), camera.up),
      )
      .invert();
    const vertical = Math.tan(T.MathUtils.degToRad(camera.fov / 2));
    let distance = 0.3;
    for (const x of [-0.5, 0.5])
      for (const y of [-0.5, 0.5])
        for (const z of [-0.5, 0.5]) {
          const corner = new T.Vector3(
            x * extent.x,
            y * extent.y,
            z * extent.z,
          ).applyQuaternion(inverseView);
          distance = Math.max(
            distance,
            corner.z + Math.abs(corner.y) / vertical,
            corner.z + Math.abs(corner.x) / (vertical * camera.aspect),
          );
        }
    distance *= 1.12;
    camera.position.copy(center).add(direction.multiplyScalar(distance));
    controls.minDistance = Math.max(0.25, radius * 0.65);
    controls.maxDistance = distance * 2.5;
    controls.update();
  };
  const dropModel = () => {
    if (!current) return;
    mixer?.stopAllAction();
    mixer?.uncacheRoot(current);
    lighting?.dispose();
    current.userData.dispose?.();
    const skeletons = new Set();
    current.traverse((o) => {
      if (o.isSkinnedMesh) skeletons.add(o.skeleton);
    });
    skeletons.forEach((skeleton) => skeleton.dispose());
    scene.remove(current);
    current = null;
  };
  const update = (id) => {
    dropModel();
    canvas.dataset.rendered = "false";
    canvas.dataset.creature = id;
    canvas.dataset.model = CREATURE_ROSTER[id].model;
    const out = equipmentAppearance(
      assets,
      { type: id, id: "bestiary-preview" },
      true,
    );
    current = out.model;
    current.traverse((object) => {
      if (object.isMesh) object.frustumCulled = false;
    });
    clips = out.clips;
    scene.add(current);
    lighting = lightActor(current, environment.texture);
    mixer = new T.AnimationMixer(current);
    play("idle");
    current.updateMatrixWorld(true);
    const bounds = new T.Box3();
    current.traverse((o) => {
      if (!o.isMesh) return;
      for (let parent = o; parent; parent = parent.parent)
        if (!parent.visible) return;
      o.skeleton?.update();
      for (let i = 0; i < o.geometry.attributes.position.count; i++) {
        const p = new T.Vector3();
        o.getVertexPosition(i, p);
        bounds.expandByPoint(p.applyMatrix4(o.matrixWorld));
      }
    });
    bounds.getCenter(center);
    const size = bounds.getSize(extent);
    radius = Math.max(0.3, size.length() / 2);
    base.scale.set(
      Math.max(0.4, size.x * 0.6),
      1,
      Math.max(0.4, size.z * 0.65),
    );
    base.position.set(center.x, bounds.min.y - 0.04, center.z);
    reset();
  };
  const onChange = () => {
    canvas.dataset.view = `${controls.getAzimuthalAngle().toFixed(4)},${controls.getDistance().toFixed(4)}`;
  };
  controls.addEventListener("change", onChange);
  const onKey = (event) => {
    if (!["ArrowLeft", "ArrowRight", "+", "=", "-", "_"].includes(event.key))
      return;
    event.preventDefault();
    event.stopPropagation();
    const offset = camera.position.clone().sub(controls.target);
    if (event.key.startsWith("Arrow"))
      offset.applyAxisAngle(
        new T.Vector3(0, 1, 0),
        event.key === "ArrowLeft" ? -0.15 : 0.15,
      );
    else
      offset.setLength(
        T.MathUtils.clamp(
          offset.length() * (["+", "="].includes(event.key) ? 0.9 : 1.1),
          controls.minDistance,
          controls.maxDistance,
        ),
      );
    camera.position.copy(controls.target).add(offset);
    controls.update();
  };
  canvas.addEventListener("keydown", onKey);
  const observer = new ResizeObserver(() => {
    if (disposed) return;
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    reset();
  });
  observer.observe(canvas);
  const tick = (now) => {
    if (disposed) return;
    const delta = Math.min(0.05, (now - last) / 1000);
    last = now;
    elapsed += delta;
    mixer.update(delta);
    current.userData.animate?.(elapsed, pose === "walk");
    controls.update();
    renderer.render(scene, camera);
    canvas.dataset.rendered = "true";
    frame = requestAnimationFrame(tick);
  };
  try {
    update(creatureId);
  } catch (error) {
    dispose();
    throw error;
  }
  frame = requestAnimationFrame(tick);
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    canvas.removeEventListener("keydown", onKey);
    controls.dispose();
    dropModel();
    base.geometry.dispose();
    base.material.dispose();
    environment.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }
  return {
    update,
    play,
    reset,
    dispose,
    supportedPoses: () =>
      Object.keys(poses()).filter(
        (name) => ["idle", "walk"].includes(name) || poses()[name],
      ),
  };
}
