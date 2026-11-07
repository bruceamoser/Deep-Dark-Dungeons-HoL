import * as T from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { CREATURE_ROSTER } from "../core/creature-roster.mjs";
import { creatureLook } from "../core/creature-variation.mjs";
import { dressCreature } from "./creature-dress.mjs";
const mat = (color, extra = {}) =>
  new T.MeshStandardMaterial({ color, roughness: 0.75, ...extra });
function joint(a, b, r, material) {
  const d = b.clone().sub(a),
    m = new T.Mesh(
      new T.CylinderGeometry(r * 0.65, r, d.length(), 7),
      material,
    );
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
  return m;
}
function vermin(kind) {
  const root = new T.Group(),
    shell = mat(kind === "Spider" ? 0x29242d : 0x5c5147),
    skin = mat(0x9b7463),
    eye = mat(0xb53625, { emissive: 0x8b110b, emissiveIntensity: 0.6 }),
    legs = [];
  const body = (x, y, z, sx, sy, sz, m = shell) => {
    const o = new T.Mesh(new T.SphereGeometry(1, 12, 8), m);
    o.position.set(x, y, z);
    o.scale.set(sx, sy, sz);
    root.add(o);
    return o;
  };
  body(0, 0.38, -0.25, kind === "Spider" ? 0.36 : 0.28, 0.27, 0.43);
  body(0, 0.35, 0.22, 0.22, 0.18, 0.23);
  if (kind === "Spider") {
    for (const side of [-1, 1])
      for (let i = 0; i < 4; i++) {
        const leg = new T.Group(),
          a = new T.Vector3(side * 0.12, 0.38, 0.2 - i * 0.14),
          b = new T.Vector3(
            side * (0.57 + 0.08 * Math.sin(i)),
            0.53,
            0.58 - i * 0.32,
          ),
          c = new T.Vector3(side * 0.88, 0.03, 0.75 - i * 0.44);
        leg.add(joint(a, b, 0.045, shell), joint(b, c, 0.027, shell));
        root.add(leg);
        legs.push(leg);
      }
    for (const x of [-0.12, -0.045, 0.045, 0.12])
      body(x, 0.41, 0.42, 0.035, 0.04, 0.025, eye);
    for (const x of [-0.09, 0.09])
      root.add(
        joint(
          new T.Vector3(x, 0.32, 0.39),
          new T.Vector3(x * 0.7, 0.17, 0.52),
          0.04,
          mat(0xad9b6c),
        ),
      );
  } else {
    const snout = new T.Mesh(new T.ConeGeometry(0.16, 0.35, 10), shell);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, 0.3, 0.48);
    root.add(snout);
    for (const side of [-1, 1]) {
      body(side * 0.18, 0.53, 0.23, 0.13, 0.14, 0.04, skin);
      body(side * 0.14, 0.4, 0.36, 0.03, 0.035, 0.03, eye);
      for (const z of [-0.42, 0.12]) {
        const leg = new T.Group();
        leg.add(
          joint(
            new T.Vector3(side * 0.18, 0.24, z),
            new T.Vector3(side * 0.28, 0.04, z + 0.15),
            0.06,
            skin,
          ),
        );
        root.add(leg);
        legs.push(leg);
      }
    }
    const curve = new T.CatmullRomCurve3([
      new T.Vector3(0, 0.3, -0.6),
      new T.Vector3(0.15, 0.13, -0.95),
      new T.Vector3(0.45, 0.06, -1.05),
      new T.Vector3(0.6, 0.08, -0.9),
    ]);
    root.add(new T.Mesh(new T.TubeGeometry(curve, 18, 0.028, 6, false), skin));
  }
  root.userData.animate = (time, moving) =>
    legs.forEach(
      (l, i) =>
        (l.rotation.y =
          Math.sin(time * (moving ? 14 : 2) + i * 1.7) *
          (moving ? 0.16 : 0.018)),
    );
  root.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return root;
}
export function creatureAppearance(assets, data, bow) {
  const look = CREATURE_ROSTER[data.type] ?? {
      model: "Skeleton",
      weapon: "melee",
    },
    procedural = ["Rat", "Spider"].includes(look.model);
  const body = procedural
    ? vermin(look.model)
    : clone(assets.get(look.model === "Ratkin" ? "Yeti" : look.model).scene);
  const root = new T.Group(),
    ownedMaterials = new Set(),
    ownedGeometries = new Set();
  root.add(body);
  if (procedural)
    body.traverse((o) => {
      if (o.isMesh) {
        ownedGeometries.add(o.geometry);
        ownedMaterials.add(o.material);
      }
    });
  const rawClips = procedural
    ? []
    : assets.get(look.model === "Ratkin" ? "Yeti" : look.model).animations;
  const aliases = {
    Idle: /^(Idle|Flying_Idle)$|Bat_Flying$/,
    Walking_A: /^(Walk|Run|Fast_Flying)$|Bat_Flying$/,
    Death_A_Pose: /Death/,
    "1H_Melee_Attack_Slice_Diagonal":
      /Weapon|Punch|Headbutt|Bite_Front|Bat_Attack$/,
    "2H_Ranged_Shoot": /Weapon|Punch|Headbutt/,
    Hit_A: /Hit/,
    Spellcast_Shoot: /Punch|Headbutt|Weapon/,
    Unarmed_Melee_Attack_Punch_A: /Punch|Headbutt|Bite_Front|Bat_Attack$/,
  };
  const clips = [...rawClips];
  for (const [name, re] of Object.entries(aliases)) {
    const clip = rawClips.find((c) => re.test(c.name));
    if (clip && !clips.some((c) => c.name === name)) {
      const copy = clip.clone();
      copy.name = name;
      clips.push(copy);
    }
  }
  const palette = {
    rime: 0x92bfd5,
    haunted: 0x798fa6,
    infernal: 0xb97957,
    dead: 0x71816a,
    kobolds: 0xb98b62,
    goblins: 0x83a26c,
    constructs: 0x9e9484,
  };
  body.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.material = o.material.clone();
      ownedMaterials.add(o.material);
      o.material.color.multiply(new T.Color(palette[look.theme] ?? 0xbdb4a3));
      if (look.theme === "haunted" || data.type === "creature-air-elemental") {
        o.material.transparent = true;
        o.material.opacity = 0.72;
        o.material.emissive.setHex(0x254552);
        o.material.emissiveIntensity = 0.4;
      }
      if (look.model === "Ooze") {
        o.material.roughness = 0.22;
        o.material.metalness = 0.18;
      }
      if (
        /Weapon/.test(o.name) &&
        !["melee", "spear", "staff", "chain"].includes(look.weapon)
      )
        o.visible = false;
    }
  });
  if (look.weapon === "bow") {
    const hand = body.getObjectByName("LowerArm.L");
    if (hand) {
      const b = bow.clone();
      b.scale.setScalar(0.8);
      hand.add(b);
    }
  }
  if (look.shield) {
    const hand = body.getObjectByName("LowerArm.L");
    if (hand) {
      const shield = clone(assets.get("shield").scene);
      shield.scale.setScalar(0.65);
      hand.add(shield);
    }
  }
  // Theme and rank features are attached to the rig before it is scaled, so the
  // measurements below account for the added silhouette.
  const dressOwned = [];
  dressCreature(body, creatureLook(look), dressOwned);
  for (const asset of dressOwned) {
    if (asset.isMaterial) ownedMaterials.add(asset);
    else ownedGeometries.add(asset);
  }
  body.updateMatrixWorld(true);
  const box = new T.Box3().setFromObject(body),
    height = box.max.y - box.min.y;
  const desired =
    look.model === "Bat"
      ? 0.9
      : look.model === "Wolf"
        ? 1.05
        : look.model === "Rat"
          ? 0.65
          : look.model === "Spider"
            ? 0.8
            : look.model === "Ooze"
              ? 0.9
              : look.theme === "goblins" || look.theme === "kobolds"
                ? 1.25
                : 1.8;
  const scale = desired / Math.max(0.1, height);
  body.scale.multiplyScalar(scale);
  body.position.y -= box.min.y * scale;
  if (look.model === "Bat" || look.model === "Ghost") body.position.y += 0.35;
  if (data.type === "creature-dire-wolf") root.scale.multiplyScalar(1.15);
  if (data.type === "creature-cinder-imp") root.scale.multiplyScalar(0.7);
  if (data.boss) root.scale.multiplyScalar(1.12);
  root.userData.dispose = () => {
    ownedMaterials.forEach((m) => m.dispose());
    ownedGeometries.forEach((g) => g.dispose());
  };
  root.userData.animate = body.userData.animate;
  root.userData.equipment = {
    armor: "creature",
    weapon: look.weapon,
    shield: look.shield,
  };
  root.userData.height = desired;
  return { model: root, clips };
}
