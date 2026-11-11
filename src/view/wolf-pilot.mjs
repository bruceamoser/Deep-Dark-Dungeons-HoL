import * as T from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";

// The reviewed quadruped carries its own skeleton, jaw and five motion clips.
export function wolfPilotAppearance(asset) {
  const model = clone(asset.scene),
    materials = new Map();
  model.traverse((o) => {
    if (!o.isMesh) return;
    const own = (m) => {
      if (!materials.has(m)) materials.set(m, m.clone());
      return materials.get(m);
    };
    o.material = Array.isArray(o.material)
      ? o.material.map(own)
      : own(o.material);
    o.castShadow = o.receiveShadow = true;
  });
  model.updateMatrixWorld(true);
  const box = new T.Box3().setFromObject(model);
  const scale = 1.05 / Math.max(0.01, box.max.y - box.min.y);
  model.scale.multiplyScalar(scale);
  model.position.y -= box.min.y * scale;
  model.position.z -= (box.min.z + box.max.z) * 0.5 * scale;
  Object.assign(model.userData, {
    avatar: "WolfPilot",
    wolfPilot: true,
    height: 1.05,
    playFullDeath: true,
    equipment: { weapon: "bite" },
    dispose: () => materials.forEach((m) => m.dispose()),
  });
  return { model, clips: asset.animations };
}
