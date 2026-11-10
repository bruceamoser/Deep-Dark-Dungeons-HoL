// Cosmetic heat/smoke variation; this does not create a gameplay light source.
export function elementalMotion(model) {
  let materials;
  const phase = model.id * 0.71;
  return (time) => {
    // Actor lighting replaces enemy materials during setup. Capture the final
    // rendered instances on first use, after that lighting setup has finished.
    if (!materials) {
      materials = new Map();
      model.traverse((object) => {
        if (!object.isMesh) return;
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material]) {
          if (materials.has(material)) continue;
          if (material.emissive?.getHex() || /smoke/i.test(material.name)) {
            const smoke = /smoke/i.test(material.name);
            materials.set(material, {
              intensity: material.emissiveIntensity,
              opacity: material.opacity,
              smoke,
            });
            if (smoke) material.depthWrite = false;
          }
        }
      });
    }
    let index = 0;
    for (const [material, rest] of materials) {
      const wave = Math.sin(
        time * (rest.smoke ? 1.4 : 4.3) + phase + index++ * 0.8,
      );
      material.emissiveIntensity = rest.intensity * (0.94 + wave * 0.06);
      if (rest.smoke) material.opacity = rest.opacity * (0.92 + wave * 0.08);
    }
  };
}
