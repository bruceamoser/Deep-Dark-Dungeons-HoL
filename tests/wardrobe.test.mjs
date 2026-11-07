import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  CULTURE_WEAR,
  BACKGROUND_KIT,
  CLASS_SILHOUETTE,
  wearFor,
  wardrobeGaps,
} from "../src/core/wardrobe.mjs";
import { dressOutfit, dressEquipped } from "../src/view/outfit.mjs";
import { ANCESTRY_LOOKS, ANCESTRY_SIGNATURE, signatureFor } from "../src/core/identity.mjs";
import { THEME_LOOK, creatureLook, rankFor } from "../src/core/creature-variation.mjs";
import { dressCreature } from "../src/view/creature-dress.mjs";
import { CREATURE_ROSTER } from "../src/core/creature-roster.mjs";

// Joint names the packed hero rig exposes; the outfit code keys off these.
const HERO_JOINTS = [
  "root", "hips", "spine", "chest", "upperarm.l", "lowerarm.l", "hand.l",
  "upperarm.r", "lowerarm.r", "hand.r", "head", "upperleg.l", "lowerleg.l",
  "foot.l", "upperleg.r", "lowerleg.r", "foot.r",
];

function heroRig() {
  const model = new T.Group();
  const bones = {};
  for (const name of HERO_JOINTS) {
    const bone = new T.Bone();
    bone.name = name;
    bones[name] = bone;
    (name === "root" ? model : bones.root).add(bone);
  }
  return model;
}

function countMeshes(root) {
  let meshes = 0;
  let triangles = 0;
  root.traverse((o) => {
    if (!o.isMesh) return;
    meshes += 1;
    const g = o.geometry;
    triangles += (g.index ? g.index.count : g.getAttribute("position").count) / 3;
  });
  return { meshes, triangles };
}

// Choice ids exactly as the pinned HoL catalog spells them.
const CULTURES = Object.keys(CULTURE_WEAR);
const BACKGROUNDS = Object.keys(BACKGROUND_KIT);
const CLASSES = Object.keys(CLASS_SILHOUETTE);

test("every culture, background and class has a hand-authored entry", () => {
  assert.equal(CULTURES.length, 18, "eighteen cultures in the catalog");
  assert.equal(BACKGROUNDS.length, 32, "thirty-two backgrounds in the catalog");
  assert.equal(CLASSES.length, 10, "ten classes in the catalog");
  for (const id of [...CULTURES, ...BACKGROUNDS, ...CLASSES])
    assert.match(id, /^(origin-culture|origin-background|class)-/, `odd id ${id}`);
});

test("wardrobeGaps reports nothing missing for the full catalog", () => {
  const gaps = wardrobeGaps({ cultures: CULTURES, backgrounds: BACKGROUNDS, classes: CLASSES });
  assert.deepEqual(gaps, { cultures: [], backgrounds: [], classes: [] });
});

test("wardrobeGaps does report an unknown choice", () => {
  const gaps = wardrobeGaps({ cultures: ["origin-culture-invented"] });
  assert.deepEqual(gaps.cultures, ["origin-culture-invented"]);
});

test("every culture and class pair resolves to real, distinct palette colours", () => {
  const hex = /^#[0-9a-f]{6}$/i;
  const seen = new Set();
  for (const culture of CULTURES) {
    const spec = wearFor({ culture: { id: culture } });
    assert.equal(spec.known.culture, true, culture);
    for (const [key, value] of Object.entries(spec.wear.palette))
      assert.match(value, hex, `${culture}.${key}`);
    seen.add(spec.wear.palette.cloth);
  }
  // Cultures must not all share one garment colour or the choice is invisible.
  assert.ok(seen.size >= 12, `expected varied cloth colours, got ${seen.size}`);
});

test("an unknown choice falls back instead of throwing", () => {
  const spec = wearFor({ culture: { id: "nope" }, background: { id: "nope" }, classId: "nope" });
  assert.equal(spec.known.culture, false);
  assert.equal(spec.wear.label, "Wayfarer");
  assert.equal(spec.silhouette.label, "Adventurer");
});

