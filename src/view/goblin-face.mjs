import * as T from "three";

// This CC0 head has an untextured palette UV layout. Recolour its existing
// features; do not add eye/teeth overlays or mutate the shared source geometry.
export function colorGoblinFace(model, owned) {
  const head = model.getObjectByName("OrcRaider_Head");
  if (!head?.isMesh || !head.geometry.attributes.uv) return;
  const materials = Array.isArray(head.material)
    ? head.material
    : [head.material];
  if (materials.some((m) => m.map)) return;
  const geometry = head.geometry.clone();
  owned.push(geometry);
  head.geometry = geometry;
  const position = geometry.attributes.position,
    uv = geometry.attributes.uv;
  const skin = new T.Color("#78954b"),
    brow = new T.Color("#35472b"),
    ivory = new T.Color("#e1d7b4"),
    dark = new T.Color("#141b10"),
    bronze = new T.Color("#9a7943"),
    lip = new T.Color("#303b26");
  const values = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const u = uv.getX(i),
      v = uv.getY(i),
      x = position.getX(i),
      y = position.getY(i),
      z = position.getZ(i);
    let color = skin;
    if (u >= 0.125 && u < 0.25) {
      if (y > 1.62 && y < 1.84 && z > 0.25) {
        color =
          y > 1.79
            ? brow
            : ((Math.abs(x) - 0.223) / 0.055) ** 2 + ((y - 1.72) / 0.06) ** 2 <
                  1 && z > 0.4
              ? dark
              : ivory;
      } else if (y > 2.15 && z < -0.05) color = brow;
    } else if (u >= 0.3 && u < 0.39) {
      const center = x < 0 ? -0.2 : 0.2;
      color =
        ((x - center) / 0.034) ** 2 + ((y - 1.606) / 0.042) ** 2 < 1 && z > 0.4
          ? dark
          : ivory;
    } else if (v > 0.28 && u < 0.125) color = ivory;
    else if (u > 0.5 && u < 0.61) color = bronze;
    else if (y > 1.36 && y < 1.43 && z > 0.4) color = lip;
    color.toArray(values, i * 3);
  }
  geometry.setAttribute("color", new T.BufferAttribute(values, 3));
  for (const m of materials) {
    m.color.setHex(0xffffff);
    m.vertexColors = true;
    m.needsUpdate = true;
  }
}
