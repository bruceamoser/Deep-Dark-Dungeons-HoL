import * as T from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// A shared neutral bounce environment lifts the sculpt on actors without adding
// a global fill light that washes out the floor or changes visibility rules.
export function createActorEnvironment(renderer) {
  const generator = new T.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  try {
    return generator.fromScene(room, 0.04);
  } finally {
    room.dispose();
    generator.dispose();
  }
}

export function lightActor(model, texture) {
  const materials = new Map();
  const copy = (source) => {
    if (!source.isMeshStandardMaterial) return source;
    if (materials.has(source)) return materials.get(source);
    const material = source.clone();
    // Material.clone does not preserve custom palette shader callbacks.
    material.onBeforeCompile = source.onBeforeCompile;
    material.customProgramCacheKey = source.customProgramCacheKey;
    material.envMap = texture;
    material.envMapIntensity = 0.38;
    materials.set(source, material);
    return material;
  };
  model.traverse((object) => {
    if (!object.isMesh) return;
    object.material = Array.isArray(object.material)
      ? object.material.map(copy)
      : copy(object.material);
  });
  return {
    setIlluminated(lit) {
      for (const material of materials.values())
        material.envMapIntensity = lit ? 0.38 : 0.12;
    },
    dispose() {
      for (const material of materials.values()) material.dispose();
      materials.clear();
    },
  };
}