test("culture decides cloth, background decides accessories, class decides silhouette", () => {
  const oasis = wearFor({
    culture: { id: "origin-culture-oasis-cities" },
    background: { id: "origin-background-poacher" },
    classId: "class-shadow",
  });
  const learning = wearFor({
    culture: { id: "origin-culture-learning-houses" },
    background: { id: "origin-background-poacher" },
    classId: "class-shadow",
  });
  // Same background and class: only the clothing differs.
  assert.notEqual(oasis.wear.palette.cloth, learning.wear.palette.cloth);
  assert.deepEqual(oasis.kit, learning.kit);
  assert.deepEqual(oasis.silhouette, learning.silhouette);

  const guard = wearFor({
    culture: { id: "origin-culture-oasis-cities" },
    background: { id: "origin-background-household-guard" },
    classId: "class-shadow",
  });
  assert.deepEqual(guard.wear, oasis.wear);
  assert.notDeepEqual(guard.kit, oasis.kit);
});

test("the Shadow class raises a hood and masks the face", () => {
  const shadow = wearFor({ classId: "class-shadow" });
  assert.equal(shadow.silhouette.hood, "raised");
  assert.equal(shadow.silhouette.mask, true);
  const protector = wearFor({ classId: "class-protector" });
  assert.equal(protector.silhouette.hood, "none");
  assert.equal(protector.silhouette.gauntlets, true);
});

test("a dressed hero gains geometry for every culture", () => {
  for (const culture of CULTURES) {
    const model = heroRig();
    const owned = [];
    dressOutfit(model, { draft: { culture: { id: culture } } }, owned, { seed: 1 });
    const { meshes, triangles } = countMeshes(model);
    assert.ok(meshes >= 8, `${culture} produced only ${meshes} meshes`);
    assert.ok(triangles < 2600, `${culture} costs ${triangles} triangles`);
    for (const asset of owned)
      assert.equal(typeof asset.dispose, "function", `${culture} leaked a undisposable asset`);
  }
});

test("background accessories change the geometry a hero carries", () => {
  const withSatchel = heroRig();
  dressOutfit(withSatchel, { draft: { background: { id: "origin-background-itinerant-tinker" } } }, [], {});
  const bare = heroRig();
  dressOutfit(bare, { draft: { background: { id: "origin-background-dragon-dreamer" } } }, [], {});
  const namesOf = (root) => {
    const names = [];
    root.traverse((o) => { if (o.isMesh) names.push(o.name); });
    return names;
  };
  assert.ok(namesOf(withSatchel).includes("Satchel"), "tinker carries a satchel");
  assert.ok(!namesOf(bare).includes("Satchel"), "dreamer does not");
});

test("occupied slots suppress the clothing they would cover", () => {
  const full = heroRig();
  dressOutfit(full, { draft: { culture: { id: "origin-culture-oasis-cities" }, classId: "class-warden" } }, [], {});
  const suppressed = heroRig();
  dressOutfit(
    suppressed,
    { draft: { culture: { id: "origin-culture-oasis-cities" }, classId: "class-warden" } },
    [],
    { occupied: { torso: true, belt: true, head: true, feet: true } },
  );
  assert.ok(countMeshes(suppressed).meshes < countMeshes(full).meshes);
});

test("a model without the expected joints still resolves its wardrobe", () => {
  const bare = new T.Group();
  const spec = dressOutfit(bare, { draft: { culture: { id: "origin-culture-deep-halls" } } }, [], {});
  assert.equal(spec.wear.label, "Deep Halls");
  assert.equal(countMeshes(bare).meshes, 0);
});

