import * as T from "three";

// The authored hollow ribbons orbit; no skull or solid torso stands in for air.
export function animateAirVortex(root, body) {
  body.name = "WindBody";
  const strands = [];
  body.traverse((o) => {
    if (/^(VortexWind|OrbitLeaf)_/.test(o.name))
      strands.push({ object: o, rest: o.quaternion.clone() });
  });
  const axis = new T.Vector3(0, 1, 0),
    turn = new T.Quaternion();
  root.userData.animate = (time, moving) =>
    strands.forEach(({ object, rest }, i) => {
      turn.setFromAxisAngle(
        axis,
        time * (moving ? 1.9 : 1.1) * (i % 2 ? 1 : -0.7),
      );
      object.quaternion.copy(turn).multiply(rest);
    });
  const p = body.position.clone(),
    s = body.scale.clone();
  const scales = (values) =>
    values.flatMap(([x, y, z]) => [s.x * x, s.y * y, s.z * z]);
  const pulse = (name) =>
    new T.AnimationClip(name, 0.8, [
      new T.VectorKeyframeTrack(
        "WindBody.scale",
        [0, 0.3, 0.8],
        scales([
          [1, 1, 1],
          [1.35, 0.85, 1.35],
          [1, 1, 1],
        ]),
      ),
    ]);
  return [
    new T.AnimationClip("Idle", 2, [
      new T.VectorKeyframeTrack(
        "WindBody.position",
        [0, 1, 2],
        [p.x, p.y, p.z, p.x, p.y + 0.07, p.z, p.x, p.y, p.z],
      ),
    ]),
    new T.AnimationClip("Walking_A", 0.6, [
      new T.VectorKeyframeTrack(
        "WindBody.position",
        [0, 0.3, 0.6],
        [p.x, p.y, p.z, p.x, p.y + 0.1, p.z, p.x, p.y, p.z],
      ),
    ]),
    ...[
      "Spellcast_Shoot",
      "1H_Melee_Attack_Slice_Diagonal",
      "Unarmed_Melee_Attack_Punch_A",
    ].map(pulse),
    new T.AnimationClip("Hit_A", 0.3, [
      new T.VectorKeyframeTrack(
        "WindBody.scale",
        [0, 0.12, 0.3],
        scales([
          [1, 1, 1],
          [0.8, 1.2, 0.8],
          [1, 1, 1],
        ]),
      ),
    ]),
    new T.AnimationClip("Death_A_Pose", 1, [
      new T.VectorKeyframeTrack(
        "WindBody.scale",
        [0, 0.6, 1],
        scales([
          [1, 1, 1],
          [1.4, 0.6, 1.4],
          [0.01, 0.01, 0.01],
        ]),
      ),
    ]),
  ];
}
