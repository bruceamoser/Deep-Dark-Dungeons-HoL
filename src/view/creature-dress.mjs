// Draws the theme and rank features from a resolved creature look onto an enemy model.
//
// Attachments use the joint names the CC0 creature packs share (`Head`, `Torso`, `Hips`,
// `UpperArm.L`), matched case-insensitively so both the KayKit and Quaternius rigs work.
// Anything a rig does not have falls back to the model root, so a skinned or unskinned
// enemy still gets its theme kit.

import * as T from "three";

function bonesOf(model) {
  const bones = new Map();
  model.traverse((o) => {
    if (o.isBone) bones.set(o.name.toLowerCase(), o);
  });
  return bones;
}

function findBone(bones, ...names) {
  for (const n of names) {
    const b = bones.get(n.toLowerCase());
    if (b) return b;
  }
  return null;
}

function material(owned, color, { metalness = 0.05, roughness = 0.7, emissive = null } = {}) {
  const m = new T.MeshStandardMaterial({ color, metalness, roughness });
  if (emissive) {
    m.emissive = new T.Color(emissive);
    m.emissiveIntensity = 1.6;
  }
  owned.push(m);
  return m;
}

function shape(owned, parent, name, geometry, mat, position = [0, 0, 0], rotation = null) {
  owned.push(geometry);
  const mesh = new T.Mesh(geometry, mat);
  mesh.name = name;
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

/**
 * @param {THREE.Object3D} model enemy model
 * @param {object} look result of `creatureLook`
 * @param {Array} owned collectible list the caller disposes
 */
export function dressCreature(model, look, owned) {
  const bones = bonesOf(model);
  const head = findBone(bones, "head");
  const torso = findBone(bones, "torso", "chest", "abdomen", "spine");
  const hips = findBone(bones, "hips", "pelvis");
  const arms = ["l", "r"].map((s) => findBone(bones, `upperarm.${s}`, `shoulder.${s}`));
  // A rig without the expected joints (an unskinned prop, or a pack that names things
  // differently) still gets its theme kit, anchored on the model root.
  const headAt = head ?? model;
  const torsoAt = torso ?? model;
  const hipsAt = hips ?? model;
  const armAt = arms.map((a) => a ?? model);
  const { colors, features, rank } = look;

  const cloth = material(owned, colors.cloth, { roughness: 0.92 });
  const metal = material(owned, colors.metal, { metalness: 0.8, roughness: 0.38 });
  const glowy = colors.glow
    ? material(owned, colors.glow, { emissive: colors.glow, roughness: 0.4 })
    : null;
  const bone = material(owned, "#cfc6ae", { roughness: 0.85 });

  for (const f of features) {
    if (f === "warpaint")
      for (const s of [-1, 1])
        shape(owned, headAt, "Warpaint", new T.BoxGeometry(0.09, 0.022, 0.02), cloth,
          [s * 0.1, 0.06, 0.19], [0, 0, s * 0.3]);
    else if (f === "eyeGlow" && glowy)
      for (const s of [-1, 1])
        shape(owned, headAt, "Eye glow", new T.SphereGeometry(0.028, 7, 6), glowy,
          [s * 0.1, 0.1, 0.19]);
    else if (f === "tusks")
      for (const s of [-1, 1])
        shape(owned, headAt, "Tusk", new T.ConeGeometry(0.022, 0.11, 6), bone,
          [s * 0.07, -0.04, 0.19], [Math.PI, 0, s * 0.18]);
    else if (f === "horns")
      for (const s of [-1, 1])
        shape(owned, headAt, "Horn", new T.ConeGeometry(0.045, 0.22, 7), bone,
          [s * 0.13, 0.2, 0], [0, 0, -s * 0.45]);
    else if (f === "tatters")
      for (let i = 0; i < 5; i += 1)
        shape(owned, torsoAt, "Tatter", new T.BoxGeometry(0.07, 0.2, 0.02), cloth,
          [Math.sin(i * 1.7) * 0.18, -0.2 - (i % 2) * 0.05, Math.cos(i * 1.3) * 0.16],
          [0.1, 0, Math.sin(i) * 0.12]);
    else if (f === "plating") {
      shape(owned, torsoAt, "Chest plate", new T.BoxGeometry(0.34, 0.26, 0.16), metal,
        [0, 0.08, 0.11]);
      for (let i = 0; i < 3; i += 1)
        shape(owned, torsoAt, "Rivet", new T.SphereGeometry(0.018, 5, 4), metal,
          [-0.11 + i * 0.11, 0.16, 0.2]);
    } else if (f === "scarf")
      shape(owned, torsoAt, "Scarf", new T.TorusGeometry(0.16, 0.045, 6, 12, Math.PI * 1.3),
        cloth, [0, 0.28, 0], [Math.PI / 2, 0, Math.PI * 0.85]);
    else if (f === "bandolier")
      shape(owned, torsoAt, "Bandolier", new T.TorusGeometry(0.24, 0.028, 5, 14), cloth,
        [0, 0.1, 0], [Math.PI / 2, 0.36, 0]).scale.set(1, 1, 0.8);
    else if (f === "furRuff")
      shape(owned, torsoAt, "Fur ruff", new T.TorusGeometry(0.21, 0.07, 6, 14), cloth,
        [0, 0.26, 0], [Math.PI / 2 - 0.15, 0, 0]);
    else if (f === "boneTrophy")
      for (let i = 0; i < 3; i += 1)
        shape(owned, torsoAt, "Bone trophy", new T.CapsuleGeometry(0.012, 0.07, 3, 5), bone,
          [-0.14 + i * 0.14, 0.2, 0.16], [0, 0, 0.2]);
    else if (f === "collar")
      shape(owned, torsoAt, "Collar", new T.TorusGeometry(0.15, 0.03, 5, 12), metal,
        [0, 0.26, 0], [Math.PI / 2, 0, 0]);
    else if (f === "frost")
      for (let i = 0; i < 4; i += 1)
        shape(owned, torsoAt, "Frost shard", new T.OctahedronGeometry(0.05), metal,
          [Math.sin(i * 2.1) * 0.16, 0.1 - i * 0.05, Math.cos(i * 2.1) * 0.14]);
    else if (f === "ember")
      for (let i = 0; i < 3; i += 1)
        shape(owned, torsoAt, "Ember crack", new T.BoxGeometry(0.06, 0.014, 0.014), glowy,
          [0.04 + i * 0.03, 0.05 - i * 0.07, 0.17], [0, 0, i % 2 ? 0.6 : -0.6]);
    else if (f === "wisps")
      for (let i = 0; i < 4; i += 1)
        shape(owned, torsoAt, "Wisp", new T.SphereGeometry(0.035, 6, 5), glowy,
          [Math.sin(i * 1.9) * 0.24, 0.06 + (i % 2) * 0.1, Math.cos(i * 1.9) * 0.2]);
  }

  if (rank.plating && !features.includes("plating"))
    for (const arm of armAt)
      if (arm)
        shape(owned, arm, "Pauldron", new T.SphereGeometry(0.1, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6),
          metal, [0, 0.06, 0]);
  if (rank.spikes)
    for (let i = 0; i < 3; i += 1)
      shape(owned, torsoAt, "Spike", new T.ConeGeometry(0.03, 0.12, 6), metal,
        [-0.1 + i * 0.1, 0.26, -0.04], [-0.3, 0, 0]);
  if (rank.banner)
    shape(owned, torsoAt, "Banner pole", new T.CylinderGeometry(0.014, 0.014, 0.62, 6), cloth,
      [0.2, 0.3, -0.12], [0, 0, 0.12]);
  if (rank.crown) {
    const crown = shape(owned, headAt, "Crown", new T.TorusGeometry(0.15, 0.02, 5, 14), metal,
      [0, 0.21, 0], [Math.PI / 2, 0, 0]);
    crown.scale.set(1, 1, 0.9);
    if (glowy) shape(owned, headAt, "Crown gem", new T.OctahedronGeometry(0.035), glowy, [0, 0.22, 0.15]);
  }
  if (hips && look.colors.cloth)
    shape(owned, hipsAt, "Girdle", new T.CylinderGeometry(0.19, 0.19, 0.07, 12, 1, true), cloth,
      [0, 0.02, 0]).scale.z = 0.9;

  model.userData.creatureLook = {
    theme: look.theme,
    themeLabel: look.themeLabel,
    features: [...features],
  };
  return look;
}
