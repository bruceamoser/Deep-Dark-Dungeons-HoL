import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { normalizeAppearance } from "../src/core/identity.mjs";
import {
  normalizeMason,
  MASON_OPTIONS,
} from "../src/core/mason-appearance.mjs";
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
