import test from "node:test";
import assert from "node:assert/strict";
import {
  appearanceEquipment,
  appearancePreviewHero,
} from "../src/core/appearance-preview.mjs";
import {
  normalizeMason,
  MASON_OPTIONS,
} from "../src/core/mason-appearance.mjs";
test("only carried ordinary equipment unlocks style controls; preview never equips it for real", () => {
  const hero = {
    draft: { appearance: { mason: { headpiece: "class" } } },
    preview: {
      inventory: {
        items: [
          {
            instanceId: "s",
            catalogId: "item-ordinary-melee-weapon",
            hands: 1,
            held: true,
            carried: true,
          },
          {
            instanceId: "b",
            catalogId: "item-ordinary-ranged-weapon",
            hands: 2,
            held: false,
            carried: true,
          },
          {
            instanceId: "m",
            base: "bow",
            seed: 1,
            catalogId: "item-ordinary-ranged-weapon",
            hands: 2,
            carried: true,
          },
          { instanceId: "p", catalogId: "item-travel-pack", carried: false },
        ],
      },
    },
  };
  const original = structuredClone(hero);
  assert.deepEqual(appearanceEquipment(hero), {
    one: true,
    two: false,
    bow: true,
    shield: false,
    backpack: false,
  });
  const preview = appearancePreviewHero(hero, "bow");
  assert.equal(
    preview.hero.preview.inventory.items.find((i) => i.instanceId === "b").held,
    true,
  );
  assert.equal(
    preview.hero.preview.inventory.items.find((i) => i.instanceId === "s").held,
    false,
  );
  assert.deepEqual(hero, original);
  assert.equal(
    appearanceEquipment({
      preview: { inventory: { items: [hero.preview.inventory.items[2]] } },
    }).bow,
    false,
  );
  const hair = appearancePreviewHero(hero, "hair");
  assert.equal(hair.hero.draft.appearance.mason.headpiece, "none");
  assert.equal(hero.draft.appearance.mason.headpiece, "class");
});
test("removed novelty and sci-fi parts normalize to fantasy-safe defaults", () => {
  const a = normalizeMason({
    ears: "AC04_AnthenaEars",
    eyewear: "AC03_NightVision",
    head: "Head05_Santa",
    headpiece: "Hat09",
    ornament: "AC01_Heart",
  });
  assert.equal(a.ears, "none");
  assert.equal(a.eyewear, "none");
  assert.equal(a.head, "auto");
  assert.equal(a.headpiece, "class");
  assert.equal(a.ornament, "none");
  assert.ok(!MASON_OPTIONS.ears.includes("AC04_BunnyEars"));
});
