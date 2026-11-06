import { RECIPE_ITEMS } from "./recipes.mjs";
import { addStarterPowers } from "./starter-powers.mjs";
import { expandSignatures, makeAtWill } from "./signature-builds.mjs";
// Game-owned powers. These are designs for this dungeon, not transcriptions of cards.
const strike = (attribute, type = "physical", extra = {}) => ({
  category: "main",
  target: "enemy",
  range: 5,
  attribute,
  effects: [{ kind: "damage", type, amount: [2, 4, 6] }],
  ...extra,
});
const aid = (effects, extra = {}) => ({
  category: "maneuver",
  target: "ally",
  range: 4,
  effects,
  ...extra,
});
const buff = (stats, turns = 2) => ({ kind: "buff", stats, turns });
const zone = (surface, extra = {}) => ({
  category: "main",
  target: "ground",
  range: 5,
  radius: 1,
  effects: [{ kind: "zone", surface, rounds: 3 }],
  ...extra,
});
const move = (mode, range, extra = {}) => ({
  category: "maneuver",
  target: "ground",
  range,
  effects: [{ kind: "move", mode }],
  ...extra,
});
const condition = (key, rating = 1) => ({ kind: "condition", key, rating });
const definitions = [];
function power(discipline, rank, slug, name, description, spec) {
  const p = {
    id: `power-${slug}`,
    name,
    description,
    discipline: discipline ? `discipline-${discipline}` : null,
    rank,
    minimumLevel: [1, 3, 7][rank - 1],
    cost: [2, 4, 6][rank - 1],
    limit: 2,
    ...spec,
    gamePower: true,
  };
  definitions.push(p);
  return p;
}
power(
  "arms",
  1,
  "driving-cut",
  "Driving Cut",
  "Strike with a readied melee weapon for 2/4/6 physical damage and push the target 1 square. Twice per encounter.",
  strike("brawn", "physical", {
    range: 1,
    weapon: "melee",
    effects: [
      { kind: "damage", type: "physical", amount: [2, 4, 6] },
      { kind: "push", amount: 1 },
    ],
  }),
);
power(
  "arms",
  2,
  "sweeping-blade",
  "Sweeping Blade",
  "Strike enemies in a radius of 1 around an adjacent target for 2/4/6 physical damage. Allies are spared. Twice per encounter.",
  strike("brawn", "physical", { range: 1, radius: 1, weapon: "melee" }),
);
power(
  "arms",
  3,
  "execution-edge",
  "Execution Edge",
  "Your next attack within two turns deals +4 damage. Gain 1 attack Boon for two turns. Once per encounter.",
  aid([buff({ damage: 4, attack: 1 })], { target: "self", limit: 1 }),
);
power(
  "armor",
  1,
  "brace",
  "Brace",
  "Reduce incoming damage by 2 until the end of your next turn. Twice per encounter.",
  aid([buff({ reduction: 2 })], { target: "self" }),
);
power(
  "armor",
  2,
  "iron-skin",
  "Iron Skin",
  "Gain 1 physical DR for two turns. Twice per encounter.",
  aid([buff({ dr: 1 })], { target: "self" }),
);
power(
  "armor",
  3,
  "adamant-ward",
  "Adamant Ward",
  "Absorb the next 8 damage you receive. Lasts two turns. Once per encounter.",
  aid([{ kind: "barrier", amount: 8, turns: 2 }], { target: "self", limit: 1 }),
);
power(
  "athletics",
  1,
  "fleet-step",
  "Fleet Step",
  "Gain 3 movement this turn and disengage. Twice per encounter.",
  aid([buff({ movement: 3, disengage: true }, 1)], { target: "self" }),
);
power(
  "athletics",
  2,
  "vault",
  "Vault",
  "Leap up to 4 squares to an empty visible space. Cross creatures and ground hazards, but never walls. Twice per encounter.",
  move("leap", 4),
);
power(
  "athletics",
  3,
  "rescue-line",
  "Rescue Line",
  "Pull an ally up to 4 squares toward you without provoking opportunity attacks. Twice per encounter.",
  aid([{ kind: "pull", amount: 4 }], { range: 5 }),
);
power(
  "calling",
  1,
  "spirit-ward",
  "Spirit Ward",
  "A spirit absorbs the next 4 damage an ally receives. Lasts two turns. Twice per encounter.",
  aid([{ kind: "barrier", amount: 4, turns: 2 }], { spell: true }),
);
power(
  "calling",
  2,
  "phantom-sentry",
  "Phantom Sentry",
  "Place a spectral trap. The first creature to cross it suffers 5 mental damage. Lasts three rounds. Twice per encounter.",
  zone("trap", { radius: 0, spell: true }),
);
power(
  "calling",
  3,
  "spirit-crossing",
  "Spirit Crossing",
  "Swap places with a visible ally within 6 squares. The swap does not provoke; casting can. Once per encounter.",
  aid([{ kind: "swap" }], { range: 6, spell: true, limit: 1 }),
);
power(
  "craft",
  1,
  "field-artisan",
  "Field Artisan",
  "Learn the smoke flask and cord recipes. Crafting takes 25% less time. Use the recipe book at camp or in town.",
  {
    category: "passive",
    target: "self",
    effects: [],
    recipes: ["recipe-smoke-flask", "recipe-twisted-cord"],
    passive: { craftSpeed: 0.25 },
  },
);
power(
  "craft",
  2,
  "resourceful-maker",
  "Resourceful Maker",
  "Learn field dressing and flash powder recipes. Crafting returns a full supply; known recipes remain available without an action slot.",
  {
    category: "passive",
    target: "self",
    effects: [],
    recipes: ["recipe-field-dressing", "recipe-flash-powder"],
  },
);
power(
  "craft",
  3,
  "master-artisan",
  "Master Artisan",
  "Learn restoration draught and ward charm recipes. Crafting takes 50% less time; this replaces the smaller speed bonus.",
  {
    category: "passive",
    target: "self",
    effects: [],
    recipes: ["recipe-restoration-draught", "recipe-ward-charm"],
    passive: { craftSpeed: 0.5 },
  },
);
power(
  "flame",
  1,
  "ember-lance",
  "Ember Lance",
  "Deal 2/4/6 fire damage and apply Burning 1. Twice per encounter.",
  strike("knowledge", "fire", {
    spell: true,
    effects: [
      { kind: "damage", type: "fire", amount: [2, 4, 6] },
      condition("burning"),
    ],
  }),
);
power(
  "flame",
  2,
  "firebreak",
  "Firebreak",
  "Ignite a radius of 1 for three rounds. Entering or starting a turn in fire deals 2 fire damage and Burning 1 to either side. Twice per encounter.",
  zone("fire", { spell: true }),
);
power(
  "flame",
  3,
  "sunburst",
  "Sunburst",
  "Deal 4/6/8 fire damage to enemies in a radius of 2. Allies are spared. Once per encounter.",
  strike("knowledge", "fire", {
    target: "ground",
    radius: 2,
    spell: true,
    limit: 1,
    effects: [{ kind: "damage", type: "fire", amount: [4, 6, 8] }],
  }),
);
power(
  "frost",
  1,
  "winter-bolt",
  "Winter Bolt",
  "Deal 2/4/6 cold damage and apply Slowed 1. Twice per encounter.",
  strike("knowledge", "cold", {
    spell: true,
    effects: [
      { kind: "damage", type: "cold", amount: [2, 4, 6] },
      condition("slowed"),
    ],
  }),
);
power(
  "frost",
  2,
  "dousing-rain",
  "Dousing Rain",
  "Create shallow water in a radius of 1 for three rounds. Extinguishes fire and temporary Burning on both sides. Twice per encounter.",
  zone("water", { spell: true }),
);
power(
  "frost",
  3,
  "glacial-wall",
  "Glacial Wall",
  "Raise a three-square wall perpendicular to your aim for three rounds. Blocks travel and projectiles. Cannot cover creatures or stairs. Once per encounter.",
  zone("wall", { shape: "wall", radius: 1, spell: true, limit: 1 }),
);
power(
  "guard",
  1,
  "guardian-link",
  "Guardian Link",
  "Intercept the next hit against an adjacent ally, spending your Reaction. Stay adjacent. Protection lasts through their next turn. Twice per encounter.",
  aid([{ kind: "guard" }], { range: 1 }),
);
power(
  "guard",
  2,
  "retaliating-guard",
  "Retaliating Guard",
  "Prepare a melee counterattack using your Reaction after the next physical hit. Lasts through your next turn. Twice per encounter.",
  aid([{ kind: "counter" }], { target: "self", weapon: "melee" }),
);
power(
  "guard",
  3,
  "hold-the-line",
  "Hold the Line",
  "Allies within 2 squares gain 2 damage reduction for two turns. Once per encounter.",
  aid([buff({ reduction: 2 })], { target: "self", radius: 2, limit: 1 }),
);
power(
  "influence",
  1,
  "rally",
  "Rally",
  "Give an ally 1 attack Boon for two turns. Twice per encounter.",
  aid([buff({ attack: 1 })]),
);
power(
  "influence",
  2,
  "draw-attention",
  "Draw Attention",
  "Mark an enemy to prioritize attacking you for two turns, if you are a legal target. Apply 1 attack Bane. Twice per encounter.",
  aid([buff({ taunt: true, attack: -1 })], { target: "enemy", range: 5 }),
);
power(
  "influence",
  3,
  "second-wind",
  "Second Wind",
  "Grant an ally one bonus Maneuver on their next turn that retains Maneuver. At most once per recipient per encounter. Cannot target yourself. Once per encounter.",
  aid([{ kind: "resource", resource: "maneuver", amount: 1 }], {
    limit: 1,
    otherOnly: true,
  }),
);
power(
  "life",
  1,
  "mending-touch",
  "Mending Touch",
  "Restore 3/5/7 HP to an ally. Three uses per rest; no wound or Grit recovery.",
  aid([{ kind: "heal", amount: [3, 5, 7] }], {
    category: "main",
    attribute: "reason",
    spell: true,
    restLimit: 3,
    limit: 0,
    field: true,
  }),
);
power(
  "life",
  2,
  "renewal-circle",
  "Renewal Circle",
  "Create a healing circle for three rounds. An ally starting a turn there regains 2 HP. Two uses per rest.",
  zone("healing", { spell: true, restLimit: 2, limit: 0 }),
);
power(
  "life",
  3,
  "renew-flesh",
  "Renew Flesh",
  "Repair one recoverable wound on an ally and restore 5 HP. One use per rest. Does not restore Grit or erase injury history.",
  aid([{ kind: "wound" }, { kind: "heal", amount: 5 }], {
    category: "main",
    spell: true,
    restLimit: 1,
    limit: 0,
    field: true,
  }),
);
power(
  "marksmanship",
  1,
  "barbed-arrow",
  "Barbed Arrow",
  "A readied bow deals 2/4/6 physical damage and Bleeding 1. Uses ammunition. Twice per encounter.",
  strike("agility", "physical", {
    weapon: "ranged",
    range: 8,
    effects: [
      { kind: "damage", type: "physical", amount: [2, 4, 6] },
      condition("bleeding"),
    ],
  }),
);
power(
  "marksmanship",
  2,
  "piercing-flight",
  "Piercing Flight",
  "Shoot through enemies in a line up to 7 squares for 2/4/6 physical damage. Allies are spared; walls stop the shot. Twice per encounter.",
  strike("agility", "physical", {
    weapon: "ranged",
    target: "ground",
    shape: "line",
    range: 7,
  }),
);
power(
  "marksmanship",
  3,
  "hunters-focus",
  "Hunter’s Focus",
  "Your next attack within two turns deals +3 damage. Gain 2 attack Boons for two turns. Once per encounter.",
  aid([buff({ damage: 3, attack: 2 })], { target: "self", limit: 1 }),
);
power(
  "medicine",
  1,
  "field-care",
  "Field Care",
  "Stabilize an ally and remove temporary Bleeding. Two uses per rest. Also learn the field dressing recipe.",
  aid(
    [
      { kind: "stabilize" },
      { kind: "cleanse", keys: ["bleeding"], amount: 99 },
    ],
    { restLimit: 2, limit: 0, field: true, recipes: ["recipe-field-dressing"] },
  ),
);
power(
  "medicine",
  2,
  "purging-tonic",
  "Purging Tonic",
  "Remove temporary Poisoned, Dazed, Burning and Freezing from an ally. Two uses per rest.",
  aid(
    [
      {
        kind: "cleanse",
        keys: ["poisoned", "dazed", "burning", "freezing"],
        amount: 99,
      },
    ],
    { restLimit: 2, limit: 0, field: true },
  ),
);
power(
  "medicine",
  3,
  "battle-surgeon",
  "Battle Surgeon",
  "Restore 6/9/12 HP and stabilize an ally. Two uses per rest. Learn the restoration draught recipe.",
  aid([{ kind: "stabilize" }, { kind: "heal", amount: [6, 9, 12] }], {
    category: "main",
    attribute: "knowledge",
    restLimit: 2,
    limit: 0,
    recipes: ["recipe-restoration-draught"],
    field: true,
  }),
);
power(
  "mind",
  1,
  "fracture-focus",
  "Fracture Focus",
  "Deal 1/3/5 mental damage and apply Dazed 1. Twice per encounter.",
  strike("reason", "mental", {
    spell: true,
    effects: [
      { kind: "damage", type: "mental", amount: [1, 3, 5] },
      condition("dazed"),
    ],
  }),
);
power(
  "mind",
  2,
  "force-hand",
  "Force Hand",
  "Move a visible enemy 3 squares directly away from you. Twice per encounter.",
  aid([{ kind: "push", amount: 3 }], {
    category: "main",
    target: "enemy",
    range: 5,
    spell: true,
  }),
);
power(
  "mind",
  3,
  "mindstorm",
  "Mindstorm",
  "Enemies in a radius of 2 suffer 2/4/6 mental damage and Dazed 1. Once per encounter.",
  strike("reason", "mental", {
    target: "ground",
    radius: 2,
    spell: true,
    limit: 1,
    effects: [
      { kind: "damage", type: "mental", amount: [2, 4, 6] },
      condition("dazed"),
    ],
  }),
);
power(
  "radiance",
  1,
  "guiding-light",
  "Guiding Light",
  "Illuminate a radius of 2 for three rounds and reveal concealed creatures there. Twice per encounter.",
  zone("light", {
    radius: 2,
    spell: true,
    field: true,
    effects: [
      { kind: "zone", surface: "light", rounds: 3 },
      { kind: "reveal" },
    ],
  }),
);
power(
  "radiance",
  2,
  "dawn-shield",
  "Dawn Shield",
  "Absorb 6 damage on an ally and remove temporary Frightened. Two uses per rest.",
  aid(
    [
      { kind: "barrier", amount: 6, turns: 2 },
      { kind: "cleanse", keys: ["frightened"], amount: 99 },
    ],
    { spell: true, restLimit: 2, limit: 0 },
  ),
);
power(
  "radiance",
  3,
  "judgments-cone",
  "Judgment’s Cone",
  "Enemies in a cone up to 4 squares take 4/6/8 radiant damage. Once per encounter.",
  strike("reason", "radiant", {
    target: "ground",
    shape: "cone",
    range: 4,
    spell: true,
    limit: 1,
    effects: [{ kind: "damage", type: "radiant", amount: [4, 6, 8] }],
  }),
);
power(
  "scholarship",
  1,
  "read-the-depths",
  "Read the Depths",
  "Reveal the nearby floor and its interactable objects within 8 squares. Does not reveal enemies. Usable while exploring.",
  aid([{ kind: "survey" }], { target: "self", field: true, limit: 0 }),
);
power(
  "scholarship",
  2,
  "expose-weakness",
  "Expose Weakness",
  "Reduce an enemy’s DR by 1 for two turns. Twice per encounter.",
  aid([buff({ dr: -1 })], { target: "enemy", range: 6 }),
);
power(
  "scholarship",
  3,
  "calculated-opening",
  "Calculated Opening",
  "Restore a spent Reaction and grant 1 defense Boon to an ally for two turns. Once per encounter.",
  aid(
    [
      { kind: "resource", resource: "reaction", amount: 1 },
      buff({ defense: 1 }),
    ],
    { limit: 1 },
  ),
);
power(
  "storm",
  1,
  "gale-bolt",
  "Gale Bolt",
  "Deal 2/4/6 lightning damage and push the target 1 square. Twice per encounter.",
  strike("knowledge", "lightning", {
    spell: true,
    effects: [
      { kind: "damage", type: "lightning", amount: [2, 4, 6] },
      { kind: "push", amount: 1 },
    ],
  }),
);
power(
  "storm",
  2,
  "crosswind",
  "Crosswind",
  "Reposition to an empty square within a walkable route of 4 squares. Movement does not provoke; casting can. Twice per encounter.",
  move("route", 4, { spell: true }),
);
power(
  "storm",
  3,
  "thunder-line",
  "Thunder Line",
  "Enemies in a line up to 7 squares take 4/6/8 lightning damage and are pushed 2 squares. Once per encounter.",
  strike("knowledge", "lightning", {
    target: "ground",
    shape: "line",
    range: 7,
    spell: true,
    limit: 1,
    effects: [
      { kind: "damage", type: "lightning", amount: [4, 6, 8] },
      { kind: "push", amount: 2 },
    ],
  }),
);
power(
  "subterfuge",
  1,
  "vanish",
  "Vanish",
  "Become concealed for two turns. Enemies cannot target you from farther than 1 square. Attacking or taking damage ends concealment. Twice per encounter.",
  aid([buff({ hidden: true })], { target: "self" }),
);
power(
  "subterfuge",
  2,
  "smoke-screen",
  "Smoke Screen",
  "Fill a radius of 1 with smoke for three rounds. Blocks sight and ranged targeting through it for both sides; adjacent targeting remains possible. Twice per encounter.",
  zone("smoke"),
);
power(
  "subterfuge",
  3,
  "shadow-step",
  "Shadow Step",
  "Teleport up to 6 squares to visible empty ground, then gain 1 attack Boon for two turns. Once per encounter.",
  move("teleport", 6, {
    limit: 1,
    effects: [
      { kind: "move", mode: "teleport" },
      { kind: "buff", stats: { attack: 1 }, turns: 2 },
    ],
  }),
);
power(
  "wilderness",
  1,
  "snaring-roots",
  "Snaring Roots",
  "Create difficult ground in a radius of 1 for three rounds. Costs 2 movement per square for both sides. Twice per encounter.",
  zone("difficult"),
);
power(
  "wilderness",
  2,
  "field-replenishment",
  "Field Replenishment",
  "At camp or in town, replenish arrows, torches or food using their recipe and materials. Basic recipes are always known; crafting time is reduced by 25%.",
  {
    category: "passive",
    target: "self",
    effects: [],
    passive: { craftSpeed: 0.25 },
  },
);
power(
  "wilderness",
  3,
  "nightfall",
  "Nightfall",
  "Darken a radius of 2 for three rounds. Counters ordinary light; magical light wins. Conceal yourself for two turns. Once per encounter.",
  zone("darkness", {
    radius: 2,
    limit: 1,
    effects: [
      { kind: "zone", surface: "darkness", rounds: 3 },
      { kind: "buff", stats: { hidden: true }, turns: 2, self: true },
    ],
  }),
);
// Each calling earns a defining signature at levels 1, 3 and 7. Old choice IDs
// remain valid as historical receipts; all three old options map to this design.
const signatures = {
  arcanist: [
    ["arcane-reservoir", "Arcane Reservoir", "spirit-ward"],
    ["fold-space", "Fold Space", "shadow-step"],
    ["arcane-cataclysm", "Arcane Cataclysm", "sunburst"],
  ],
  blade: [
    ["duelists-tempo", "Duelist’s Tempo", "execution-edge"],
    ["whirling-steel", "Whirling Steel", "sweeping-blade"],
    ["relentless-edge", "Relentless Edge", "hunters-focus"],
  ],
  intellect: [
    ["battle-plan", "Battle Plan", "rally"],
    ["fault-line", "Fault Line", "expose-weakness"],
    ["perfect-timing", "Perfect Timing", "calculated-opening"],
  ],
  leader: [
    ["commanding-presence", "Commanding Presence", "rally"],
    ["reposition-company", "Reposition Company", "rescue-line"],
    ["seize-the-moment", "Seize the Moment", "second-wind"],
  ],
  odd: [
    ["unseen-angle", "Unseen Angle", "vanish"],
    ["impossible-exchange", "Impossible Exchange", "spirit-crossing"],
    ["borrowed-night", "Borrowed Night", "nightfall"],
  ],
  protector: [
    ["sworn-guardian", "Sworn Guardian", "guardian-link"],
    ["unyielding-wall", "Unyielding Wall", "adamant-ward"],
    ["company-bulwark", "Company Bulwark", "hold-the-line"],
  ],
  shadow: [
    ["fade-away", "Fade Away", "vanish"],
    ["behind-the-lines", "Behind the Lines", "shadow-step"],
    ["assassins-moment", "Assassin’s Moment", "execution-edge"],
  ],
  shepherd: [
    ["life-thread", "Life Thread", "mending-touch"],
    ["sanctuary", "Sanctuary", "renewal-circle"],
    ["restore-the-broken", "Restore the Broken", "renew-flesh"],
  ],
  unbalanced: [
    ["reckless-momentum", "Reckless Momentum", "driving-cut"],
    ["break-their-line", "Break Their Line", "force-hand"],
    ["storm-of-blows", "Storm of Blows", "sweeping-blade"],
  ],
  warden: [
    ["quarry-mark", "Quarry Mark", "barbed-arrow"],
    ["watchers-focus", "Watcher’s Focus", "hunters-focus"],
    ["wardens-volley", "Warden’s Volley", "piercing-flight"],
  ],
};
for (const [cls, rows] of Object.entries(signatures))
  rows.forEach(([slug, name, base], i) => {
    const template = definitions.find((p) => p.id === `power-${base}`);
    definitions.push({
      ...structuredClone(template),
      id: `power-signature-${slug}`,
      name,
      classId: `class-${cls}`,
      minimumLevel: [1, 3, 7][i],
      rank: 0,
      cost: 4,
      discipline: null,
      signature: true,
      description: template.description,
    });
  });
