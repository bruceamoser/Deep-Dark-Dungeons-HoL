import { FORGE_DISCIPLINES, FORGE_NODES } from "./forge-catalog.mjs";

// Game adaptations approved in #144. Receipts, never saved effect values, are authoritative.
const forms = {
  weapon: ["blade", "bow"],
  armor: ["light", "medium", "heavy"],
  jewelry: ["ring", "brooch"],
  wearable: ["belt", "boots", "hat", "ring", "brooch", "gloves", "cloak"],
};
const all = [
  ...forms.weapon,
  ...forms.armor,
  "shield",
  ...forms.wearable,
  "pack",
  "kit",
];
export const EQUIPMENT_BONUSES = {};
function add(id, name, effect, allowed, text, extra = {}) {
  EQUIPMENT_BONUSES[id] = {
    id,
    name,
    effect,
    allowed,
    text,
    value: 1,
    rank: 0,
    color: 0xc5aa67,
    ...extra,
  };
}
add(
  "accuracy",
  "True",
  "accuracy",
  [...forms.weapon, "gloves"],
  "1 Boon to weapon attack rolls.",
);
add(
  "keen",
  "Keen",
  "damage",
  forms.weapon,
  "+1 physical damage with this weapon.",
  { type: "physical" },
);
add(
  "reach",
  "Farshot",
  "range",
  ["bow"],
  "+2 squares of range with this weapon.",
  { value: 2 },
);
add(
  "push",
  "Ram’s",
  "push",
  [...forms.weapon, "shield"],
  "Push 1 on a Strong hit with this weapon or Shield Bash.",
);
add(
  "duelist",
  "Duelist’s",
  "strongDamage",
  forms.weapon,
  "+2 damage on Strong hits with this weapon.",
  { value: 2 },
);
add(
  "stalker",
  "Stalker’s",
  "hiddenDamage",
  forms.weapon,
  "+2 damage from hiding with this weapon.",
  { value: 2 },
);
for (const [id, name, type, condition] of [
  ["bloodletter", "Bloodletter", "physical", "bleeding"],
  ["ember", "Ember", "fire", "burning"],
  ["rime", "Rime", "cold", "freezing"],
  ["stormbite", "Stormbite", "lightning", "slowed"],
  ["mindpiercer", "Mindpiercer", "mental", "dazed"],
])
  add(
    id,
    name,
    "damage",
    forms.weapon,
    `+1 ${type} damage with this weapon; ${condition} 1 on Strong.`,
    { type, condition },
  );
for (const [id, name, type] of [
  ["flameward", "Cinderward", "fire"],
  ["frostward", "Winterward", "cold"],
  ["stormward", "Stormward", "lightning"],
  ["mindward", "Mindward", "mental"],
  ["radiantward", "Dawnward", "radiant"],
  ["grave", "Gravebound", "life"],
])
  add(
    id,
    name,
    "resistance",
    [
      ...forms.armor,
      "shield",
      ...forms.jewelry,
      "cloak",
      ...(["fire", "cold"].includes(type) ? ["gloves"] : []),
    ],
    `${type[0].toUpperCase() + type.slice(1)} resistance 2${type === "life" ? "; also reduces Life healing" : ""}.`,
    { type, value: 2 },
  );
add(
  "armorward",
  "Ironward",
  "resistance",
  [...forms.armor, "hat"],
  "Physical DR 1 while worn.",
  { type: "physical" },
);
add(
  "defense",
  "Sheltering",
  "defense",
  [...forms.armor, "cloak"],
  "1 Boon to physical defence rolls.",
);
add(
  "block",
  "Sentinel’s",
  "block",
  ["shield"],
  "1 additional Boon when using Shield Block.",
);
add(
  "block-dr",
  "Bastion",
  "blockDR",
  ["shield"],
  "+1 physical DR when using Shield Block; combines with worn armour.",
);
add(
  "wind",
  "Wayfarer",
  "speed",
  [...forms.armor, "boots"],
  "+1 Speed while worn.",
);
add(
  "surefoot",
  "Surefoot",
  "terrain",
  ["boots"],
  "Ignore extra movement costs of difficult terrain. Hazards still cause damage.",
);
add(
  "balance",
  "Steadfast",
  "conditionBoon",
  ["boots"],
  "1 Boon to resist being knocked Prone.",
  { condition: "prone" },
);
for (const condition of [
  "burning",
  "freezing",
  "bleeding",
  "poisoned",
  "frightened",
  "slowed",
  "dazed",
])
  add(
    `protect-${condition}`,
    `Warding (${condition})`,
    "protection",
    [...forms.armor, ...forms.jewelry, "boots", "cloak", "hat"],
    `Reduce incoming ${condition} rating by 1, to a minimum of 0.`,
    { condition },
  );
