// Turns a resolved wardrobe spec into geometry attached to the hero's bones.
//
// The KayKit rig supplies the body; everything here is original procedural geometry
// fitted to the same joint names the packed characters use (hips, chest, head, foot.l,
// upperarm.r and so on). Bone-local space on that rig is X across, Y up, Z forward,
// which is why the offsets below read as plain body measurements.
//
// Materials lean toward physically plausible response rather than flat cartoon fill:
// cloth carries sheen and high roughness, leather a low metalness with a broad
// highlight, metal a tight one. Cloth and leather also receive per-vertex colour
// variation so a large surface is never a single flat tone.

import * as T from "three";
import { wearFor } from "../core/wardrobe.mjs";

const ROUGH = { cloth: 0.94, leather: 0.62, metal: 0.34 };

/** Deterministic value noise so a given hero always wears the same cloth. */
function hash(x, y, z, seed) {
  let h =
    Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed * 4.113) * 43758.5453;
  return h - Math.floor(h);
}

/** Bake subtle per-vertex tone variation so large cloth surfaces read as fabric. */
function vary(geometry, amount = 0.1, seed = 1) {
  const pos = geometry.getAttribute("position");
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i += 1) {
    const n =
      1 -
      amount * 0.5 +
      hash(pos.getX(i), pos.getY(i), pos.getZ(i), seed) * amount;
    colors[i * 3] = n;
    colors[i * 3 + 1] = n;
    colors[i * 3 + 2] = n;
  }
  geometry.setAttribute("color", new T.BufferAttribute(colors, 3));
  return geometry;
}

function palette(owned, spec, seed) {
  const make = (color, kind, extra = {}) => {
    const material =
      kind === "cloth"
        ? new T.MeshPhysicalMaterial({
            color,
            roughness: ROUGH.cloth,
            metalness: 0,
            sheen: 0.5,
            sheenRoughness: 0.85,
            sheenColor: new T.Color(color).offsetHSL(0, -0.1, 0.18),
            vertexColors: true,
            ...extra,
          })
        : new T.MeshStandardMaterial({
            color,
            roughness: ROUGH[kind] ?? 0.8,
            metalness: kind === "metal" ? 0.82 : 0.04,
            vertexColors: true,
            ...extra,
          });
    owned.push(material);
    return material;
  };
  return {
    cloth: make(spec.wear.palette.cloth, "cloth", { side: T.DoubleSide }),
    trim: make(spec.wear.palette.trim, "cloth"),
    leather: make(spec.wear.palette.leather, "leather"),
    metal: make(spec.wear.palette.metal, "metal"),
    accent: make(spec.silhouette.accent, "leather"),
    seed,
  };
}

const HEM_Y = { hip: 0.02, thigh: -0.42, knee: -0.78, ankle: -1.3 };

/** A tapered tube standing in for a garment layer. */
function taper(top, bottom, height, segments = 12) {
  return new T.CylinderGeometry(top, bottom, height, segments, 1, true);
}

let variationSeed = 1;