definitions.push(
  {
    id: "power-use-smoke",
    name: "Throw smoke flask",
    description:
      "Use a smoke supply to obscure a radius of 1 for three rounds. Supply checked after use.",
    gamePower: true,
    universal: true,
    category: "maneuver",
    target: "ground",
    range: 4,
    radius: 1,
    supply: "item-smoke-supply",
    effects: [{ kind: "zone", surface: "smoke", rounds: 3 }],
  },
  {
    id: "power-use-flash",
    name: "Throw flash powder",
    description:
      "Consume flash powder to reveal and illuminate a radius of 2 for three rounds.",
    gamePower: true,
    universal: true,
    category: "maneuver",
    target: "ground",
    range: 5,
    radius: 2,
    supply: "item-flash-powder",
    consume: true,
    effects: [
      { kind: "zone", surface: "light", rounds: 3 },
      { kind: "reveal" },
    ],
  },
  {
    id: "power-use-ward",
    name: "Break ward charm",
    description: "Consume a ward charm to absorb 6 damage for two turns.",
    gamePower: true,
    universal: true,
    category: "maneuver",
    target: "self",
    supply: "item-ward-charm",
    consume: true,
    effects: [{ kind: "barrier", amount: 6, turns: 2 }],
  },
);
// Append after the original designs so origin grants and legacy mappings stay stable.
addStarterPowers({ power, strike, aid, buff, zone, move, condition });
expandSignatures(definitions);
makeAtWill(definitions);
export const POWERS = Object.freeze(
  Object.fromEntries(definitions.map((p) => [p.id, Object.freeze(p)])),
);
export const GAME_POWER_RECORDS = definitions.map((p) => ({
  id: p.id,
  name: p.name,
  kind: "ability",
  gamePower: true,
  universal: !!p.universal,
  minimumLevel: p.minimumLevel,
  cost: p.cost,
  purchasePolicy: "once",
  classId: p.classId,
  requirements: p.discipline
    ? [{ kind: "discipline", id: p.discipline, rank: p.rank }]
    : [],
  reference: {
    flavor: [],
    rules: {
      details: [
        {
          label: "Action",
          value: {
            main: "Main Action",
            maneuver: "Maneuver",
            passive: "Passive",
          }[p.category],
        },
      ],
      body: [{ text: p.description }],
      notes: [],
    },
  },
}));
export function gameCatalog(source) {
  if (source.gamePowers) return source;
  const c = structuredClone(source);
  c.gamePowers = true;
  c.choices.push(...structuredClone(GAME_POWER_RECORDS));
  c.inventory.equipment.push(...structuredClone(RECIPE_ITEMS));
  for (const p of Object.values(POWERS))
    c.inventory.acquisitions.push({
      id: p.id,
      source: { path: `game/powers/${p.id}`, sha256: null, revision: 1 },
      items:
        p.grants ??
        (p.weapon === "melee"
          ? ["item-ordinary-melee-weapon"]
          : p.weapon === "ranged"
            ? ["item-ordinary-ranged-weapon", "item-ammunition-bundle"]
            : p.id === "power-field-artisan"
              ? ["item-craft-tools"]
              : p.id === "power-field-care"
                ? ["item-field-dressing"]
                : []),
      recipes: [],
    });

  for (const record of c.choices) {
    if (record.kind === "class")
      for (const level of [1, 3, 7])
        record.signatures[level].push(
          ...definitions
            .filter((p) => p.classId === record.id && p.minimumLevel === level)
            .map((p) => p.id),
        );
    if (record.kind === "origin") {
      record.legacyPairCount = record.pairs.length;
      record.pairs.push(
        ...record.pairs.map((pair) => ({
          ...pair,
          abilityId: definitions.find(
            (p) => p.discipline === pair.disciplineId && p.rank === 1,
          ).id,
          gamePower: true,
        })),
      );
    }
  }
  return c;
}
const legacyGeneralPowers = {
  "ability-a-name-worth-knowing": "power-rally",
  "ability-a-party-piece": "power-draw-attention",
  "ability-another-tongue": "power-read-the-depths",
  "ability-catch-a-falling-friend": "power-rescue-line",
  "ability-catch-that": "power-spirit-ward",
  "ability-hold-a-conversation": "power-draw-attention",
  "ability-keep-your-bearings": "power-read-the-depths",
  "ability-look-over-here": "power-draw-attention",
  "ability-message-by-heart": "power-rally",
  "ability-notice-the-human-detail": "power-expose-weakness",
  "ability-pack-with-purpose": "power-field-replenishment",
  "ability-quick-exit": "power-fleet-step",
  "ability-tell-a-worthy-story": "power-rally",
  "ability-the-impossible-escape": "power-shadow-step",
  "ability-the-last-word": "power-execution-edge",
  "ability-the-lucky-trinket": "power-calculated-opening",
  "ability-the-mountain-walks": "power-iron-skin",
  "ability-the-strong-arm": "power-driving-cut",
  "ability-the-web-of-whispers": "power-read-the-depths",
  "ability-touched-by-the-divine": "power-mending-touch",
};
export function mappedPower(id, C) {
  if (legacyGeneralPowers[id]) return legacyGeneralPowers[id];
  if (POWERS[id]) return id;
  const old = C.choices.find((c) => c.id === id);
  if (!old || old.universal) return id;
  if (old.classId)
    return (
      definitions.find(
        (p) => p.classId === old.classId && p.minimumLevel === old.minimumLevel,
      )?.id ?? id
    );
  const discipline = old.requirements?.find((r) => r.kind === "discipline");
  if (discipline)
    return (
      definitions.find(
        (p) => p.discipline === discipline.id && p.rank === discipline.rank,
      )?.id ?? id
    );
  return id;
}
export function isTrainable(c, C) {
  return (
    !C.gamePowers ||
    c.kind !== "ability" ||
    !!POWERS[c.id] ||
    [
      "ability-wear-light-armor",
      "ability-wear-medium-armor",
      "ability-wear-heavy-armor",
      "ability-conditioned-body",
      "ability-one-more-dawn",
    ].includes(c.id)
  );
}