for (const attribute of [
  "brawn",
  "fortitude",
  "agility",
  "guile",
  "knowledge",
  "reason",
])
  add(
    attribute === "brawn" ? "might" : `attribute-${attribute}`,
    attribute[0].toUpperCase() + attribute.slice(1),
    "attribute",
    [
      ...forms.jewelry,
      "hat",
      ...(["brawn", "agility"].includes(attribute) ? ["gloves"] : []),
      ...(["brawn", "fortitude"].includes(attribute) ? ["belt"] : []),
    ],
    `+1 ${attribute[0].toUpperCase() + attribute.slice(1)} while equipped. Does not change creation DP, HP or eligibility.`,
    { attribute },
  );
for (const { id, name } of FORGE_DISCIPLINES)
  add(
    `competence-${id}`,
    `${name} Adept’s`,
    "competence",
    [...forms.wearable, "kit"],
    `1 Boon to rolls for all ${name} abilities.`,
    { competence: id },
  );
add(
  "light",
  "Featherweight",
  "light",
  all.filter((x) => !["ring", "brooch"].includes(x)),
  "Light: half this item’s own Bulk (minimum 0.25).",
);
add(
  "capacity",
  "Porter’s",
  "capacity",
  ["belt", "pack"],
  "+2 Bulk carrying capacity.",
  { value: 2 },
);
add(
  "storage",
  "Deep-pocketed",
  "storage",
  ["pack"],
  "Stored gear counts as up to 2 less Bulk. Equipped items are excluded.",
  { value: 2 },
);
add(
  "craft",
  "Artisan’s",
  "build",
  ["kit"],
  "Advanced crafting takes 25% less time while using this kit.",
  { stat: "craftSpeed", value: 0.25 },
);
add(
  "illumination",
  "Lantern",
  "illumination",
  [...forms.weapon, ...forms.armor, "shield", "brooch", "cloak", "hat", "kit"],
  "Light source: toggle magical illumination within 3 squares while equipped; uses no fuel.",
);
export function strongest(h, effect, predicate = () => true) {
  return Math.max(
    0,
    ...(h?.preview?.equipmentEffects ?? [])
      .filter((e) => e.effect === effect && predicate(e))
      .map((e) => e.value),
  );
}
export function weaponEffects(h, spec) {
  const item = spec?.shield
    ? h?.preview?.inventory.items.find(
        (i) => i.carried && i.held && i.catalogId === "item-ordinary-shield",
      )
    : spec?.weapon &&
      h?.preview?.inventory.items.find(
        (i) =>
          i.carried &&
          i.held &&
          i.catalogId === `item-ordinary-${spec.weapon}-weapon`,
      );
  if (!item) return [];
  return (h?.preview?.equipmentEffects ?? []).filter(
    (e) => e.itemId === item.instanceId,
  );
}
export function weaponBonus(h, spec, effect) {
  return Math.max(
    0,
    ...weaponEffects(h, spec)
      .filter((e) => e.effect === effect)
      .map((e) => e.value),
  );
}
export function equipmentLight(h) {
  return h?.survival?.status === "active" && strongest(h, "illumination") > 0;
}
export function protectCondition(h, key, rating) {
  return Math.max(
    0,
    rating - strongest(h, "protection", (e) => e.condition === key),
  );
}
export function equipmentRollBonus(h, context = {}) {
  const spec = context.spec,
    mode = context.mode;
  let result = 0;
  if (mode === "attack" && spec?.weapon)
    result += Math.max(
      weaponBonus(h, spec, "accuracy"),
      strongest(h, "accuracy", (e) => !e.weaponOnly),
    );
  if (mode === "defense" && context.type === "physical")
    result +=
      strongest(h, "defense") + (h.buffs?.shield ? strongest(h, "block") : 0);
  if (context.condition)
    result += strongest(
      h,
      "conditionBoon",
      (e) => e.condition === context.condition,
    );
  const disciplines = new Set([
    spec?.discipline?.replace("discipline-", ""),
    ...(spec?.id
      ? FORGE_NODES.filter((n) => n.power === spec.id).flatMap(
          (n) => n.disciplines ?? [n.discipline],
        )
      : []),
  ]);
  result += strongest(h, "competence", (e) => disciplines.has(e.competence));
  return result;
}
