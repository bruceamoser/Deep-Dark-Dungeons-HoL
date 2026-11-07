import { HERO_AVATARS } from "./hero-avatars.mjs";
export const ANCESTRY_LOOKS = {
  "ancestry-human": {
    name: "Human",
    height: 1,
    width: 1,
    head: 1,
    ears: "round",
    skins: ["#e5b493", "#bb8461", "#88563f", "#5c382c", "#d1a27e", "#794c3c"],
  },
  "ancestry-dwarf": {
    name: "Hill Dwarf",
    height: 0.78,
    width: 1.16,
    head: 1.12,
    ears: "round",
    skins: ["#d4a27b", "#a66e4a", "#764632", "#dfb68d", "#976044", "#57392d"],
  },
  "ancestry-deep-dwarf": {
    name: "Deep Dwarf",
    height: 0.71,
    width: 0.88,
    head: 1.08,
    ears: "round",
    eyes: 1.25,
    skins: ["#95949e", "#6f737f", "#b1b2b9", "#595d6b", "#858190", "#c3bec1"],
  },
  "ancestry-elf": {
    name: "Wood Elf",
    height: 0.86,
    width: 0.88,
    head: 0.98,
    ears: "pointed",
    skins: ["#b78460", "#8e6645", "#d1a580", "#6c4b37", "#ae7859", "#e2bc98"],
  },
  "ancestry-high-elf": {
    name: "High Elf",
    height: 1.12,
    width: 1.02,
    head: 0.98,
    ears: "pointed",
    skins: ["#e7c4a6", "#cfa07d", "#ab7858", "#79513b", "#d3b6a1", "#665046"],
  },
  "ancestry-gnome": {
    name: "Gnome",
    height: 0.56,
    width: 0.7,
    head: 1.25,
    ears: "fey",
    skins: ["#d5b28c", "#b48765", "#8f6950", "#d4a394", "#66534b", "#c5baa0"],
  },
  "ancestry-goblin": {
    name: "Goblin",
    height: 0.66,
    width: 0.79,
    head: 1.16,
    ears: "goblin",
    skins: ["#7f9d63", "#586d4b", "#a1ad75", "#6d8672", "#9e9565", "#506756"],
  },
  "ancestry-halfling": {
    name: "Halfling",
    height: 0.65,
    width: 0.88,
    head: 1.13,
    ears: "round",
    skins: ["#d7ac88", "#b88260", "#87563d", "#e3c3a5", "#614333", "#bc9271"],
  },
  "ancestry-oath-bound": {
    name: "Oath-Bound",
    height: 1.07,
    width: 1.08,
    head: 1,
    ears: "construct",
    skins: ["#a7a5a0", "#687879", "#ae8d63", "#5d666e", "#d2c4a9", "#827181"],
  },
  "ancestry-tallfolk": {
    name: "Tallfolk",
    height: 1.3,
    width: 1.12,
    head: 0.96,
    ears: "round",
    skins: ["#c29b80", "#96735d", "#694d3f", "#d6b7a1", "#806358", "#b48e70"],
  },
};
export const LOOK_OPTIONS = {
  sex: ["male", "female"],
  build: ["balanced", "slender", "broad"],
  face: ["angular", "soft", "weathered"],
  hair: [
    "cropped",
    "swept",
    "bob",
    "long",
    "braid",
    "topknot",
    "mohawk",
    "shaved",
  ],
  beard: ["none", "stubble", "mustache", "goatee", "short", "full", "braided"],
};
export const LOOK_PALETTES = {
  hairColor: [
    "#261d1b",
    "#4c3025",
    "#79513b",
    "#ae783c",
    "#d4b77a",
    "#973e29",
    "#b9b7ae",
    "#e2ddd2",
    "#343147",
  ],
  eyeColor: [
    "#6c452b",
    "#529d9a",
    "#668cc5",
    "#93a66c",
    "#be9650",
    "#aaaab9",
    "#b084b8",
    "#e3bb73",
  ],
  clothColor: [
    "#375e63",
    "#693d49",
    "#38465e",
    "#626447",
    "#78533c",
    "#544566",
    "#393c42",
    "#b7a17c",
    "#854834",
  ],
  accentColor: [
    "#c8a665",
    "#d1c9b4",
    "#70b5af",
    "#a66354",
    "#a8b1c0",
    "#5c4540",
  ],
};
export const COLOR_NAMES = {
  "#375e63": "Deep teal",
  "#693d49": "Wine",
  "#38465e": "Midnight blue",
  "#626447": "Moss",
  "#78533c": "Sienna",
  "#544566": "Amethyst",
  "#393c42": "Charcoal",
  "#b7a17c": "Linen",
  "#854834": "Rust",
};
const hash = (s) =>
  [...s].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 17);
