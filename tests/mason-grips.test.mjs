import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { fitMasonGrips } from "../src/view/mason-grips.mjs";
function asset() {
  const scene = new T.Group(),
    right = new T.Bone(),
    left = new T.Bone();
  right.name = "weapon_r";
  left.name = "weapon_l";
  right.position.set(-0.4, 0.7, 0);
  left.position.set(0.4, 0.7, 0);
  scene.add(right, left);
  scene.updateMatrixWorld(true);
  const geometry = new T.BoxGeometry(0.04, 0.7, 0.5);
  geometry.translate(0.4, 0.7, 0);
  const count = geometry.attributes.position.count;
  geometry.setAttribute(
    "skinIndex",
    new T.Uint16BufferAttribute(Array(count).fill([0, 0, 0, 0]).flat(), 4),
  );
  geometry.setAttribute(
    "skinWeight",
    new T.Float32BufferAttribute(Array(count).fill([1, 0, 0, 0]).flat(), 4),
  );
  const shield = new T.SkinnedMesh(geometry, new T.MeshStandardMaterial());
  shield.name = "Shield04";
  scene.add(shield);
  shield.bind(new T.Skeleton([left]));
  const pose = (name, q) =>
    new T.AnimationClip(name, 1, [
      new T.QuaternionKeyframeTrack(
        "weapon_l.quaternion",
        [0, 1],
        [...q.toArray(), ...q.toArray()],
      ),
    ]);
  return {
    scene,
    animations: [
      pose(
        "Idle",
        new T.Quaternion().setFromAxisAngle(
          new T.Vector3(0, 0, 1),
          -Math.PI / 2,
        ),
      ),
      pose(
        "UnarmedIdle",
        new T.Quaternion().setFromAxisAngle(
          new T.Vector3(1, 0, 0),
          Math.PI / 3,
        ),
      ),
    ],
  };
}
test("shield fronts and tops face forward/up in distinct one-handed and unarmed ready poses without altering the template", () => {
  const source = asset(),
    original = Array.from(
      source.scene.getObjectByName("Shield04").geometry.attributes.position
        .array,
    );
  for (const profile of ["", "Unarmed"]) {
    const model = clone(source.scene),
      owned = [];
    fitMasonGrips(source, model, { shield: "Shield04", profile, owned });
    const mixer = new T.AnimationMixer(model);
    mixer
      .clipAction(source.animations.find((a) => a.name === profile + "Idle"))
      .play();
    mixer.update(0);
    model.updateMatrixWorld(true);
    const shield = model.getObjectByName("Shield04");
    shield.skeleton.update();
    const p = (i) =>
      shield.localToWorld(shield.getVertexPosition(i, new T.Vector3()));
    const a = p(shield.geometry.index.getX(0)),
      b = p(shield.geometry.index.getX(1)),
      c = p(shield.geometry.index.getX(2));
    const normal = b.sub(a).cross(c.sub(a)).normalize();
    assert.ok(
      normal.dot(new T.Vector3(0.15, 0, 1).normalize()) > 0.999,
      "plate faces the front, rather than the floor",
    );
    const top = new T.Vector3(),
      bottom = new T.Vector3();
    let nt = 0,
      nb = 0;
    for (let i = 0; i < 4; i++) {
      if (original[i * 3 + 1] > 0.7) {
        top.add(p(i));
        nt++;
      } else {
        bottom.add(p(i));
        nb++;
      }
    }
    assert.ok(
      top
        .divideScalar(nt)
        .sub(bottom.divideScalar(nb))
        .normalize()
        .dot(new T.Vector3(0, 1, 0)) > 0.999,
    );
    assert.deepEqual(
      Array.from(
        source.scene.getObjectByName("Shield04").geometry.attributes.position
          .array,
      ),
      original,
    );
    assert.equal(owned.length, 1);
    owned.forEach((g) => g.dispose());
    mixer.stopAllAction();
    mixer.uncacheRoot(model);
  }
});

test("sword tips keep the requested upper-left/upward aim in a different ready pose while the grip stays in the hand", () => {
  const source = asset(),
    bone = source.scene.getObjectByName("weapon_r"),
    pivot = bone.position.clone(),
    oldAim = new T.Vector3(0.2, 0.35, 1).normalize();
  const legacy = new T.Quaternion()
    .setFromAxisAngle(oldAim, Math.PI / 2)
    .multiply(
      new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), oldAim),
    );
  const geometry = new T.BoxGeometry(0.08, 1, 0.03);
  geometry.translate(0, 0.5, 0);
  geometry.applyQuaternion(legacy);
  geometry.translate(...pivot.toArray());
  const count = geometry.attributes.position.count;
  geometry.setAttribute(
    "skinIndex",
    new T.Uint16BufferAttribute(Array(count).fill([0, 0, 0, 0]).flat(), 4),
  );
  geometry.setAttribute(
    "skinWeight",
    new T.Float32BufferAttribute(Array(count).fill([1, 0, 0, 0]).flat(), 4),
  );
  const sword = new T.SkinnedMesh(geometry, new T.MeshStandardMaterial());
  sword.name = "OHS03_Sword";
  source.scene.add(sword);
  sword.bind(new T.Skeleton([bone]));
  const q = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), 0.4);
  source.animations.push(
    new T.AnimationClip("SingleIdle", 1, [
      new T.QuaternionKeyframeTrack(
        "weapon_r.quaternion",
        [0, 1],
        [...q.toArray(), ...q.toArray()],
      ),
    ]),
  );
  const ends = { tip: [], grip: [] };
  for (let i = 0; i < count; i++) {
    const v = new T.Vector3()
      .fromBufferAttribute(geometry.attributes.position, i)
      .sub(pivot);
    const t = v.dot(oldAim);
    if (t > 0.99) ends.tip.push(i);
    if (t < 0.01) ends.grip.push(i);
  }
  const model = clone(source.scene),
    owned = [];
  fitMasonGrips(source, model, {
    weapon: "OHS03_Sword",
    profile: "Single",
    owned,
  });
  const mixer = new T.AnimationMixer(model);
  mixer.clipAction(source.animations.at(-1)).play();
  mixer.update(0);
  model.updateMatrixWorld(true);
  const mesh = model.getObjectByName("OHS03_Sword");
  mesh.skeleton.update();
  const average = (list) =>
    list
      .reduce(
        (sum, i) =>
          sum.add(
            mesh.localToWorld(mesh.getVertexPosition(i, new T.Vector3())),
          ),
        new T.Vector3(),
      )
      .divideScalar(list.length);
  const grip = average(ends.grip),
    direction = average(ends.tip).sub(grip).normalize();
  assert.ok(direction.dot(new T.Vector3(-0.7, 0.45, 1).normalize()) > 0.999);
  assert.ok(direction.x < 0 && direction.y > 0);
  assert.ok(grip.distanceTo(pivot) < 0.00001);
  owned.forEach((g) => g.dispose());
  mixer.stopAllAction();
  mixer.uncacheRoot(model);
});
