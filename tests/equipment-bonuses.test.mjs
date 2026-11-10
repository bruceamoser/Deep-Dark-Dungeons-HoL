import test from "node:test";
import assert from "node:assert/strict";
import { fresh, arena } from "./forge-fixture.mjs";
import { magicItem, ITEM_BASES } from "../src/core/treasure.mjs";
import {
  EQUIPMENT_BONUSES,
  strongest,
  weaponBonus,
  equipmentRollBonus,
  equipmentLight,
} from "../src/core/equipment-bonuses.mjs";
import { magicallyLit } from "../src/core/lighting.mjs";
import { serialize, deserialize } from "../src/core/save.mjs";
let seed = 91000;
function give(g, base, affixes, index = 0) {
  const i = magicItem(seed++, 8, { base, affixes });
  (g.party[index].treasure ??= []).push(i);
  g.refreshHero(g.party[index]);
  return i;
}
function equip(g, i, index = 0, slot) {
  g.mode = "town";
  g.equip(index, i.instanceId, i.hands ? "ready" : "wear", slot);
}
test("approved catalogue covers every form and excludes incompatible or unapproved effects", () => {
  for (const base of Object.keys(ITEM_BASES))
    for (const [id, e] of Object.entries(EQUIPMENT_BONUSES)) {
      if (e.allowed.includes(base)) {
        const i = magicItem(99, 8, { base, affixes: [id] });
        assert.equal(i.revision, 3);
        assert.equal(i.effects[0].id, id);
        assert.ok(i.effects[0].text);
      } else assert.throws(() => magicItem(99, 8, { base, affixes: [id] }));
    }
  for (const id of ["impact", "penetration", "lifebloom", "wardweaver"])
    assert.equal(EQUIPMENT_BONUSES[id], undefined);
  assert.throws(() => magicItem(1, 1, { revision: 4 }));
});
test("legacy receipts preserve identity but translate obsolete stats into legal effects", () => {
  for (const base of [
    "belt",
    "ring",
    "shield",
    "light",
    "hat",
    "boots",
    "gloves",
  ])
    for (const id of ["ram", "duelist", "lifebloom", "wardweaver", "stalker"]) {
      const i = magicItem(18, 7, { revision: 2, base, affixes: [id] });
      assert.equal(i.instanceId, `relic-18-${base}`);
      assert.equal(i.revision, 2);
      assert.deepEqual(i.affixes, [id]);
      assert.ok(
        i.effects.every((e) => EQUIPMENT_BONUSES[e.id]?.allowed.includes(base)),
      );
      assert.ok(i.effects.every((e) => e.stat !== "impact"));
      assert.ok(i.effects.every((e) => !e.text.includes("impact")));
    }
});
test("strongest matching bonuses apply per attribute, resistance, speed and discipline", () => {
  const g = fresh(),
    h = g.active,
    b = give(g, "belt", ["might", "capacity"]),
    r = give(g, "ring", ["might", "competence-arms"]),
    a = give(g, "brooch", ["competence-arms", "flameward"]);
  equip(g, b);
  equip(g, r);
  equip(g, a);
  assert.equal(h.preview.attributes.brawn, h.draft.attributes.brawn + 1);
  assert.equal(strongest(h, "capacity"), 2);
  assert.equal(
    equipmentRollBonus(h, { spec: { discipline: "discipline-arms" } }),
    1,
  );
  assert.equal(
    equipmentRollBonus(h, { spec: { discipline: "discipline-life" } }),
    0,
  );
  const before = h.preview.resistances.fire;
  const c = give(g, "cloak", ["flameward"]);
  equip(g, c);
  assert.equal(h.preview.resistances.fire, before);
  const copy = fresh();
  copy.load(deserialize(serialize(g.snapshot())), { resume: false });
  assert.equal(
    copy.active.preview.attributes.brawn,
    h.preview.attributes.brawn,
  );
});
test("weapon accuracy and damage never leak to spells or the other weapon", () => {
  const g = fresh(),
    h = g.active,
    sword = give(g, "blade", ["accuracy", "duelist"]);
  equip(g, sword);
  assert.equal(
    equipmentRollBonus(h, { mode: "attack", spec: { weapon: "melee" } }),
    1,
  );
  assert.equal(
    equipmentRollBonus(h, { mode: "attack", spec: { spell: true } }),
    0,
  );
  assert.equal(weaponBonus(h, { weapon: "ranged" }, "strongDamage"), 0);
  assert.equal(weaponBonus(h, { weapon: "melee" }, "strongDamage"), 2);
  const gloves = give(g, "gloves", ["accuracy"]);
  equip(g, gloves);
  assert.equal(
    equipmentRollBonus(h, { mode: "attack", spec: { weapon: "melee" } }),
    1,
  );
});
test("discipline competence covers power rolls, intersections and nonattack abilities", () => {
  const g = fresh(),
    h = g.active,
    r = give(g, "ring", ["competence-flame"]);
  equip(g, r);
  assert.equal(
    equipmentRollBonus(h, {
      spec: { id: "power-fire-bolt", discipline: "discipline-flame" },
    }),
    1,
  );
  assert.equal(
    equipmentRollBonus(h, { spec: { id: "power-forge-flaming-arrow" } }),
    1,
  );
  const l = give(g, "brooch", ["competence-life"]);
  equip(g, l);
  assert.equal(
    equipmentRollBonus(h, {
      mode: "attribute",
      spec: { discipline: "discipline-life" },
    }),
    1,
  );
  assert.equal(equipmentRollBonus(h, { mode: "attribute" }), 0);
});
test("equipped bow increases the actual targeting range; stowing removes it", () => {
  const g = fresh(),
    h = g.active,
    b = give(g, "bow", ["reach"]);
  const old = g.powerSpec("power-forge-shot", h).range;
  equip(g, b);
  assert.equal(g.powerSpec("power-forge-shot", h).range, old + 2);
  g.equip(0, b.instanceId, "stow");
  assert.equal(g.powerSpec("power-forge-shot", h).range, old);
});
test("Push 1 moves a surviving target on a Strong hit with this weapon", () => {
  const g = arena(),
    i = give(g, "blade", ["push"]);
  equip(g, i);
  g.mode = "combat";
  const e = g.enemies[0],
    x = e.x;
  g.useAbility("power-forge-strike", e.id);
  assert.equal(e.x, x - 1);
});
test("shield bonuses require Shield Block and combine with existing armour", () => {
  const g = fresh(),
    h = g.active,
    s = give(g, "shield", ["block", "block-dr"]);
  equip(g, s);
  assert.equal(equipmentRollBonus(h, { mode: "defense", type: "physical" }), 0);
  h.buffs.shield = true;
  assert.equal(equipmentRollBonus(h, { mode: "defense", type: "physical" }), 1);
  assert.equal(equipmentRollBonus(h, { mode: "defense", type: "fire" }), 0);
  assert.equal(
    g
      .powerResistances(h, [{ type: "physical", value: 1 }])
      .find((r) => r.type === "physical").value,
    2,
  );
  h.buffs.shield = false;
  assert.equal(
    g.powerResistances(h, [{ type: "physical", value: 3 }])[0].value,
    3,
  );
});
test("condition protection applies to creature and power conditions without blanket immunity", () => {
  const g = fresh(),
    h = g.active,
    r = give(g, "ring", ["protect-burning"]);
  equip(g, r);
  h.conditions = [];
  g.powerCondition(h, "burning", 1, "flame");
  assert.equal(h.conditions.length, 0);
  g.addCreatureCondition(h, "burning", 3, { id: "foe" });
  assert.equal(h.conditions[0].rating, 2);
  g.powerCondition(h, "slowed", 2, "frost");
  assert.equal(h.conditions.find((c) => c.key === "slowed").rating, 2);
});
test("terrain boots remove movement surcharge, not damage or prone-occupant costs", () => {
  const g = arena(),
    h = g.active,
    b = give(g, "boots", ["surefoot"]);
  equip(g, b);
  g.map.tiles["4,4"].low = true;
  assert.equal(g.moveCost({ x: 4, z: 4 }, h), 1);
  g.party[1].x = 4;
  g.party[1].z = 4;
  g.party[1].conditions = [{ key: "prone", rating: 1 }];
  assert.equal(g.moveCost({ x: 4, z: 4 }, h), 2);
  const hp = h.survival.hp;
  g.powerDamage(h, 3, "fire", null);
  assert.ok(h.survival.hp < hp);
});
test("Light reduces own Bulk while stored; backpack storage excludes equipped gear and respects maximum reduction", () => {
  const g = fresh(),
    h = g.active,
    p = give(g, "pack", ["light", "storage"]);
  assert.equal(
    h.preview.inventory.items.find((i) => i.instanceId === p.instanceId).bulk,
    0.5,
  );
  const before = h.preview.inventory.bulk;
  equip(g, p);
  assert.equal(
    h.preview.inventory.bulk,
    before -
      Math.min(
        2,
        h.preview.inventory.items
          .filter((i) => i.carried && !i.held && !i.worn)
          .reduce((n, i) => n + i.bulk, 0),
      ),
  );
  const copy = fresh();
  copy.load(deserialize(serialize(g.snapshot())), { resume: false });
  assert.equal(copy.active.preview.inventory.bulk, h.preview.inventory.bulk);
});
test("kit competence and advanced crafting speed require actually holding the kit", () => {
  const g = fresh(),
    h = g.active,
    k = give(g, "kit", ["competence-craft", "craft"]);
  assert.equal(g.buildStat(h, "craftSpeed"), 0);
  equip(g, k);
  assert.equal(g.buildStat(h, "craftSpeed"), 0.25);
  assert.equal(
    equipmentRollBonus(h, { spec: { discipline: "discipline-craft" } }),
    1,
  );
  g.equip(0, k.instanceId, "stow");
  assert.equal(g.buildStat(h, "craftSpeed"), 0);
});
test("magical light is fuel-free, toggleable, equipped-only and persistent", () => {
  const g = fresh(),
    h = g.active,
    r = give(g, "brooch", ["illumination"]);
  g.map.lights = [];
  for (let x = 0; x < 16; x++)
    for (let z = 0; z < 16; z++) g.map.tiles[`${x},${z}`] = { x, z };
  g.map.obstacles = {};
  Object.assign(h, { x: 5, z: 5 });
  equip(g, r);
  assert.equal(equipmentLight(h), true);
  assert.equal(magicallyLit(g.map, [h], { x: h.x + 3, z: h.z }), true);
  assert.equal(magicallyLit(g.map, [h], { x: h.x + 4, z: h.z }), false);
  const supplies = JSON.stringify(h.supplies);
  g.setItemLight(0, r.instanceId, false);
  assert.equal(equipmentLight(h), false);
  assert.equal(JSON.stringify(h.supplies), supplies);
  const copy = fresh();
  copy.load(deserialize(serialize(g.snapshot())), { resume: false });
  assert.equal(equipmentLight(copy.active), false);
  copy.setItemLight(0, r.instanceId, true);
  assert.equal(equipmentLight(copy.active), true);
  copy.equip(0, r.instanceId, "remove");
  assert.equal(equipmentLight(copy.active), false);
});
