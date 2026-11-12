import {
  BooleanKeyframeTrack,
  Group,
  Mesh,
  SphereGeometry,
  MeshStandardMaterial,
} from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";

// Complete authored exports already include fitted gear and five source clips.
// Never run generic recolouring/weapon attachment over these reviewed models.
export function equippedCreatureAppearance(asset, spec) {
  const model = clone(asset.scene);
  const materials = new Map();
  model.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const own = (source) => {
      if (!materials.has(source)) materials.set(source, source.clone());
      return materials.get(source);
    };
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(own)
      : own(mesh.material);
    mesh.castShadow = mesh.receiveShadow = true;
  });
  model.scale.setScalar(spec.scale);
  Object.assign(model.userData, {
    avatar: spec.model,
    authoredEquippedCreature: true,
    height: spec.height,
    playFullDeath: true,
    attackPresentation: spec.attack,
    equipment: { weapon: spec.weapon, shield: !!spec.shield },
    dispose: () => materials.forEach((material) => material.dispose()),
  });
  if (spec.ambient === "grave-flies") {
    const swarm = new Group();
    swarm.name = "Grave flies";
    const geometry = new SphereGeometry(0.009, 5, 3);
    const material = new MeshStandardMaterial({
      color: 0x25261c,
      roughness: 0.8,
    });
    const flies = Array.from({ length: 9 }, () => new Mesh(geometry, material));
    swarm.add(...flies);
    const head = model.getObjectByName("head");
    if (!head) throw new Error("Grave flies require the reviewed head bone");
    // Keep world-sized insects outside the source rig's centimeter scale.
    model.add(swarm);
    model.userData.animate = (time) => {
      head.updateWorldMatrix(true, false);
      swarm.position.copy(head.getWorldPosition(swarm.position));
      model.worldToLocal(swarm.position);
      flies.forEach((fly, i) => {
        const a = time * (2.1 + i * 0.13) + i * 2.4;
        fly.position.set(
          Math.cos(a) * (0.32 + i * 0.014),
          0.05 + Math.sin(a * 1.7) * 0.18,
          Math.sin(a) * 0.31,
        );
      });
    };
    const dispose = model.userData.dispose;
    model.userData.dispose = () => {
      dispose();
      geometry.dispose();
      material.dispose();
    };
    model.userData.animate(0);
  }
  let clips = asset.animations;
  if (spec.attack?.kind === "bottle" || spec.attack?.payloadPart) {
    const flask = spec.attack.payloadPart
      ? model.getObjectByName(spec.attack.payloadPart)
      : (model.getObjectByName("Firestarter_held_flask") ??
        model.getObjectByName("Firestarter held flask"));
    if (!flask)
      throw new Error("Equipped throw requires its reviewed held payload");
    clips = clips.map((source) => {
      const clip = source.clone();
      const throwing = clip.name === spec.attack.clip;
      const release = spec.attack.release;
      const recover = spec.attack.recover ?? Math.max(0.9, release + 0.4);
      if (
        throwing &&
        !(release > 0 && recover > release && release < clip.duration)
      )
        throw new Error(
          "Equipped payload requires ordered release/recovery times",
        );
      const returns = throwing && recover <= clip.duration;
      const times = throwing
        ? returns
          ? [0, release, recover]
          : [0, release]
        : [0];
      clip.tracks.push(
        new BooleanKeyframeTrack(
          `${flask.uuid}.visible`,
          times,
          throwing ? (returns ? [true, false, true] : [true, false]) : [true],
        ),
      );
      return clip;
    });
  }
  return { model, clips };
}