export function gamePurchaseEligibility(record, state, C, R, selection) {
  const result = R.purchaseEligibility(record, state, C.choices, selection);
  if (
    C.gamePowers &&
    POWERS[record.id] &&
    state.abilities.some((id) => mappedPower(id, C) === record.id)
  )
    return {
      ...result,
      eligible: false,
      reasons: [
        ...result.reasons,
        {
          code: "already-known",
          text: "Already known, including converted legacy training.",
        },
      ],
    };
  const power = POWERS[record.id];
  if (C.gamePowers && power?.category === "passive") {
    const learned = state.abilities
      .map((id) => POWERS[mappedPower(id, C)])
      .filter(Boolean);
    const recipes = new Set([
      ...(state.recipes ?? []),
      ...learned.flatMap((p) => p.recipes ?? []),
    ]);
    const speed = Math.max(
      0,
      ...learned.map((p) => p.passive?.craftSpeed ?? 0),
    );
    if (
      power.recipes?.every((id) => recipes.has(id)) &&
      (power.passive?.craftSpeed ?? 0) <= speed
    )
      return {
        ...result,
        eligible: false,
        reasons: [
          ...result.reasons,
          {
            code: "redundant-training",
            text: "These recipes and crafting benefits are already learned.",
          },
        ],
      };
  }
  return result;
}
