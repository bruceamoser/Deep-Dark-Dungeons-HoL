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

for (const payloadKind of ["bottle", "sling"])
  test(`equipped ${payloadKind} payload leaves at release and returns on recovery or another pose`, () => {
    const scene = new T.Group(),
      flask = new T.Mesh(new T.BoxGeometry(), new T.MeshStandardMaterial());
    flask.name =
      payloadKind === "bottle" ? "Firestarter_held_flask" : "Slinger_stone";
    scene.add(flask);
    const source = [
      new T.AnimationClip("Throw", 1.03, []),
      new T.AnimationClip("Idle", 1, []),
    ];
    const a = equippedCreatureAppearance(
      { scene, animations: source },
      {
        scale: 1,
        attack: {
          kind: payloadKind,
          payloadPart: payloadKind === "sling" ? flask.name : undefined,
          clip: "Throw",
          release: 0.46,
        },
      },
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

test("authored thunder and grave spells keep their palette in flight and at impact", async () => {
  const { createAttackEffect } = await import("../src/view/combat-effects.mjs");
  for (const [kind, color] of [
    ["lightning", 0x9b88ff],
    ["shadow", 0x9cae88],
    ["sonic", 0xe2c77e],
  ]) {
    const from = { data: {}, group: new T.Group(), model: new T.Group() },
      to = { data: {}, group: new T.Group(), model: new T.Group() };
    to.group.position.z = 4;
    from.group.add(from.model);
    to.group.add(to.model);
    Object.assign(from.model.userData, {
      authoredEquippedCreature: true,
      attackPresentation: {
        kind,
        when: "projectile",
        clip: "Cast",
        release: 0.3,
      },
    });
    const host = {
      entities: new Map([
        ["from", from],
        ["to", to],
      ]),
      scene: new T.Scene(),
      animate() {},
    };
    const effect = createAttackEffect(host, {
      attacker: "from",
      target: "to",
      spell: true,
    });
    assert.ok(effect.projectile);
    if (kind === "sonic") {
      assert.equal(effect.projectile.name, "Traveling resonance rings");
      assert.equal(effect.projectile.children.length, 3);
      assert.ok(
        effect.projectile.children.every(
          (o) => o.geometry.type === "TorusGeometry",
        ),
      );
    }
    effect.projectile.traverse((o) => {
      if (o.isMesh) assert.equal(o.material.color.getHex(), color);
    });
    const impact = effect.root.getObjectByName(`${kind} impact`);
    assert.ok(impact);
    impact.traverse((o) => {
      if (o.isMesh) assert.equal(o.material.color.getHex(), color);
    });
    effect.dispose();
  }
});

test("authored bow projectile leaves the animated nock at its supplied release time", async () => {
  const { createAttackEffect } = await import("../src/view/combat-effects.mjs");
  const from = { data: {}, group: new T.Group(), model: new T.Group() },
    to = { data: {}, group: new T.Group(), model: new T.Group() };
  from.group.add(from.model);
  to.group.add(to.model);
  to.group.position.z = 4;
  const nock = new T.Object3D();
  nock.name = "BowJoint05";
  nock.position.set(0.2, 1, 0.4);
  from.model.add(nock);
  Object.assign(from.model.userData, {
    authoredEquippedCreature: true,
    attackPresentation: {
      kind: "arrow",
      when: "projectile",
      clip: "Shoot",
      release: 13 / 30,
      nockBone: "BowJoint05",
      launchOffset: 0.54,
      projectileScale: 0.84,
    },
  });
  const arrow = new T.Mesh(new T.ConeGeometry(), new T.MeshStandardMaterial());
  const host = {
    entities: new Map([
      ["from", from],
      ["to", to],
    ]),
    scene: new T.Scene(),
    assets: new Map([["arrow", { scene: arrow }]]),
    animate() {},
  };
  let releases = 0;
  const effect = createAttackEffect(
    host,
    { attacker: "from", target: "to", ranged: true },
    {
      release() {
        releases++;
      },
    },
  );
  effect.update(0.43);
  assert.equal(releases, 0);
  assert.equal(effect.projectile.visible, false);
  effect.update(13 / 30 - 0.43);
  assert.equal(releases, 1);
  assert.equal(effect.projectile.visible, true);
  assert.equal(effect.projectile.children[0].scale.x, 0.84);
  assert.ok(
    effect.projectile.position.distanceTo(new T.Vector3(0.2, 1, 0.94)) < 1e-6,
  );
  effect.dispose();
  arrow.geometry.dispose();
  arrow.material.dispose();
});

test("late bow release keeps the nocked arrow until release and restores it after recovery", () => {
  const scene = new T.Group(),
    arrow = new T.Mesh(new T.BoxGeometry(), new T.MeshStandardMaterial());
  arrow.name = "Archer_arrow";
  scene.add(arrow);
  const a = equippedCreatureAppearance(
    {
      scene,
      animations: [
        new T.AnimationClip("Shoot", 2.87, []),
        new T.AnimationClip("Idle", 1, []),
      ],
    },
    {
      scale: 1,
      attack: {
        kind: "arrow",
        payloadPart: arrow.name,
        clip: "Shoot",
        release: 49 / 30,
        recover: 70 / 30,
      },
    },
  );
  const mixer = new T.AnimationMixer(a.model),
    held = a.model.getObjectByName(arrow.name);
  mixer.clipAction(a.clips[0]).play();
  mixer.setTime(1.5);
  assert.equal(held.visible, true);
  mixer.setTime(1.65);
  assert.equal(held.visible, false);
  mixer.setTime(2.4);
  assert.equal(held.visible, true);
  mixer.setTime(1.7);
  mixer.stopAllAction();
  mixer.clipAction(a.clips[1]).play();
  mixer.update(0.01);
  assert.equal(held.visible, true);
  a.model.userData.dispose();
  arrow.geometry.dispose();
  arrow.material.dispose();
});

test("grave flies follow the authored head and dispose only owned resources", () => {
  const scene = new T.Group();
  const head = new T.Bone();
  head.name = "head";
  head.position.y = 1.1;
  scene.add(head);
  const result = equippedCreatureAppearance(
    { scene, animations: [] },
    { model: "Zombie", scale: 1, height: 1.4, ambient: "grave-flies" },
  );
  const swarm = result.model.getObjectByName("Grave flies");
  assert.equal(swarm.children.length, 9);
  const first = swarm.children[0].position.clone();
  result.model.getObjectByName("head").position.y = 0.3;
  result.model.userData.animate(1);
  assert.ok(Math.abs(swarm.position.y - 0.3) < 1e-6);
  assert.ok(first.distanceTo(swarm.children[0].position) > 0.1);
  assert.equal(scene.children.length, 1);
  let disposed = false;
  swarm.children[0].geometry.addEventListener(
    "dispose",
    () => (disposed = true),
  );
  result.model.userData.dispose();
  assert.equal(disposed, true);
});

test("ash smoke follows its chest after posing and releases only its own resources", () => {
  const scene = new T.Group(),
    chest = new T.Bone();
  chest.name = "spine_03";
  scene.add(chest);
  const sourceMaterial = new T.MeshStandardMaterial({
    emissive: 0xff5500,
    emissiveIntensity: 2,
  });
  const body = new T.Mesh(new T.BoxGeometry(), sourceMaterial);
  scene.add(body);
  const result = equippedCreatureAppearance(
    { scene, animations: [] },
    { model: "AshDemon", scale: 1, height: 1.8, ambient: "ash-smoke" },
  );
  const smoke = result.model.getObjectByName("Ash smoke");
  result.model.getObjectByName("spine_03").position.y = 0.2;
  result.model.userData.animate(2);
  assert.ok(Math.abs(smoke.position.y - 0.2) < 1e-6);
  assert.ok(
    [...smoke.geometry.attributes.position.array].every(Number.isFinite),
  );
  assert.equal(sourceMaterial.emissiveIntensity, 2);
  assert.equal(scene.getObjectByName("Ash smoke"), undefined);
  let disposed = 0;
  smoke.geometry.addEventListener("dispose", () => disposed++);
  smoke.material.addEventListener("dispose", () => disposed++);
  result.model.userData.dispose();
  assert.equal(disposed, 2);
  body.geometry.dispose();
  sourceMaterial.dispose();
});

test("glass constructs retain transmission and coat in independent instances", () => {
  const scene = new T.Group();
  const material = new T.MeshPhysicalMaterial({ transmission: 0.35, roughness: 0.13, clearcoat: 0.4, ior: 1.46 });
  const geometry = new T.BoxGeometry();
  scene.add(new T.Mesh(geometry, material));
  const spec = { model: "GlassFixture", scale: 1, height: 1.5, weapon: "unarmed" };
  const a = equippedCreatureAppearance({ scene, animations: [] }, spec);
  const b = equippedCreatureAppearance({ scene, animations: [] }, spec);
  const am = a.model.children[0].material;
  assert.equal(am.isMeshPhysicalMaterial, true);
  assert.equal(am.transmission, 0.35);
  assert.equal(am.clearcoat, 0.4);
  assert.equal(am.ior, 1.46);
  am.transmission = 0;
  assert.equal(b.model.children[0].material.transmission, 0.35);
  assert.equal(material.transmission, 0.35);
  a.model.userData.dispose(); b.model.userData.dispose();
  geometry.dispose(); material.dispose();
});


test("smoke supports a different rig and source units without moving its anchor", () => {
  const scene = new T.Group(), chest = new T.Bone();
  chest.name = "Chest"; chest.position.y = .25; scene.add(chest);
  const base = { model: "StriderFixture", scale: 3.4, height: 1.9, ambient: "ash-smoke", ambientBone: "Chest" };
  const a = equippedCreatureAppearance({ scene, animations: [] }, { ...base, ambientScale: .3 });
  const b = equippedCreatureAppearance({ scene, animations: [] }, base);
  a.model.userData.animate(1); b.model.userData.animate(1);
  const small = a.model.getObjectByName("Ash smoke"), large = b.model.getObjectByName("Ash smoke");
  assert.ok(Math.abs(small.position.y - .25) < 1e-6);
  small.geometry.attributes.position.array.forEach((v, i) => assert.ok(Math.abs(v - large.geometry.attributes.position.array[i] * .3) < 1e-6));
  a.model.userData.dispose(); b.model.userData.dispose();
});
