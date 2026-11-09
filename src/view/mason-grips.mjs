import * as T from "three";
const cache = new WeakMap();
const oldAim = new T.Vector3(0.2, 0.35, 1).normalize(),
  swordAim = new T.Vector3(-0.7, 0.45, 1).normalize(),
  up = new T.Vector3(0, 1, 0);
function poses(asset, model, profile) {
  let entry = cache.get(asset);
  if (!entry) {
    entry = { rest: {}, poses: new Map() };
    cache.set(asset, entry);
  }
  model.updateMatrixWorld(true);
  for (const name of ["weapon_r", "weapon_l"])
    if (!entry.rest[name]) {
      const bone = model.getObjectByName(name);
      if (bone)
        entry.rest[name] = {
          position: bone.getWorldPosition(new T.Vector3()),
          quaternion: bone.getWorldQuaternion(new T.Quaternion()),
        };
    }
  if (entry.poses.has(profile)) return entry;
  const clip = asset.animations.find((c) => c.name === profile);
  if (!clip) return entry;
  const bones = [];
  model.traverse((o) => {
    if (o.isBone)
      bones.push([
        o,
        o.position.clone(),
        o.quaternion.clone(),
        o.scale.clone(),
      ]);
  });
  const mixer = new T.AnimationMixer(model);
  mixer.clipAction(clip).play();
  mixer.update(0);
  model.updateMatrixWorld(true);
  const delta = {};
  for (const name of ["weapon_r", "weapon_l"]) {
    const bone = model.getObjectByName(name),
      rest = entry.rest[name];
    if (bone && rest)
      delta[name] = bone
        .getWorldQuaternion(new T.Quaternion())
        .multiply(rest.quaternion.clone().invert())
        .normalize();
  }
  entry.poses.set(profile, delta);
  mixer.stopAllAction();
  mixer.uncacheRoot(model);
  for (const [bone, p, q, s] of bones) {
    bone.position.copy(p);
    bone.quaternion.copy(q);
    bone.scale.copy(s);
  }
  model.updateMatrixWorld(true);
  return entry;
}
function transformPart(model, name, rotation, pivot, owned) {
  const part = model.getObjectByName(name);
  if (!part) return;
  const matrix = new T.Matrix4()
    .makeTranslation(...pivot.toArray())
    .multiply(new T.Matrix4().makeRotationFromQuaternion(rotation))
    .multiply(
      new T.Matrix4().makeTranslation(...pivot.clone().negate().toArray()),
    );
  part.traverse((o) => {
    if (o.isMesh) {
      o.geometry = o.geometry.clone();
      o.geometry.applyMatrix4(matrix);
      o.boundingBox = o.boundingSphere = null;
      owned.push(o.geometry);
    }
  });
}
function shaftAxis(model, name) {
  const points = [];
  model.getObjectByName(name)?.traverse((o) => {
    if (o.isMesh) {
      const p = o.geometry.attributes.position;
      for (let i = 0; i < p.count; i++)
        points.push(new T.Vector3().fromBufferAttribute(p, i));
    }
  });
  const center = points
      .reduce((sum, p) => sum.add(p), new T.Vector3())
      .multiplyScalar(1 / Math.max(1, points.length)),
    cov = Array(9).fill(0);
  for (const p of points) {
    const a = p.clone().sub(center).toArray();
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) cov[i * 3 + j] += a[i] * a[j];
  }
  let axis = new T.Vector3(1, 0.7, 0.3).normalize();
  for (let i = 0; i < 32; i++) {
    const a = axis.toArray();
    axis
      .set(
        cov[0] * a[0] + cov[1] * a[1] + cov[2] * a[2],
        cov[3] * a[0] + cov[4] * a[1] + cov[5] * a[2],
        cov[6] * a[0] + cov[7] * a[1] + cov[8] * a[2],
      )
      .normalize();
  }
  return axis;
}
export function fitMasonGrips(
  asset,
  model,
  { weapon, shield, profile, owned },
) {
  const sword = /^(OHS\d+_Sword|THS\d+_Sword)$/.test(weapon ?? ""),
    hammer = /Hammer$/.test(weapon ?? "");
  if (!sword && !hammer && !shield) return;
  const ready = profile + "Idle",
    source = weapon?.startsWith("TH") ? "TwoHandIdle" : "Idle";
  const entry = poses(asset, model, source);
  poses(asset, model, ready);
  if (
    (sword || hammer) &&
    entry.rest.weapon_r &&
    entry.poses.get(source)?.weapon_r
  ) {
    const legacyTarget = oldAim
      .clone()
      .applyQuaternion(entry.poses.get(source).weapon_r.clone().invert());
    let correction;
    if (hammer)
      correction = new T.Quaternion().setFromAxisAngle(
        shaftAxis(model, weapon),
        Math.PI,
      );
    else {
      const actual = entry.poses.get(ready)?.weapon_r;
      if (actual) {
        const target = swordAim
          .clone()
          .applyQuaternion(actual.clone().invert());
        const legacy = new T.Quaternion()
          .setFromAxisAngle(legacyTarget, Math.PI / 2)
          .multiply(new T.Quaternion().setFromUnitVectors(up, legacyTarget));
        const desired = new T.Quaternion()
          .setFromAxisAngle(target, (3 * Math.PI) / 2)
          .multiply(new T.Quaternion().setFromUnitVectors(up, target));
        correction = desired.multiply(legacy.invert()).normalize();
      }
    }
    if (correction)
      transformPart(
        model,
        weapon,
        correction,
        entry.rest.weapon_r.position,
        owned,
      );
  }
  if (shield && entry.rest.weapon_l && entry.poses.get(ready)?.weapon_l) {
    // Staged shield fronts face +X in bind space, with their tops along +Y.
    const normal = new T.Vector3(0.15, 0, 1).normalize(),
      right = up.clone().cross(normal).normalize();
    const desired = new T.Quaternion().setFromRotationMatrix(
      new T.Matrix4().makeBasis(right, normal.clone().cross(right), normal),
    );
    const original = new T.Quaternion().setFromRotationMatrix(
      new T.Matrix4().makeBasis(
        new T.Vector3(0, 0, -1),
        up,
        new T.Vector3(1, 0, 0),
      ),
    );
    const correction = entry.poses
      .get(ready)
      .weapon_l.clone()
      .invert()
      .multiply(desired)
      .multiply(original.invert())
      .normalize();
    transformPart(
      model,
      shield,
      correction,
      entry.rest.weapon_l.position,
      owned,
    );
  }
  model.userData.gripPose = ready;
}
