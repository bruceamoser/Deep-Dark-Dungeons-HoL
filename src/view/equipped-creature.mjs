import { BooleanKeyframeTrack } from "three";
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
  let clips = asset.animations;
  if (spec.attack?.kind === "bottle") {
    const flask =
      model.getObjectByName("Firestarter_held_flask") ??
      model.getObjectByName("Firestarter held flask");
    if (!flask)
      throw new Error("Equipped bottle throw requires the reviewed held flask");
    clips = clips.map((source) => {
      const clip = source.clone();
      const throwing = clip.name === spec.attack.clip;
      const times = throwing
        ? [0, spec.attack.release, Math.min(clip.duration, 0.9)]
        : [0];
      clip.tracks.push(
        new BooleanKeyframeTrack(
          `${flask.uuid}.visible`,
          times,
          throwing ? [true, false, true] : [true],
        ),
      );
      return clip;
    });
  }
  return { model, clips };
}
