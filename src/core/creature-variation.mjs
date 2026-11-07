// Visual variation for enemies.
//
// The roster casts roughly forty enemy kinds onto nine optional base meshes, which is
// why so many looked alike. This table gives every theme a colour story and a set of
// signature features, and depth adds rank so a warband's marshal does not read like a
// scrapper. `src/view/creature-dress.mjs` turns a row into geometry.

const T = (o) => ({
  label: o.label,
  skin: o.skin ?? null,
  cloth: o.cloth ?? "#4a443c",
  metal: o.metal ?? "#6e6a63",
  glow: o.glow ?? null,
  features: o.features ?? [],
});

export const THEME_LOOK = {
  crypt: T({
    label: "Crypt",
    skin: "#b9b2a0",
    cloth: "#3b3730",
    metal: "#7d786e",
    glow: "#7fd4c8",
    features: ["tatters", "eyeGlow"],
  }),
  outlaws: T({
    label: "Outlaws",
    cloth: "#4b4238",
    metal: "#6a6156",
    features: ["scarf", "bandolier"],
  }),
  goblins: T({
    label: "Goblins",
    skin: "#7d9455",
    cloth: "#4d4231",
    metal: "#7a6a4e",
    features: ["warpaint", "boneTrophy"],
  }),
  kobolds: T({
    label: "Kobolds",
    skin: "#8a9a66",
    cloth: "#46402f",
    features: ["warpaint", "collar"],
  }),
  warband: T({
    label: "Warband",
    skin: "#6f7a4e",
    cloth: "#42352a",
    metal: "#8a7a5a",
    features: ["warpaint", "tusks", "pauldron"],
  }),
  vermin: T({ label: "Vermin", cloth: "#3d3a33", features: [] }),
  beasts: T({ label: "Beasts", cloth: "#4a4036", features: ["furRuff"] }),
  dead: T({
    label: "Restless Dead",
    skin: "#9aa08c",
    cloth: "#35362f",
    glow: "#9fd96b",
    features: ["tatters", "eyeGlow"],
  }),
  constructs: T({
    label: "Constructs",
    skin: "#8b8f92",
    cloth: "#4b4f52",
    metal: "#a9adb0",
    glow: "#8fd0e8",
    features: ["plating", "eyeGlow"],
  }),
  elementals: T({
    label: "Elementals",
    cloth: "#5b6a72",
    glow: "#a8d8ee",
    features: ["wisps", "eyeGlow"],
  }),
  infernal: T({
    label: "Infernal",
    skin: "#7a4038",
    cloth: "#3a2622",
    metal: "#8a5a3a",
    glow: "#ff8a3c",
    features: ["horns", "ember", "eyeGlow"],
  }),
  rime: T({
    label: "Rime",
    skin: "#8fa6b4",
    cloth: "#3d4a55",
    metal: "#9fb4c2",
    glow: "#bfe6ff",
    features: ["frost", "eyeGlow"],
  }),
  haunted: T({
    label: "Haunted",
    cloth: "#3a3f4a",
    glow: "#b6c8ff",
    features: ["tatters", "wisps", "eyeGlow"],
  }),
};

const FALLBACK = THEME_LOOK.outlaws;

/** Rank embellishment: depth drives scale and how much kit the enemy carries. */
export function rankFor(depth = 1) {
  return {
    scale: 1 + Math.min(depth, 12) * 0.017,
    crown: depth >= 6,
    banner: depth >= 4,
    spikes: depth >= 3,
    plating: depth >= 2,
  };
}

/** Resolve a roster row into a drawing spec. */
export function creatureLook(look = {}) {
  const theme = THEME_LOOK[look.theme] ?? FALLBACK;
  return {
    theme: look.theme ?? null,
    themeLabel: theme.label,
    colors: { skin: theme.skin, cloth: theme.cloth, metal: theme.metal, glow: theme.glow },
    features: theme.features,
    rank: rankFor(look.depth ?? 1),
  };
}
