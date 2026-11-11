import * as T from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";

// No humanoid rig: independent sculpted wind bands carry the five motion states.
export function airElementalAppearance(asset) {
  const model = new T.Group();
  const body = clone(asset.scene);
  body.name = "AirForm";
  model.add(body);
  const owned = new Map();
  body.traverse((o) => {
    if (!o.isMesh) return;
    if (!owned.has(o.material)) owned.set(o.material, o.material.clone());
    o.material = owned.get(o.material);
    o.material.depthWrite = !o.material.transparent;
    o.castShadow = !o.material.transparent;
    o.receiveShadow = true;
    o.frustumCulled = false;
  });
  const bands = ["WindLower", "WindMiddle", "WindCrown"];
  for (const name of bands)
    if (!body.getObjectByName(name))
      throw Error(`Air Elemental missing ${name}`);
  const rotation = (name, duration, turns, tilt = 0) => {
    const times = [],
      values = [];
    for (let i = 0; i <= 32; i++) {
      times.push((duration * i) / 32);
      const spin = new T.Quaternion().setFromAxisAngle(
        new T.Vector3(0, 1, 0),
        (turns * Math.PI * 2 * i) / 32,
      );
      const lean = new T.Quaternion().setFromAxisAngle(
        new T.Vector3(1, 0, 0),
        tilt,
      );
      values.push(...spin.premultiply(lean).toArray());
    }
    return new T.QuaternionKeyframeTrack(`${name}.quaternion`, times, values);
  };
  const track = (name, property, times, values) =>
    new T.VectorKeyframeTrack(`${name}.${property}`, times, values.flat());
  const make = (name, duration, mode) => {
    const tracks = bands.map((band, i) =>
      rotation(
        band,
        duration,
        (i === 1 ? -1 : 1) *
          (mode === "walk" ? 2 : mode === "attack" ? 1.6 : 1),
        mode === "walk" ? 0.1 : 0,
      ),
    );
    const times = [0, duration * 0.3, duration * 0.55, duration];
    let scale = [
      [1, 1, 1],
      [1.025, 1.02, 1.025],
      [0.98, 1.01, 0.98],
      [1, 1, 1],
    ];
    let pos = [
      [0, 0, 0],
      [0, 0.06, 0],
      [0, 0.03, 0],
      [0, 0, 0],
    ];
    if (mode === "attack") {
      scale = [
        [1, 1, 1],
        [0.8, 1.13, 0.8],
        [1.4, 0.82, 1.4],
        [1, 1, 1],
      ];
      pos = [
        [0, 0, 0],
        [0, 0.05, -0.15],
        [0, 0.02, 0.45],
        [0, 0, 0],
      ];
    }
    if (mode === "hit")
      scale = [
        [1, 1, 1],
        [1.22, 0.75, 1.05],
        [0.88, 1.12, 0.9],
        [1, 1, 1],
      ];
    if (mode === "death") {
      scale = [
        [1, 1, 1],
        [1.12, 0.85, 1.12],
        [1.5, 0.55, 1.5],
        [0.001, 0.001, 0.001],
      ];
      bands.forEach((band, i) =>
        tracks.push(
          track(
            band,
            "position",
            [0, duration * 0.55, duration],
            [
              [0, 0, 0],
              [(i - 1) * 0.2, i * 0.12, 0],
              [(i - 1) * 0.5, 0.3, 0],
            ],
          ),
        ),
      );
    } else {
      bands.forEach((band) =>
        tracks.push(
          track(
            band,
            "position",
            [0, duration],
            [
              [0, 0, 0],
              [0, 0, 0],
            ],
          ),
        ),
      );
    }
    tracks.push(
      track("AirForm", "scale", times, scale),
      track("AirForm", "position", times, pos),
    );
    return new T.AnimationClip(name, duration, tracks);
  };
  const clips = [
    make("Idle", 4, "idle"),
    make("Walking_A", 1.7, "walk"),
    make("Spellcast_Shoot", 1, "attack"),
    make("Hit_A", 0.45, "hit"),
    make("Death_A_Pose", 1.15, "death"),
  ];
  for (const name of [
    "1H_Melee_Attack_Slice_Diagonal",
    "Unarmed_Melee_Attack_Punch_A",
  ]) {
    const c = clips[2].clone();
    c.name = name;
    clips.push(c);
  }
  Object.assign(model.userData, {
    avatar: "AirElementalSculpted",
    airElemental: true,
    height: 2.2,
    playFullDeath: true,
    equipment: { weapon: "spell" },
    dispose: () => owned.forEach((m) => m.dispose()),
  });
  return { model, clips };
}