test("equipped head, waist and feet gear is drawn as real silhouettes", () => {
  const model = heroRig();
  const owned = [];
  dressEquipped(model, {}, owned, [
    { worn: true, slot: "head", catalogId: "item-ordinary-heavy-armor", effects: [] },
    { worn: true, slot: "waist", catalogId: "item-x", effects: [] },
    { worn: true, slot: "feet", catalogId: "item-y", effects: [] },
  ]);
  const names = [];
  model.traverse((o) => { if (o.isMesh) names.push(o.name); });
  assert.ok(names.includes("Equipped head"));
  assert.ok(names.includes("Equipped waist"));
  assert.equal(names.filter((n) => n === "Equipped feet").length, 2);
  assert.ok(names.includes("Belt buckle"));
});

test("no worn gear means no equipped geometry", () => {
  const model = heroRig();
  dressEquipped(model, {}, [], []);
  assert.equal(countMeshes(model).meshes, 0);
});

test("every ancestry has signature traits distinct from the human baseline", () => {
  const ancestries = Object.keys(ANCESTRY_LOOKS);
  assert.equal(Object.keys(ANCESTRY_SIGNATURE).length, ancestries.length);
  for (const id of ancestries) assert.ok(signatureFor(id), id);
  const distinctive = ancestries.filter((id) => {
    if (id === "ancestry-human") return true; // the baseline is the reference
    const sig = signatureFor(id);
    return (
      sig.brow !== "plain" || sig.cheek !== "plain" || sig.mouth !== "plain" ||
      sig.braidRings || sig.stonePlating || sig.earCuff || sig.circlet ||
      sig.bigEyes || sig.longFingers || sig.hunch || sig.longNeck ||
      (sig.handScale && sig.handScale !== 1)
    );
  });
  assert.equal(distinctive.length, ancestries.length, "every ancestry differs from human");
  assert.equal(signatureFor("nonesuch").brow, "plain");
});

test("every enemy in the roster receives theme geometry", () => {
  const joints = ["Root", "Hips", "Torso", "Neck", "Head", "UpperArm.L", "UpperArm.R"];
  const types = Object.keys(CREATURE_ROSTER);
  assert.ok(types.length >= 50, `roster has ${types.length} rows`);
  const themes = new Set();
  for (const type of types) {
    const look = CREATURE_ROSTER[type];
    const model = new T.Group();
    for (const name of joints) {
      const bone = new T.Bone();
      bone.name = name;
      model.add(bone);
    }
    const owned = [];
    const spec = creatureLook(look);
    themes.add(spec.theme);
    dressCreature(model, spec, owned);
    const { meshes } = countMeshes(model);
    assert.ok(meshes > 0, `${type} (${look.theme}) produced no geometry`);
    for (const asset of owned)
      assert.equal(typeof asset.dispose, "function", `${type} leaked an asset`);
  }
  assert.ok(themes.size >= 12, `expected at least 12 themes, saw ${themes.size}`);
});

test("deeper enemies carry more kit than shallow ones", () => {
  assert.ok(rankFor(6).scale > rankFor(1).scale);
  assert.equal(rankFor(1).crown, false);
  assert.equal(rankFor(6).crown, true);
  assert.equal(rankFor(3).spikes, true);
  assert.equal(rankFor(1).spikes, false);

  const build = (depth) => {
    const model = new T.Group();
    for (const name of ["Head", "Torso", "Hips", "UpperArm.L", "UpperArm.R"]) {
      const bone = new T.Bone();
      bone.name = name;
      model.add(bone);
    }
    dressCreature(model, creatureLook({ theme: "infernal", depth }), []);
    return countMeshes(model).meshes;
  };
  assert.ok(build(6) > build(1), "a rank-6 enemy is dressed more heavily than a rank-1");
});

test("theme colours are valid and infernal differs from rime", () => {
  const hex = /^#[0-9a-f]{6}$/i;
  for (const [id, theme] of Object.entries(THEME_LOOK))
    for (const key of ["cloth", "metal"])
      assert.match(theme[key], hex, `${id}.${key}`);
  const infernal = creatureLook({ theme: "infernal" });
  const rime = creatureLook({ theme: "rime" });
  assert.notEqual(infernal.colors.glow, rime.colors.glow);
  assert.notDeepEqual(infernal.features, rime.features);
});
