import * as T from "three";
// Game-authored accessories fitted to the approved head; the body/rig stay authored.
export function addMasonBeard(model, headName, style, colour, owned) {
  const head = model.getObjectByName(headName),
    bone = model.getObjectByName("head");
  if (!head || !bone) return;
  model.updateMatrixWorld(true);
  head.traverse((o) => o.skeleton?.update());
  const ray = new T.Raycaster(),
    inverse = bone.matrixWorld.clone().invert();
  const front = (x, y) => {
    ray.set(new T.Vector3(x, y, 2), new T.Vector3(0, 0, -1));
    return (
      ray.intersectObject(head, true)[0]?.point.z ??
      0.27 * (1 - Math.abs(x) / 0.5)
    );
  };
  const long = style === "BeardLong";
  const rings = long
    ? [
        [0.27, 0.78, 0.11, 0.018],
        [0.28, 0.68, 0.035, 0.045],
        [0.21, 0.55, 0.035, 0.04],
        [0.07, 0.43, 0.04, 0],
      ]
    : [
        [0.27, 0.78, 0.11, 0.018],
        [0.27, 0.69, 0.025, 0.04],
        [0.16, 0.61, 0.05, 0],
      ];
  const positions = [],
    colours = [],
    indices = [],
    columns = 9;
  for (let back = 0; back < 2; back++)
    for (let row = 0; row < rings.length; row++)
      for (let i = 0; i < columns; i++) {
        const u = (i / (columns - 1)) * 2 - 1,
          [width, base, curve, bulge] = rings[row],
          x = u * width,
          y = base + curve * Math.pow(Math.abs(u), 1.3);
        const z =
          (row < 2 ? front(x, y) : 0.3 - Math.abs(u) * 0.11) +
          bulge -
          (back ? 0.065 : 0);
        positions.push(x, y, z);
        const shade = 0.92 + ((i + row * 2) % 3) * 0.04;
        colours.push(shade, shade, shade);
      }
  const perSide = rings.length * columns;
  for (let back = 0; back < 2; back++)
    for (let row = 0; row < rings.length - 1; row++)
      for (let i = 0; i < columns - 1; i++) {
        const a = back * perSide + row * columns + i,
          b = a + 1,
          c = a + columns,
          d = c + 1;
        indices.push(...(back ? [a, b, c, b, d, c] : [a, c, b, b, c, d]));
      }
  // Close the thickness at the sides, lower edge and recessed upper hairline.
  const edge = [];
  for (let i = 0; i < columns; i++) edge.push(i);
  for (let row = 1; row < rings.length; row++)
    edge.push(row * columns + columns - 1);
  for (let i = columns - 2; i >= 0; i--)
    edge.push((rings.length - 1) * columns + i);
  for (let row = rings.length - 2; row > 0; row--) edge.push(row * columns);
  for (let i = 0; i < edge.length; i++) {
    const a = edge[i],
      b = edge[(i + 1) % edge.length];
    indices.push(a, b, a + perSide, b, b + perSide, a + perSide);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new T.Float32BufferAttribute(colours, 3));
  geometry.setIndex(indices);
  geometry.applyMatrix4(inverse);
  geometry.computeVertexNormals();
  const material = new T.MeshStandardMaterial({
    color: colour,
    vertexColors: true,
    flatShading: true,
    roughness: 1,
    side: T.DoubleSide,
  });
  const beard = new T.Mesh(geometry, material);
  beard.name = style;
  beard.frustumCulled = false;
  bone.add(beard);
  owned.push(geometry, material);
  return beard;
}