export function normalizeAppearance(
  input = {},
  ancestry = "ancestry-human",
  seed = "",
) {
  if (!input || typeof input !== "object" || Array.isArray(input)) input = {};
  const look = ANCESTRY_LOOKS[ancestry] ?? ANCESTRY_LOOKS["ancestry-human"];
  const n = hash(seed),
    base = {
      version: 2,
      avatar: HERO_AVATARS.some((a) => a.id === input.avatar)
        ? input.avatar
        : "auto",
      sex: n % 2 ? "female" : "male",
      build: "balanced",
      face: "angular",
      hair: LOOK_OPTIONS.hair[n % 7],
      beard: "none",
      skin: look.skins[n % look.skins.length],
      hairColor: LOOK_PALETTES.hairColor[n % 7],
      eyeColor: LOOK_PALETTES.eyeColor[n % 6],
      clothColor: LOOK_PALETTES.clothColor[n % 9],
      accentColor: LOOK_PALETTES.accentColor[0],
    };
  for (const [k, values] of Object.entries(LOOK_OPTIONS))
    if (values.includes(input[k])) base[k] = input[k];
  for (const k of ["skin", ...Object.keys(LOOK_PALETTES)])
    if (typeof input[k] === "string" && /^#[0-9a-f]{6}$/i.test(input[k]))
      base[k] = input[k].toLowerCase();
  return base;
}
export function randomAppearance(ancestry, rng = Math.random) {
  const look = ANCESTRY_LOOKS[ancestry] ?? ANCESTRY_LOOKS["ancestry-human"],
    pick = (xs) => xs[Math.floor(rng() * xs.length)];
  return normalizeAppearance(
    {
      ...Object.fromEntries(
        Object.entries(LOOK_OPTIONS).map(([k, v]) => [k, pick(v)]),
      ),
      ...Object.fromEntries(
        Object.entries(LOOK_PALETTES).map(([k, v]) => [k, pick(v)]),
      ),
      skin: pick(look.skins),
      avatar: pick(HERO_AVATARS.filter((a) => a.url)).id,
    },
    ancestry,
  );
}
export const identityMethods = {
  setAppearance(index, appearance) {
    if (this.mode !== "town")
      throw new Error("Change your appearance in Greyhaven.");
    const h = this.party[index];
    h.draft.appearance = normalizeAppearance(
      appearance,
      h.draft.ancestryId,
      h.name,
    );
    this.emit("party");
    this.emit("change");
  },
};

/**
 * Silhouette traits that separate the ancestries at isometric distance, beyond the
 * height/width/head scaling in ANCESTRY_LOOKS. Rendered by src/view/hero-identity.mjs.
 */
export const ANCESTRY_SIGNATURE = {
  "ancestry-human": { brow: "plain", cheek: "plain", mouth: "plain" },
  "ancestry-dwarf": {
    brow: "heavy",
    cheek: "broad",
    mouth: "plain",
    braidRings: true,
    handScale: 1.12,
  },
  "ancestry-deep-dwarf": {
    brow: "heavy",
    cheek: "hollow",
    mouth: "plain",
    braidRings: true,
    stonePlating: true,
    handScale: 1.12,
  },
  "ancestry-elf": {
    brow: "fine",
    cheek: "high",
    mouth: "plain",
    earCuff: true,
    handScale: 0.94,
  },
  "ancestry-high-elf": {
    brow: "fine",
    cheek: "high",
    mouth: "plain",
    earCuff: true,
    circlet: true,
    handScale: 0.94,
  },
  "ancestry-gnome": {
    brow: "fine",
    cheek: "round",
    mouth: "plain",
    bigEyes: true,
    handScale: 1.08,
  },
  "ancestry-goblin": {
    brow: "heavy",
    cheek: "hollow",
    mouth: "wide",
    longFingers: true,
    hunch: 0.12,
    handScale: 1.05,
  },
  "ancestry-halfling": {
    brow: "plain",
    cheek: "round",
    mouth: "plain",
    handScale: 0.96,
  },
  "ancestry-oath-bound": {
    brow: "plain",
    cheek: "plain",
    mouth: "plain",
    stonePlating: true,
    noEars: true,
  },
  "ancestry-tallfolk": {
    brow: "plain",
    cheek: "high",
    mouth: "plain",
    longNeck: true,
    handScale: 1.04,
  },
};

/** Signature traits for an ancestry id, always resolving to a usable object. */
export function signatureFor(ancestryId) {
  return ANCESTRY_SIGNATURE[ancestryId] ?? ANCESTRY_SIGNATURE["ancestry-human"];
}