function add(
  owned,
  parent,
  name,
  geometry,
  material,
  position = [0, 0, 0],
  rotation = null,
) {
  if (material.vertexColors)
    vary(geometry, material.metalness > 0.5 ? 0.05 : 0.14, variationSeed);
  owned.push(geometry);
  const mesh = new T.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// KayKit's 1.x rig names joints "upperarm.l"; the 2.0 and Series rigs drop the
// separator and use "upperarml". Index both spellings so one lookup serves either.
const boneKey = (name) => name.toLowerCase().replace(/[._-]/g, "");

function bonesOf(model) {
  const bones = new Map();
  model.traverse((o) => {
    if (!o.isBone) return;
    bones.set(o.name.toLowerCase(), o);
    bones.set(boneKey(o.name), o);
  });
  return bones;
}

const pick = (bones, ...names) => {
  for (const n of names) {
    const exact = bones.get(n.toLowerCase());
    if (exact) return exact;
    const normalised = bones.get(boneKey(n));
    if (normalised) return normalised;
  }
  return null;
};

/* ------------------------------------------------------------------ garment */

function lowerBody(owned, bones, mats, spec, occupied) {
  if (occupied.torso) return;
  const hips = pick(bones, "hips", "pelvis");
  if (!hips) return;
  const { wear } = spec;
  const floor = HEM_Y[wear.hem] ?? HEM_Y.thigh;
  const top = 0.12;
  const height = top - floor;

  if (wear.garment === "robe" || wear.garment === "coat") {
    // Split skirt panels keep the legs readable while moving.
    for (const s of [-1, 1]) {
      const panel = add(
        owned,
        hips,
        "Garment skirt",
        taper(0.3, 0.46, height, 10),
        mats.cloth,
        [s * 0.15, (top + floor) / 2, 0],
        [0, 0, s * 0.04],
      );
      panel.scale.z = 0.86;
    }
  } else {
    const skirt = add(
      owned,
      hips,
      "Garment skirt",
      taper(0.31, 0.4, height, 14),
      mats.cloth,
      [0, (top + floor) / 2, 0],
    );
    skirt.scale.z = 0.88;
  }

  if (wear.fastening === "sash" || wear.hem === "ankle") {
    add(
      owned,
      hips,
      "Hem band",
      new T.TorusGeometry(0.4, 0.028, 6, 18),
      mats.trim,
      [0, floor + 0.04, 0],
      [Math.PI / 2, 0, 0],
    );
  }
}

function torsoBody(owned, bones, mats, spec, occupied) {
  if (occupied.torso) return;
  const chest = pick(bones, "chest", "spine", "hips");
  if (!chest) return;
  const { wear } = spec;
  const shell = add(
    owned,
    chest,
    "Garment torso",
    taper(0.27, 0.3, 0.56, 14),
    mats.cloth,
    [0, 0.16, 0],
  );
  shell.scale.z = 0.82;

  // Collar shapes are the loudest culture cue at isometric distance.
  if (wear.collar === "stand") {
    add(
      owned,
      chest,
      "Collar stand",
      taper(0.19, 0.17, 0.14, 12),
      mats.trim,
      [0, 0.47, 0],
    );
  } else if (wear.collar === "shawl") {
    add(
      owned,
      chest,
      "Collar shawl",
      new T.TorusGeometry(0.22, 0.05, 6, 14, Math.PI * 1.4),
      mats.trim,
      [0, 0.44, -0.02],
      [Math.PI / 2, 0, Math.PI * 0.8],
    );
  } else if (wear.collar === "cowl") {
    add(
      owned,
      chest,
      "Collar cowl",
      taper(0.26, 0.2, 0.2, 12),
      mats.trim,
      [0, 0.46, 0],
    );
  }

  if (wear.fastening === "buttons") {
    for (let i = 0; i < 3; i += 1)
      add(
        owned,
        chest,
        "Button",
        new T.SphereGeometry(0.018, 6, 5),
        mats.metal,
        [0, 0.32 - i * 0.11, 0.235],
      );
  } else if (wear.fastening === "laces" || wear.fastening === "ties") {
    for (let i = 0; i < 3; i += 1)
      add(
        owned,
        chest,
        "Lacing",
        new T.BoxGeometry(0.13, 0.014, 0.014),
        mats.trim,
        [0, 0.3 - i * 0.1, 0.238],
        [0, 0, i % 2 ? 0.28 : -0.28],
      );
  } else if (wear.fastening === "toggles") {
    for (let i = 0; i < 2; i += 1)
      add(
        owned,
        chest,
        "Toggle",
        new T.CapsuleGeometry(0.016, 0.06, 4, 6),
        mats.leather,
        [0.05, 0.26 - i * 0.14, 0.24],
        [0, 0, Math.PI / 2],
      );
  }
}

function sleeves(owned, bones, mats, spec, occupied) {
  if (occupied.torso) return;
  const { sleeve } = spec.wear;
  if (sleeve === "short") return;
  for (const side of ["l", "r"]) {
    const upper = pick(bones, `upperarm.${side}`, `upperarm${side}`);
    if (!upper) continue;
    const length = sleeve === "wide" ? 0.34 : 0.3;
    const cuff = sleeve === "rolled" ? 0.11 : 0.1;
    add(
      owned,
      upper,
      "Garment sleeve",
      taper(cuff, 0.115, length, 9),
      mats.cloth,
      [0, -length * 0.45, 0],
    );
    if (sleeve === "rolled")
      add(
        owned,
        upper,
        "Sleeve cuff",
        new T.TorusGeometry(0.115, 0.028, 5, 10),
        mats.trim,
        [0, -length * 0.92, 0],
        [Math.PI / 2, 0, 0],
      );
    if (sleeve === "wide")
      add(owned, upper, "Sleeve drape", taper(0.15, 0.2, 0.2, 9), mats.cloth, [
        0,
        -length - 0.06,
        0,
      ]);
  }
}

/* ---------------------------------------------------------------- accessories */

function beltAndPouch(owned, bones, mats, spec, occupied) {
  const hips = pick(bones, "hips", "pelvis");
  if (!hips) return;
  const { kit } = spec;
  if (!occupied.belt && kit.belt !== "none") {
    if (kit.belt === "sash") {
      add(
        owned,
        hips,
        "Waist sash",
        new T.CylinderGeometry(0.33, 0.33, 0.19, 14, 1, true),
        mats.trim,
        [0, 0.06, 0],
      ).scale.z = 0.86;
      add(
        owned,
        hips,
        "Sash tail",
        new T.BoxGeometry(0.1, 0.3, 0.03),
        mats.trim,
        [-0.18, -0.09, 0.2],
        [0.1, 0, 0.16],
      );
    } else if (kit.belt === "rope") {
      add(
        owned,
        hips,
        "Rope belt",
        new T.TorusGeometry(0.31, 0.032, 6, 16),
        mats.leather,
        [0, 0.05, 0],
        [Math.PI / 2, 0, 0],
      );
      add(
        owned,
        hips,
        "Rope knot",
        new T.SphereGeometry(0.06, 7, 6),
        mats.leather,
        [0.16, 0.05, 0.24],
      );
    } else {
      add(
        owned,
        hips,
        "Belt",
        new T.CylinderGeometry(0.315, 0.315, 0.095, 16, 1, true),
        mats.leather,
        [0, 0.05, 0],
      ).scale.z = 0.86;
      add(
        owned,
        hips,
        "Belt buckle",
        new T.BoxGeometry(0.085, 0.075, 0.03),
        mats.metal,
        [0, 0.05, 0.27],
      );
    }
  }
  if (occupied.belt) return;

  const pouch = (x, scale = 1) => {
    const p = add(
      owned,
      hips,
      "Belt pouch",
      new T.BoxGeometry(0.12 * scale, 0.14 * scale, 0.08 * scale),
      mats.leather,
      [x, -0.03, 0.22],
      [0, x * 0.6, 0],
    );
    add(
      owned,
      p,
      "Pouch flap",
      new T.BoxGeometry(0.125 * scale, 0.05 * scale, 0.085 * scale),
      mats.trim,
      [0, 0.07 * scale, 0],
    );
  };
  if (kit.belt === "pouch" || kit.belt === "tool-rig") pouch(0.2);
  if (kit.belt === "tool-rig") {
    pouch(-0.2, 0.82);
    for (let i = 0; i < 3; i += 1)
      add(
        owned,
        hips,
        "Tool loop",
        new T.TorusGeometry(0.028, 0.009, 4, 8),
        mats.metal,
        [-0.06 + i * 0.055, 0.05, 0.275],
        [0, Math.PI / 2, 0],
      );
  }
  if (kit.tool === "hammer" || kit.tool === "spade")
    add(
      owned,
      hips,
      "Hanging tool",
      new T.CylinderGeometry(0.016, 0.016, 0.4, 5),
      mats.leather,
      [-0.26, -0.12, 0.16],
      [0.14, 0, 0.12],
    );
}

function boots(owned, bones, mats, spec, occupied) {
  if (occupied.feet || spec.kit.boots === "bare") return;
  const hard = spec.kit.boots === "hard";
  for (const side of ["l", "r"]) {
    const foot = pick(bones, `foot.${side}`, `foot${side}`);
    const lower = pick(bones, `lowerleg.${side}`, `lowerleg${side}`);
    if (!foot) continue;
    add(
      owned,
      foot,
      "Boot",
      new T.BoxGeometry(0.155, 0.13, 0.28),
      mats.leather,
      [0, -0.015, 0.055],
    );
    if (hard)
      add(
        owned,
        foot,
        "Boot cuff",
        new T.TorusGeometry(0.088, 0.026, 5, 10),
        mats.trim,
        [0, 0.06, 0.02],
        [0, 0, 0],
      );
    if (lower) {
      const shaftHeight = hard ? 0.34 : 0.22;
      add(
        owned,
        lower,
        "Boot shaft",
        taper(0.082, 0.07, shaftHeight, 8),
        mats.leather,
        [0, -shaftHeight * 0.55, 0],
      );
      if (spec.kit.boots === "wrapped")
        for (let i = 0; i < 3; i += 1)
          add(
            owned,
            lower,
            "Boot wrap",
            new T.TorusGeometry(0.078, 0.012, 4, 9),
            mats.trim,
            [0, -0.1 - i * 0.075, 0],
            [Math.PI / 2, 0, 0],
          );
    }
  }
}

function headgear(owned, bones, mats, spec, occupied) {
  const head = pick(bones, "head");
  if (!head) return;
  const gear = occupied.head ? "none" : spec.kit.headgear;
  const hood = spec.silhouette.hood;

  if (hood === "raised") {
    // A raised hood hides the face, which is the Shadow's whole read.
    add(
      owned,
      head,
      "Hood",
      new T.SphereGeometry(0.4, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
      mats.cloth,
      [0, 0.24, -0.03],
    ).scale.set(1, 1.12, 1.08);
    add(
      owned,
      head,
      "Hood brim",
      new T.TorusGeometry(0.36, 0.045, 6, 16, Math.PI * 1.1),
      mats.cloth,
      [0, 0.3, 0.19],
      [0.42, 0, Math.PI * 0.95],
    );
  } else if (hood === "lowered" || gear === "hood") {
    add(
      owned,
      head,
      "Lowered hood",
      new T.TorusGeometry(0.26, 0.06, 6, 14, Math.PI * 1.2),
      mats.cloth,
      [0, 0.12, -0.16],
      [Math.PI * 0.42, 0, Math.PI * 0.9],
    );
  }

  if (gear === "cap") {
    add(
      owned,
      head,
      "Cap",
      new T.SphereGeometry(0.31, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
      mats.cloth,
      [0, 0.3, 0],
    );
  } else if (gear === "brimmed") {
    add(
      owned,
      head,
      "Hat crown",
      new T.CylinderGeometry(0.19, 0.215, 0.19, 12),
      mats.cloth,
      [0, 0.34, 0],
    );
    add(
      owned,
      head,
      "Hat brim",
      new T.CylinderGeometry(0.38, 0.38, 0.022, 16),
      mats.cloth,
      [0, 0.25, 0],
    );
    add(
      owned,
      head,
      "Hat band",
      new T.TorusGeometry(0.212, 0.022, 4, 14),
      mats.trim,
      [0, 0.27, 0],
      [Math.PI / 2, 0, 0],
    );
  } else if (gear === "headband") {
    add(
      owned,
      head,
      "Headband",
      new T.TorusGeometry(0.33, 0.026, 5, 14),
      mats.trim,
      [0, 0.24, 0],
      [Math.PI / 2 - 0.16, 0, 0],
    );
  } else if (gear === "kerchief") {
    add(
      owned,
      head,
      "Kerchief",
      new T.SphereGeometry(0.335, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45),
      mats.cloth,
      [0, 0.24, 0],
    );
    add(
      owned,
      head,
      "Kerchief knot",
      new T.SphereGeometry(0.05, 7, 6),
      mats.cloth,
      [0.24, 0.24, -0.14],
    );
  }

  if (spec.silhouette.mask && hood !== "raised")
    add(
      owned,
      head,
      "Face wrap",
      new T.BoxGeometry(0.3, 0.16, 0.16),
      mats.cloth,
      [0, 0.16, 0.2],
    );
  return gear;
}

function carryGear(owned, bones, mats, spec, occupied) {
  const chest = pick(bones, "chest", "spine", "hips");
  if (!chest || occupied.torso) return;
  for (const item of spec.kit.carry) {
    if (item === "bandolier" || item === "drum-sling" || item === "oath-band") {
      add(
        owned,
        chest,
        "Chest strap",
        new T.TorusGeometry(0.3, 0.028, 5, 16),
        mats.leather,
        [0, 0.2, 0],
        [Math.PI / 2, 0.34, 0],
      ).scale.set(1, 1, 0.82);
    } else if (
      item === "satchel" ||
      item === "herb-satchel" ||
      item === "net-bag"
    ) {
      add(
        owned,
        chest,
        "Satchel strap",
        new T.BoxGeometry(0.035, 0.5, 0.03),
        mats.leather,
        [0.22, 0.18, 0.17],
        [0, 0, -0.28],
      );
      add(
        owned,
        chest,
        "Satchel",
        new T.BoxGeometry(0.19, 0.17, 0.1),
        mats.leather,
        [-0.26, -0.06, 0.06],
        [0, 0.2, 0],
      );
    } else if (
      item === "scroll-case" ||
      item === "despatch-tube" ||
      item === "chart-tubes"
    ) {
      add(
        owned,
        chest,
        "Scroll case",
        new T.CylinderGeometry(0.045, 0.045, 0.4, 8),
        mats.leather,
        [0.24, 0.14, -0.1],
        [0.16, 0, -0.22],
      );
      add(
        owned,
        chest,
        "Case cap",
        new T.CylinderGeometry(0.05, 0.05, 0.03, 8),
        mats.metal,
        [0.275, 0.32, -0.13],
        [0.16, 0, -0.22],
      );
    } else if (item === "flask-rig") {
      for (let i = 0; i < 3; i += 1)
        add(
          owned,
          chest,
          "Flask",
          new T.CapsuleGeometry(0.032, 0.09, 4, 7),
          mats.metal,
          [0.2 + i * 0.002, 0.08 - i * 0.1, 0.2],
        );
    } else if (item === "lantern-hook" || item === "charm-chain") {
      add(
        owned,
        chest,
        "Hanging chain",
        new T.TorusGeometry(0.05, 0.008, 4, 10),
        mats.metal,
        [-0.24, 0.1, 0.18],
        [0, Math.PI / 2, 0],
      );
    }
  }
}

function classSilhouette(owned, bones, mats, spec, occupied) {
  const chest = pick(bones, "chest", "spine");
  const hips = pick(bones, "hips", "pelvis");
  const { silhouette } = spec;

  if (chest && !occupied.torso) {
    if (
      silhouette.shoulders === "plate" ||
      silhouette.shoulders === "leather"
    ) {
      for (const side of ["l", "r"]) {
        const arm = pick(bones, `upperarm.${side}`, `upperarm${side}`);
        if (!arm) continue;
        const plate = silhouette.shoulders === "plate";
        add(
          owned,
          arm,
          "Pauldron",
          new T.SphereGeometry(
            plate ? 0.19 : 0.155,
            10,
            8,
            0,
            Math.PI * 2,
            0,
            Math.PI * 0.62,
          ),
          plate ? mats.metal : mats.leather,
          [0, 0.11, 0],
        ).scale.set(1, plate ? 1.05 : 0.8, 1);
        if (plate)
          add(
            owned,
            arm,
            "Pauldron rim",
            new T.TorusGeometry(0.185, 0.022, 5, 12),
            mats.accent,
            [0, 0.035, 0],
            [Math.PI / 2, 0, 0],
          );
      }
    } else if (
      silhouette.shoulders === "mantle" ||
      silhouette.shoulders === "fur"
    ) {
      const fur = silhouette.shoulders === "fur";
      add(
        owned,
        chest,
        "Shoulder mantle",
        new T.TorusGeometry(0.29, fur ? 0.085 : 0.055, 6, 16, Math.PI * 1.25),
        fur ? mats.leather : mats.cloth,
        [0, 0.36, -0.02],
        [Math.PI / 2, 0, Math.PI * 0.875],
      );
    }

    if (silhouette.tabard === "long" || silhouette.tabard === "sash") {
      const long = silhouette.tabard === "long";
      const panel = add(
        owned,
        hips ?? chest,
        "Tabard",
        new T.BoxGeometry(long ? 0.3 : 0.22, long ? 0.78 : 0.46, 0.03),
        mats.accent,
        [0, long ? -0.32 : -0.16, long ? 0.26 : 0.24],
        [long ? 0.04 : 0.02, 0, 0],
      );
      panel.scale.z = 1;
      add(
        owned,
        hips ?? chest,
        "Tabard emblem",
        new T.OctahedronGeometry(0.055),
        mats.metal,
        [0, long ? 0.24 : 0.2, long ? 0.28 : 0.26],
      ).scale.set(1, 1.3, 0.4);
    }

    if (silhouette.cape !== "none") {
      const long = silhouette.cape === "long";
      const cape = add(
        owned,
        chest,
        "Cape",
        new T.CylinderGeometry(
          0.3,
          long ? 0.62 : 0.44,
          long ? 1.15 : 0.62,
          14,
          1,
          true,
        ),
        mats.cloth,
        [0, long ? -0.42 : -0.14, -0.16],
        [0, 0, 0],
      );
      cape.scale.z = 0.72;
      add(
        owned,
        chest,
        "Cape clasp",
        new T.TorusGeometry(0.06, 0.016, 5, 10),
        mats.metal,
        [0.16, 0.36, 0.12],
        [0, Math.PI / 2, 0],
      );
    }
  }

  if (silhouette.gauntlets) {
    for (const side of ["l", "r"]) {
      const lower = pick(bones, `lowerarm.${side}`, `lowerarm${side}`);
      if (!lower) continue;
      add(
        owned,
        lower,
        "Gauntlet",
        taper(0.088, 0.075, 0.2, 8),
        mats.metal,
        [0, -0.16, 0],
      );
    }
  }
}

/* ------------------------------------------------------------------- public */

/**
 * Dress a hero model from its culture, background and class.
 *
 * @param {THREE.Object3D} model cloned hero model
 * @param {object} hero party hero, with `draft` holding the character choices
 * @param {Array} owned collectible list the caller disposes
 * @param {object} [opts] `occupied` names slots an equipped item already fills
 *   (`head`, `belt`, `feet`, `torso`); `seed` keeps cloth variation stable
 */
export function dressOutfit(model, hero, owned, opts = {}) {
  const draft = hero?.draft ?? hero ?? {};
  const spec = wearFor(draft);
  const occupied = {
    head: false,
    belt: false,
    feet: false,
    torso: false,
    ...(opts.occupied ?? {}),
  };
  const bones = bonesOf(model);
  if (!bones.size) return spec;
  // Complete KayKit characters already include belts, boots, hats and capes.
  // Keep their authored silhouettes until culture-specific real parts are mapped.
  if (opts.authoredOutfit) {
    model.userData.wardrobe = {
      culture: spec.cultureId,
      background: spec.backgroundId,
      class: spec.classId,
      headgear: "authored",
      occupied: { ...occupied },
    };
    return spec;
  }
  variationSeed = opts.seed ?? 7;
  const mats = palette(owned, spec, opts.seed ?? 7);

  // The KayKit character packs already model their own clothing, so a generated
  // garment shell on top of it hides that detail and thickens the silhouette. Culture
  // is expressed through the existing cloth recolour instead. Pass `garments: true`
  // for a bare rig that needs clothes drawn onto it.
  if (opts.garments) {
    lowerBody(owned, bones, mats, spec, occupied);
    torsoBody(owned, bones, mats, spec, occupied);
    sleeves(owned, bones, mats, spec, occupied);
  }
  beltAndPouch(owned, bones, mats, spec, occupied);
  boots(owned, bones, mats, spec, occupied);
  carryGear(owned, bones, mats, spec, occupied);
  const head = headgear(owned, bones, mats, spec, occupied);
  classSilhouette(owned, bones, mats, spec, occupied);

  model.userData.wardrobe = {
    culture: spec.cultureId,
    background: spec.backgroundId,
    class: spec.classId,
    headgear: head,
    occupied: { ...occupied },
  };
  return spec;
}

export { vary, hash };

/* ------------------------------------------------------------ equipped gear */

/**
 * Draw worn head, waist and feet items as real silhouettes instead of placeholders.
 * Colour comes from the item's active magic effect so enchanted gear still reads.
 *
 * @param {THREE.Object3D} model hero model
 * @param {object} hero party hero
 * @param {Array} owned collectible list the caller disposes
 * @param {Array} items worn inventory items (`{ worn, slot, effects, catalogId }`)
 * @param {(hero:object, item:object)=>Array} [colorOf] resolves an item's effect colour
 */
export function dressEquipped(model, hero, owned, items, colorOf) {
  const bones = bonesOf(model);
  if (!bones.size) return;
  const worn = (slot) => items.find((i) => i.worn && i.slot === slot);
  const materialFor = (item, metalness, roughness) => {
    const tint = colorOf?.(hero, item)?.[0]?.color ?? item?.effects?.[0]?.color;
    const material = new T.MeshStandardMaterial({
      color: tint ?? (metalness > 0.5 ? 0x776b52 : 0x5a4a38),
      metalness,
      roughness,
    });
    owned.push(material);
    return material;
  };

  const headItem = worn("head");
  if (headItem) {
    const head = pick(bones, "head");
    if (head) {
      const metal = materialFor(headItem, 0.78, 0.32);
      const band = add(
        owned,
        head,
        "Equipped head",
        new T.SphereGeometry(0.335, 14, 9, 0, Math.PI * 2, 0, Math.PI * 0.52),
        metal,
        [0, 0.2, 0],
      );
      band.scale.set(1, 1.05, 1.04);
      add(
        owned,
        head,
        "Helm rim",
        new T.TorusGeometry(0.33, 0.026, 5, 16),
        metal,
        [0, 0.2, 0],
        [Math.PI / 2, 0, 0],
      );
      add(
        owned,
        head,
        "Helm crest",
        new T.BoxGeometry(0.035, 0.14, 0.3),
        metal,
        [0, 0.42, -0.02],
      );
    }
  }

  const waistItem = worn("waist");
  if (waistItem) {
    const hips = pick(bones, "hips", "pelvis");
    if (hips) {
      const metal = materialFor(waistItem, 0.7, 0.35);
      add(
        owned,
        hips,
        "Equipped waist",
        new T.CylinderGeometry(0.325, 0.325, 0.12, 16, 1, true),
        metal,
        [0, 0.04, 0],
      ).scale.z = 0.88;
      add(
        owned,
        hips,
        "Belt buckle",
        new T.BoxGeometry(0.095, 0.085, 0.032),
        metal,
        [0, 0.04, 0.285],
      );
      add(
        owned,
        hips,
        "Belt pouch",
        new T.BoxGeometry(0.12, 0.14, 0.08),
        metal,
        [0.21, -0.04, 0.23],
        [0, 0.6, 0],
      );
    }
  }

  const feetItem = worn("feet");
  if (feetItem) {
    const metal = materialFor(feetItem, 0.45, 0.5);
    for (const side of ["l", "r"]) {
      const foot = pick(bones, `foot.${side}`, `foot${side}`);
      const lower = pick(bones, `lowerleg.${side}`, `lowerleg${side}`);
      if (foot)
        add(
          owned,
          foot,
          "Equipped feet",
          new T.BoxGeometry(0.162, 0.145, 0.29),
          metal,
          [0, -0.01, 0.055],
        );
      if (lower)
        add(
          owned,
          lower,
          "Boot shaft",
          taper(0.086, 0.074, 0.3, 9),
          metal,
          [0, -0.17, 0],
        );
    }
  }
}

export { bonesOf, pick, add, taper };
