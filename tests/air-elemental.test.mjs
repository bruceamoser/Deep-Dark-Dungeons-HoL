import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { airElementalAppearance } from "../src/view/air-elemental.mjs";

function fixture() {
  const scene = new T.Group();
  for (const name of ["WindLower", "WindMiddle", "WindCrown"]) {
    const g = new T.Group();
    g.name = name;
    g.add(
      new T.Mesh(
        new T.BoxGeometry(0.1, 0.1, 0.1),
        new T.MeshStandardMaterial({ roughness: 0.3 }),
      ),
    );
    scene.add(g);
  }
  return { scene };
}
test("air idle and travel return every animated transform to its starting pose", () => {
  const a = airElementalAppearance(fixture());
  for (const name of ["Idle", "Walking_A"]) {
    const mixer = new T.AnimationMixer(a.model),
      clip = a.clips.find((c) => c.name === name);
    const action = mixer.clipAction(clip);
    action.setLoop(T.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    const snapshot = () =>
      ["AirForm", "WindLower", "WindMiddle", "WindCrown"].map((n) => {
        const o = a.model.getObjectByName(n);
        return {
          p: o.position.clone(),
          q: o.quaternion.clone(),
          s: o.scale.clone(),
        };
      });
    mixer.setTime(0);
    const before = snapshot();
    mixer.setTime(clip.duration);
    const after = snapshot();
    for (let i = 0; i < before.length; i++) {
      assert.ok(
        before[i].p.distanceTo(after[i].p) < 1e-6,
        `${name} position jump`,
      );
      assert.ok(
        before[i].s.distanceTo(after[i].s) < 1e-6,
        `${name} scale jump`,
      );
      assert.ok(
        Math.abs(before[i].q.dot(after[i].q)) > 1 - 1e-6,
        `${name} rotation jump`,
      );
    }
  }
});
test("air clones isolate animated transforms and materials from cached source and other actors", () => {
  const source = fixture(),
    a = airElementalAppearance(source),
    b = airElementalAppearance(source);
  const mesh = (root) => root.getObjectByName("WindLower").children[0];
  mesh(a.model).material.opacity = 0.2;
  a.model.getObjectByName("WindLower").position.x = 10;
  assert.equal(mesh(b.model).material.opacity, 1);
  assert.equal(mesh(source.scene).material.opacity, 1);
  assert.equal(b.model.getObjectByName("WindLower").position.x, 0);
  assert.equal(source.scene.getObjectByName("WindLower").position.x, 0);
  assert.equal(mesh(a.model).geometry, mesh(source.scene).geometry);
});
