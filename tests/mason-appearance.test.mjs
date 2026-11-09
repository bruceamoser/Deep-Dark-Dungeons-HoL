import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { normalizeAppearance } from "../src/core/identity.mjs";
import {
  normalizeMason,
  MASON_OPTIONS,
  masonWeaponVisual,
} from "../src/core/mason-appearance.mjs";
import { magicItem } from "../src/core/treasure.mjs";
import { masonAppearance } from "../src/view/mason-heroes.mjs";
test("appearance migrates legacy saves and rejects invalid part identifiers and colours", () => {
  const a = normalizeAppearance({
    version: 2,
    skin: "#12Ab34",
    mason: { head: "../../asset", eyes: "Eye12" },
    outfitColors: ["#abcdef", "bad"],
  });
  assert.equal(a.skin, "#12ab34");
  assert.equal(a.version, 3);
  assert.equal(a.mason.head, "auto");
  assert.equal(a.mason.eyes, "Eye12");
  assert.deepEqual(a.outfitColors.slice(0, 2), ["#abcdef", null]);
  assert.deepEqual(normalizeAppearance(JSON.parse(JSON.stringify(a))), a);
  assert.deepEqual(normalizeMason(null), normalizeMason());
});
function fixture() {
  const scene = new T.Group();
  for (const name of new Set(Object.values(MASON_OPTIONS).flat())) {
    // glTF creates a group for multi-material meshes. Child names differ from part IDs.
    const group = new T.Group();
    group.name = name;
    const mat = new T.MeshStandardMaterial();
    mat.name = "MasonChannel09";
    const mesh = new T.Mesh(new T.BoxGeometry(), mat);
    mesh.name = `${name}_primitive`;
    group.add(mesh);
    scene.add(group);
  }
  return { scene, animations: [] };
}
test("parts with several materials remain visible and equipped gear replaces cosmetics", () => {
  const asset = fixture(),
    assets = new Map();
  const appearance = normalizeAppearance({
    mason: { body: "Body05", headpiece: "Hat02", shield: "Shield07" },
  });
  const hero = {
    name: "Test",
    draft: {
      ancestryId: "ancestry-goblin",
      classId: "class-arcanist",
      appearance,
    },
    preview: { inventory: { items: [] } },
  };
  let result = masonAppearance(asset, hero, assets);
  assert.equal(result.model.getObjectByName("Body12").visible, true);
  assert.equal(result.model.getObjectByName("Body12_primitive").visible, true);
  assert.equal(result.model.getObjectByName("Shield07").visible, false);
  assert.equal(result.model.getObjectByName("Hat02").visible, true);
  result.model.userData.dispose();
  hero.preview.inventory.items = [
    { catalogId: "item-ordinary-shield", carried: true, held: true },
    { slot: "head", carried: true, worn: true },
  ];
  result = masonAppearance(asset, hero, assets);
  assert.equal(result.model.getObjectByName("Shield07").visible, true);
  assert.equal(result.model.getObjectByName("Hat14").visible, true);
  assert.equal(result.model.getObjectByName("Hat02").visible, false);
  result.model.userData.dispose();
  assert.equal(
    asset.scene.getObjectByName("Shield07").visible,
    true,
    "cached template is untouched",
  );
});

test("class fixes the outfit and a two-handed item uses the selected two-handed type", () => {
  const asset = fixture();
  const hero = {
    draft: {
      classId: "class-protector",
      appearance: normalizeAppearance({
        mason: { body: "Body02", oneHandType: "axe", twoHandType: "hammer" },
      }),
    },
    preview: {
      inventory: {
        items: [
          {
            catalogId: "item-ordinary-melee-weapon",
            carried: true,
            held: true,
            hands: 2,
          },
        ],
      },
    },
  };
  const result = masonAppearance(asset, hero, new Map());
  assert.equal(result.model.getObjectByName("Body13").visible, true);
  assert.equal(result.model.getObjectByName("Body02").visible, false);
  assert.equal(result.model.getObjectByName("THH01_Hammer").visible, true);
  assert.equal(result.model.getObjectByName("OHS10_Axe").visible, false);
  assert.ok(result.model.getObjectByName("Readied melee weapon"));
  result.model.userData.dispose();
});

