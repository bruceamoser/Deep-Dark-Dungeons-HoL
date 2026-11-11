import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { equippedCreatureAppearance } from "../src/view/equipped-creature.mjs";
test("equipped creatures preserve authored materials and clips while isolating disposable state", () => {
  const scene = new T.Group(),
    material = new T.MeshStandardMaterial({ roughness: 0.3 });
  const mesh = new T.Mesh(new T.BoxGeometry(), material);
  scene.add(mesh);
  const clips = [new T.AnimationClip("Idle", 1, [])];
  const spec = { model: "Fixture", scale: 0.9, height: 1.2, weapon: "melee" };
  const a = equippedCreatureAppearance({ scene, animations: clips }, spec),
    b = equippedCreatureAppearance({ scene, animations: clips }, spec);
  assert.equal(a.clips, clips);
  assert.equal(a.model.children.length, 1);
  assert.equal(a.model.userData.playFullDeath, true);
  assert.equal(a.model.scale.x, 0.9);
  const am = a.model.children[0].material,
    bm = b.model.children[0].material;
  assert.notEqual(am, material);
  assert.notEqual(am, bm);
  assert.equal(am.roughness, 0.3);
  let sourceDisposed = false;
  material.addEventListener("dispose", () => (sourceDisposed = true));
  a.model.userData.dispose();
  assert.equal(sourceDisposed, false);
  assert.equal(bm.roughness, 0.3);
  mesh.geometry.dispose();
  material.dispose();
  b.model.userData.dispose();
});
