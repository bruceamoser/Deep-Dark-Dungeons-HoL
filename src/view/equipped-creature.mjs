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
    equipment: { weapon: spec.weapon, shield: !!spec.shield },
    dispose: () => materials.forEach((material) => material.dispose()),
  });
  return { model, clips: asset.animations };
}