test("magic weapons keep their receipt form and variant while ordinary styles remain editable", () => {
  const axe = normalizeMason({
    oneHandType: "axe",
    bow: "Bow05",
    arrow: "Arrow05",
  });
  const hammer = normalizeMason({
    oneHandType: "hammer",
    bow: "Bow02",
    arrow: "Arrow02",
  });
  for (const base of ["blade", "bow"]) {
    const item = magicItem(123, 2, { base });
    const visual = masonWeaponVisual(item, axe);
    assert.equal(item.weaponType, base === "blade" ? "sword" : "bow");
    assert.equal(visual.fixed, true);
    assert.deepEqual(masonWeaponVisual(item, hammer), visual);
    const restored = magicItem(
      item.seed,
      item.depth,
      JSON.parse(JSON.stringify(item)),
    );
    assert.deepEqual(masonWeaponVisual(restored, hammer), visual);
  }
  const ordinary = { catalogId: "item-ordinary-melee-weapon", hands: 1 };
  assert.equal(masonWeaponVisual(ordinary, axe).model, "OHS10_Axe");
  assert.equal(masonWeaponVisual(ordinary, hammer).model, "OHS11_Hammer");
  const bow = { catalogId: "item-ordinary-ranged-weapon", hands: 2 };
  assert.equal(masonWeaponVisual(bow, axe).model, "Bow05");
  assert.equal(masonWeaponVisual(bow, hammer).model, "Bow02");
});

test("palette-only accessory variants migrate to distinct shapes and removed styles stay removed", () => {
  for (let n = 1; n <= 6; n++) {
    const suffix = String(n).padStart(2, "0");
    assert.equal(
      normalizeMason({ facialHair: "AC10_Mustache" + suffix }).facialHair,
      "AC10_Mustache01",
    );
    assert.equal(
      normalizeMason({ facialHair: "AC11_Mustache" + suffix }).facialHair,
      "AC11_Mustache01",
    );
  }
  assert.deepEqual(MASON_OPTIONS.mask, ["none", "AC08_NinjaMask05"]);
  const old = normalizeAppearance({
    mason: {
      mask: "AC08_NinjaMask03",
      ears: "AC04_ShortEars",
      crown: "AC06_Crown01",
      ornament: "AC02_Leaf",
    },
  });
  assert.equal(old.mason.mask, "AC08_NinjaMask05");
  assert.equal(old.maskColor, "#bf0b0b");
  assert.equal(old.mason.ears, "none");
  assert.equal(old.mason.crown, "none");
  assert.equal(old.mason.ornament, "none");
  assert.deepEqual(normalizeAppearance(old), old);
  const custom = normalizeAppearance({
    mason: { mask: "AC08_NinjaMask03" },
    outfitColors: ["#abcdef"],
  });
  assert.equal(custom.maskColor, "#abcdef");
  assert.ok(!MASON_OPTIONS.headpiece.includes("Hat10"));
  assert.ok(!MASON_OPTIONS.headpiece.includes("Hat11"));
});
test("moustache and mask use independent chosen colours rather than baked palette darkness", () => {
  const asset = fixture();
  asset.scene.traverse((o) => {
    if (o.isMesh && /^(AC10|AC11)/.test(o.name))
      o.material.name = "MasonChannel04";
    if (o.isMesh && /^AC08/.test(o.name)) o.material.name = "MasonChannel08";
  });
  const hero = {
    draft: {
      appearance: normalizeAppearance({
        hairColor: "#cc7744",
        maskColor: "#3355aa",
        mason: { facialHair: "AC11_Mustache01", mask: "AC08_NinjaMask05" },
      }),
    },
    preview: { inventory: { items: [] } },
  };
  const { model } = masonAppearance(asset, hero, new Map());
  for (const [name, colour] of [
    ["AC11_Mustache01_primitive", "#cc7744"],
    ["AC08_NinjaMask05_primitive", "#3355aa"],
  ]) {
    const mat = model.getObjectByName(name).material,
      shader = { uniforms: {}, fragmentShader: "#include <map_fragment>" };
    mat.onBeforeCompile(shader);
    assert.equal("#" + shader.uniforms.masonTint.value.getHexString(), colour);
    assert.ok(shader.fragmentShader.endsWith("diffuseColor.rgb = masonTint;"));
  }
  model.userData.dispose();
});
