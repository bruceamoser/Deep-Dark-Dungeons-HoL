// Identifiers only. Purchased geometry/textures are never included in Git.
const numbered = (prefix, n) =>
  Array.from(
    { length: n },
    (_, i) => `${prefix}${String(i + 1).padStart(2, "0")}`,
  );
export const MASON_RUNTIME_PARTS = ["BeardShort", "BeardLong"];
export const MASON_OPTIONS = {
  oneHandType: ["sword", "axe", "hammer", "wand"],
  twoHandType: ["sword", "axe", "hammer", "spear"],
  oneHandVariant: [
    "auto",
    "OHS03_Sword",
    "OHS04_Sword",
    "OHS05_Sword",
    "OHS06_Sword",
    "OHS07_Sword",
    "OHS08_Sword",
    "OHS09_Sword",
    "OHS12_Sword",
    "OHS15_Sword",
    "OHS16_Sword",
    "OHS10_Axe",
    "OHS13_Axe",
    "OHS11_Hammer",
    "OHS14_Hammer",
    ...numbered("Wand", 7),
  ],
  twoHandVariant: [
    "auto",
    ...numbered("THS", 7).map((n) => `${n}_Sword`),
    "THA01_Axe",
    "THA02_Axe",
    "THH01_Hammer",
    "THH02_Hammer",
    ...numbered("Spear", 5),
  ],
  body: ["auto", ...numbered("Body", 20)],
  head: ["auto", "Head01_Male", "Head02_Female"],
  hair: ["none", ...numbered("Hair", 13)],
  eyes: numbered("Eye", 12),
  mouth: numbered("Mouth", 12),
  brows: ["none", ...numbered("Eyebrow", 2)],
  headpiece: [
    "class",
    "none",
    ...numbered("Hat", 14).filter(
      (id) => !["Hat03", "Hat09", "Hat10", "Hat11"].includes(id),
    ),
    ...numbered("HeadArmor", 5),
  ],
  facialHair: [
    "none",
    "AC10_Mustache01",
    "AC11_Mustache01",
    ...MASON_RUNTIME_PARTS,
  ],
  ears: ["none"],
  horns: ["none", ...numbered("AC05_Horn", 4)],
  crown: ["none"],
  eyewear: ["none"],
  mask: ["none", "AC08_NinjaMask05"],
  ornament: ["none", "AC07_PiratePatch"],
  cloak: ["none", ...numbered("Cloak", 3)],
  bow: numbered("Bow", 5),
  arrow: numbered("Arrow", 5),
  backpack: numbered("BackPack", 3),
  shield: numbered("Shield", 20),
  weapon: [
    "OHS01_Stick",
    "OHS02_Niddle",
    ...["03", "04", "05", "06", "07", "08", "09", "12", "15", "16"].map(
      (n) => `OHS${n}_Sword`,
    ),
    "OHS10_Axe",
    "OHS11_Hammer",
    "OHS13_Axe",
    "OHS14_Hammer",
    ...numbered("THS", 7).map((n) => `${n}_Sword`),
    ...numbered("Spear", 5),
    ...numbered("Wand", 7),
  ],
};
export const MASON_CLASS_HATS = {
  "class-arcanist": "Hat08",
  "class-blade": "Hat06",
  "class-intellect": "Hat04",
  "class-leader": "Hat12",
  "class-odd": "Hat01",
  "class-protector": "Hat14",
  "class-shadow": "Hat04",
  "class-shepherd": "Hat05",
  "class-unbalanced": "Hat02",
};
export function normalizeMason(input = {}) {
  if (!input || typeof input !== "object") input = {};
  // The numbered files in each family are palette copies of the same shape.
  input = { ...input };
  if (/^AC10_Mustache0[1-6]$/.test(input.facialHair))
    input.facialHair = "AC10_Mustache01";
  if (/^AC11_Mustache0[1-6]$/.test(input.facialHair))
    input.facialHair = "AC11_Mustache01";
  if (/^AC08_NinjaMask0[1-8]$/.test(input.mask))
    input.mask = "AC08_NinjaMask05";
  const defaults = {
    oneHandType: "sword",
    twoHandType: "sword",
    oneHandVariant: "auto",
    twoHandVariant: "auto",
    body: "auto",
    head: "auto",
    hair: "Hair04",
    eyes: "Eye01",
    mouth: "Mouth01",
    brows: "Eyebrow01",
    headpiece: "class",
    facialHair: "none",
    ears: "none",
    horns: "none",
    crown: "none",
    eyewear: "none",
    mask: "none",
    ornament: "none",
    cloak: "none",
    bow: "Bow01",
    arrow: "Arrow01",
    backpack: "BackPack01",
    shield: "Shield04",
    weapon: "OHS03_Sword",
  };
  return Object.fromEntries(
    Object.entries(MASON_OPTIONS).map(([key, choices]) => [
      key,
      key === "body"
        ? "auto"
        : choices.includes(input[key])
          ? input[key]
          : defaults[key],
    ]),
  );
}
export const MASON_CLASS_BODIES = {
  "class-arcanist": "Body12",
  "class-blade": "Body08",
  "class-intellect": "Body09",
  "class-leader": "Body17",
  "class-odd": "Body10",
  "class-protector": "Body13",
  "class-shadow": "Body14",
  "class-shepherd": "Body11",
  "class-unbalanced": "Body07",
};
export function masonBody(classId) {
  return MASON_CLASS_BODIES[classId] ?? "Body05";
}

export const MELEE_VARIANTS = {
  one: {
    wand: numbered("Wand", 7),
    sword: [
      "OHS03_Sword",
      "OHS04_Sword",
      "OHS05_Sword",
      "OHS06_Sword",
      "OHS07_Sword",
      "OHS08_Sword",
      "OHS09_Sword",
      "OHS12_Sword",
      "OHS15_Sword",
      "OHS16_Sword",
    ],
    axe: ["OHS10_Axe", "OHS13_Axe"],
    hammer: ["OHS11_Hammer", "OHS14_Hammer"],
  },
  two: {
    spear: numbered("Spear", 5),
    sword: Array.from({ length: 7 }, (_, i) => `THS0${i + 1}_Sword`),
    axe: ["THA01_Axe", "THA02_Axe"],
    hammer: ["THH01_Hammer", "THH02_Hammer"],
  },
};

// Enchanted forms come from the item's generation receipt. Ordinary weapon
// preferences remain cosmetic and can be edited without changing equipment.
export function masonWeaponVisual(item, choice) {
  if (!item) return null;
  const ranged = item.catalogId === "item-ordinary-ranged-weapon";
  const fixed = !!item.base && Number.isSafeInteger(item.seed);
  const handed = item.hands === 2 ? "two" : "one";
  const type = fixed
    ? (item.weaponType ?? (ranged ? "bow" : "sword"))
    : ranged
      ? "bow"
      : handed === "two"
        ? choice.twoHandType
        : choice.oneHandType;
  if (ranged) {
    const index = (item.seed >>> 0) % MASON_OPTIONS.bow.length;
    return {
      type: "bow",
      fixed,
      model: fixed ? MASON_OPTIONS.bow[index] : choice.bow,
      arrow: fixed ? MASON_OPTIONS.arrow[index] : choice.arrow,
    };
  }
  const variants = MELEE_VARIANTS[handed][type] ?? MELEE_VARIANTS[handed].sword;
  const preferred =
    handed === "two" ? choice.twoHandVariant : choice.oneHandVariant;
  return {
    type,
    fixed,
    model: fixed
      ? variants[(item.seed >>> 0) % variants.length]
      : variants.includes(preferred)
        ? preferred
        : variants[0],
  };
}
