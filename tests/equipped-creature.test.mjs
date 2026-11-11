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

import { attackPresentation } from "../src/view/combat-effects.mjs";
test("authored melee contact follows the reviewed thrust while ranged actions retain their projectile", () => {
  const from = {
    data: {},
    isEnemy: true,
    model: {
      userData: {
        authoredEquippedCreature: true,
        attackPresentation: {
          kind: "thrust",
          clip: "1H_Melee_Attack_Slice_Diagonal",
          contact: 8 / 30,
        },
      },
    },
  };
  assert.equal(attackPresentation(from, {}).contact, 8 / 30);
  assert.equal(attackPresentation(from, {}).kind, "thrust");
  assert.equal(attackPresentation(from, { ranged: true }).kind, "arrow");
});

test("bottle throw uses its authored projectile clip; basic melee remains a punch", () => {
  const spec = {
    kind: "bottle",
    when: "projectile",
    clip: "Throw",
    release: 0.46,
    melee: { kind: "unarmed", clip: "Punch", contact: 0.2 },
  };
  const from = {
    data: {},
    model: {
      userData: { authoredEquippedCreature: true, attackPresentation: spec },
    },
  };
  assert.equal(attackPresentation(from, { spell: true }).kind, "bottle");
  assert.equal(attackPresentation(from, { ranged: true }).release, 0.46);
  assert.equal(attackPresentation(from, {}).clip, "Punch");
});

test("equipped flask leaves the hand at release and returns on recovery or another pose", () => {
  const scene = new T.Group(),
    flask = new T.Mesh(new T.BoxGeometry(), new T.MeshStandardMaterial());
  flask.name = "Firestarter_held_flask";
  scene.add(flask);
  const source = [
    new T.AnimationClip("Throw", 1.03, []),
    new T.AnimationClip("Idle", 1, []),
  ];
  const a = equippedCreatureAppearance(
    { scene, animations: source },
    { scale: 1, attack: { kind: "bottle", clip: "Throw", release: 0.46 } },
  );
  const mixer = new T.AnimationMixer(a.model),
    held = a.model.getObjectByName(flask.name);
  mixer.clipAction(a.clips[0]).play();
  mixer.update(0.45);
  assert.equal(held.visible, true);
  mixer.update(0.02);
  assert.equal(held.visible, false);
  mixer.update(0.44);
  assert.equal(held.visible, true);
  mixer.stopAllAction();
  mixer.clipAction(a.clips[0]).reset().play();
  mixer.update(0.5);
  assert.equal(held.visible, false);
  mixer.stopAllAction();
  mixer.clipAction(a.clips[1]).play();
  mixer.update(0.01);
  assert.equal(held.visible, true);
  assert.equal(source[0].tracks.length, 0);
  a.model.userData.dispose();
  flask.geometry.dispose();
  flask.material.dispose();
});
