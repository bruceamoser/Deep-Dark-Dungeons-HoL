import { clone } from "three/addons/utils/SkeletonUtils.js";

// Licensed source body/rig plus the reviewed authored head and saucepan.
// The spear is already skinned to the hand: never attach legacy gear here.
export function goblinSpearhandAppearance(asset) {
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
  // Source feet are at zero; fixed scale excludes the moving spear from height.
  model.scale.setScalar(0.9);
  Object.assign(model.userData, {
    avatar: "GoblinSpearhand",
    goblinSpearhand: true,
    height: 1.25,
    playFullDeath: true,
    equipment: { weapon: "spear" },
    dispose: () => materials.forEach((material) => material.dispose()),
  });
  return { model, clips: asset.animations };
}
