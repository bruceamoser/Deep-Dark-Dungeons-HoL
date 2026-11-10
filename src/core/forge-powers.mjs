// Techniques earned at intersections of discipline paths. Pure effect records;
// the shared combat resolver supplies targeting, turns, supplies, wounds and VFX.
export function addForgePowers(definitions) {
  const damage = (type, amount) => ({ kind: "damage", type, amount });
  const status = (key, rating) => ({ kind: "condition", key, rating });
  const barrier = (amount, turns = 2) => ({ kind: "barrier", amount, turns });
  const buff = (stats, turns = 2) => ({ kind: "buff", stats, turns });
  const base = {
    category: "main",
    target: "enemy",
    attribute: "knowledge",
    range: 5,
    effects: [],
    forgePower: true,
  };
  const add = (slug, name, description, spec) =>
    definitions.push({
      ...base,
      id: `power-forge-${slug}`,
      name,
      description,
      minimumLevel: 1,
      cost: 0,
      gamePower: true,
      ...spec,
    });
  const bow = (effects = [], extra = {}) => ({
    weapon: "ranged",
    attribute: "agility",
    range: 4,
    forgeProfile: "ranged",
    effects: [damage("physical", [1, 1, 2]), ...effects],
    ...extra,
  });
  const blade = (effects = [], extra = {}) => ({
    weapon: "melee",
    attribute: "brawn",
    range: 1,
    forgeProfile: "melee",
    effects: [damage("physical", [1, 1, 2]), ...effects],
    ...extra,
  });
  const spell = (type, amount, effects = [], extra = {}) => ({
    spell: true,
    effects: [damage(type, amount), ...effects],
    ...extra,
  });
  const aid = (effects, extra = {}) => ({
    target: "ally",
    range: 4,
    category: "maneuver",
    effects,
    ...extra,
  });
  const zone = (surface, rounds = 3, radius = 1) => ({
    target: "ground",
    range: 5,
    radius,
    spell: true,
    effects: [{ kind: "zone", surface, rounds }],
  });
  add(
    "unarmed",
    "Unarmed Strike",
    "A fallback strike for 1/1/1 physical damage.",
    {
      universal: true,
      attribute: "brawn",
      range: 1,
      effects: [damage("physical", [1, 1, 1])],
    },
  );
  add(
    "shot",
    "Bow Attack",
    "Loose an arrow using your learned bow profile. Each arrow checks ammunition.",
    bow(),
  );
  add(
    "strike",
    "Melee Attack",
    "Strike using your learned melee profile.",
    blade(),
  );
  add(
    "twin-shot",
    "Twin Shot",
    "Shoot two arrows at one target with one Action. Each arrow rolls separately and checks ammunition.",
    bow([], { shots: 2 }),
  );
  add(
    "battering-cut",
    "Battering Cut",
    "Strike with a melee weapon and push the target 3 squares. Walls cause collision damage.",
    blade([{ kind: "push", amount: 3 }]),
  );
  add(
    "flaming-arrow",
    "Flaming Arrow",
    "A bursting fire arrow strikes enemies in a radius of 1 within 6 squares and applies Burning 2. Uses the bow profile and ammunition. Allies are spared.",
    bow([status("burning", 2)], { damageType: "fire", target:"ground", radius:1, range:6 }),
  );
  add(
    "thorn-arrow",
    "Thorn Arrow",
    "A thorn arrow bursts into a radius of 1 within 6 squares, applying Slowed 2 and Bleeding 1 to enemies. Uses the bow profile and ammunition. Allies are spared.",
    bow([status("slowed", 2), status("bleeding", 1)], {target:"ground",radius:1,range:6}),
  );
  add(
    "renewing-grove",
    "Renewing Grove",
    "Create a healing circle and shelter companions in it with a 5-point barrier.",
    {
      ...zone("healing", 4),
      effects: [{ kind: "zone", surface: "healing", rounds: 4 }, barrier(5)],
    },
  );
  add(
    "vital-surgery",
    "Vital Surgery",
    "Restore 4/6/9 HP, stabilize a dying companion and remove two temporary Bleeding/Poisoned severity. Field dressing required outside combat.",
    aid(
      [
        { kind: "heal", amount: [4, 6, 9] },
        { kind: "stabilize" },
        { kind: "cleanse", keys: ["bleeding", "poisoned"], amount: 2 },
      ],
      {
        category: "main",
        attribute: "reason",
        field: true,
        fieldSupply: "item-field-dressing",
      },
    ),
  );
  add(
    "purifying-light",
    "Purifying Light",
    "Restore 3/5/7 HP and remove two temporary Dazed, Frightened and Poisoned severity.",
    aid(
      [
        { kind: "heal", amount: [3, 5, 7] },
        {
          kind: "cleanse",
          keys: ["dazed", "frightened", "poisoned"],
          amount: 2,
        },
      ],
      {
        category: "main",
        spell: true,
        field: true,
        fieldSupply: "item-field-dressing",
      },
    ),
  );
  add(
    "aurora-ward",
    "Aurora Ward",
    "Grant a 9-point barrier and remove three temporary Burning/Freezing severity.",
    aid(
      [
        barrier(9),
        { kind: "cleanse", keys: ["burning", "freezing"], amount: 3 },
      ],
      { spell: true, field: true },
    ),
  );
  add(
    "winter-spirit",
    "Winter Spirit",
    "A spirit strikes for 3/5/7 cold damage and applies Freezing 2.",
    spell("cold", [3, 5, 7], [status("freezing", 2)]),
  );
  add(
    "psychic-crossing",
    "Psychic Crossing",
    "Swap places with a companion and grant both a 6-point barrier.",
    aid([{ kind: "swap" }, barrier(6), { ...barrier(6), self: true }], {
      range: 7,
      spell: true,
      otherOnly: true,
    }),
  );
  add(
    "phantom-knife",
    "Phantom Knife",
    "Strike for 3/5/7 mental damage and become concealed for two turns. Attacking or taking damage reveals you.",
    spell("mental", [3, 5, 7], [{ ...buff({ hidden: true }), self: true }], {
      range: 3,
    }),
  );
  add(
    "shadow-dancer",
    "Shadow Dancer",
    "Teleport up to 6 squares to visible empty ground, then gain concealment and 2 movement.",
    {
      category: "maneuver",
      target: "ground",
      range: 6,
      effects: [
        { kind: "move", mode: "teleport" },
        buff({ hidden: true, movement: 2 }, 1),
      ],
    },
  );
  add(
    "thunder-charge",
    "Thunder Charge",
    "Strike in melee for 3/5/7 lightning damage and drive the target back 4 squares.",
    spell("lightning", [3, 5, 7], [{ kind: "push", amount: 4 }], {
      attribute: "brawn",
      range: 1,
    }),
  );
  add(
    "firestorm",
    "Firestorm",
    "A radius-one blast deals 3/5/7 fire damage, applies Burning 2 and pushes enemies 2 squares.",
    spell(
      "fire",
      [3, 5, 7],
      [status("burning", 2), { kind: "push", amount: 2 }],
      { radius: 1 },
    ),
  );
  add(
    "iron-cleave",
    "Iron Cleave",
    "Sweep adjacent enemies using your melee profile and gain a 6-point barrier.",
    blade([{ ...barrier(6), self: true }], { radius: 1 }),
  );
  add(
    "bastion",
    "Bastion",
    "Give a companion a 10-point barrier and prepare to intercept their next hit while adjacent, spending your Reaction.",
    aid([barrier(10), { kind: "guard" }]),
  );
  add(
    "rallying-bulwark",
    "Rallying Bulwark",
    "Protect nearby companions with 6-point barriers and +1 movement for their next turn.",
    {
      target: "self",
      radius: 2,
      category: "main",
      range: 0,
      effects: [barrier(6), buff({ movement: 1 }, 1)],
    },
  );
  add(
    "battle-plan",
    "Battle Plan",
    "Grant nearby companions one attack Boon and a 4-point barrier for two turns.",
    {
      target: "self",
      radius: 2,
      range: 0,
      effects: [buff({ attack: 1 }), barrier(4)],
    },
  );
  add(
    "alchemical-insight",
    "Alchemical Insight",
    "Learn ward charm and restoration draught recipes. Crafting takes 50% less time.",
    {
      category: "passive",
      target: "self",
      effects: [],
      recipes: ["recipe-ward-charm", "recipe-restoration-draught"],
      passive: { craftSpeed: 0.5 },
    },
  );
  add(
    "tempered-edge",
    "Tempered Edge",
    "Prepare your next attack for +5 damage and receive a 5-point barrier.",
    aid([buff({ damage: 5 }), barrier(5)], { target: "self", range: 0 }),
  );
  add(
    "furnace-blade",
    "Furnace Blade",
    "Strike with a flaming melee weapon, apply Burning 2 and push the enemy 2 squares.",
    blade([status("burning", 2), { kind: "push", amount: 2 }], {
      damageType: "fire",
    }),
  );
  add(
    "armored-volley",
    "Armored Volley",
    "Shoot two arrows at one target and gain a 5-point barrier.",
    bow([{ ...barrier(5), self: true }], { shots: 2 }),
  );
  add(
    "sheltering-thicket",
    "Sheltering Thicket",
    "Shield nearby companions for 7 and remove two temporary Slowed severity.",
    {
      target: "self",
      range: 0,
      radius: 2,
      effects: [barrier(7), { kind: "cleanse", keys: ["slowed"], amount: 2 }],
    },
  );
  add(
    "inspiring-renewal",
    "Inspiring Renewal",
    "Heal nearby companions for 3/5/7 HP and grant +1 movement. Field dressings are required outside combat.",
    {
      target: "self",
      range: 0,
      radius: 2,
      field: true,
      fieldSupply: "item-field-dressing",
      effects: [{ kind: "heal", amount: [3, 5, 7] }, buff({ movement: 1 }, 1)],
    },
  );
  add(
    "clinical-precision",
    "Clinical Precision",
    "Strike for 3/5/8 physical damage and apply Bleeding 2.",
    {
      attribute: "reason",
      range: 1,
      weapon: "melee",
      effects: [damage("physical", [3, 5, 8]), status("bleeding", 2)],
    },
  );
  add(
    "rune-lantern",
    "Rune Lantern",
    "Create lasting bright light and grant allies in its radius an 8-point barrier.",
    {
      ...zone("light", 6, 2),
      effects: [{ kind: "zone", surface: "light", rounds: 6 }, barrier(8)],
    },
  );
  add(
    "cinder-tempest",
    "Cinder Tempest",
    "Two fire arrows pierce a line using your bow profile, then apply Burning 2. One Action; one ammunition check per arrow.",
    bow([status("burning", 2)], {
      shots: 2,
      shape: "line",
      damageType: "fire",
      range: 6,
    }),
  );
  add(
    "unbroken-company",
    "Unbroken Company",
    "Grant nearby companions 12-point barriers, cleanse two temporary Dazed/Slowed severity and grant +1 movement.",
    {
      target: "self",
      range: 0,
      radius: 2,
      effects: [
        barrier(12),
        { kind: "cleanse", keys: ["dazed", "slowed"], amount: 2 },
        buff({ movement: 1 }, 1),
      ],
    },
  );
  add(
    "verdant-resurrection",
    "Verdant Renewal",
    "Restore 6/9/12 HP to nearby living companions, stabilize them, and remove three Bleeding/Poisoned severity. Does not resurrect the dead or remove wounds.",
    {
      target: "self",
      range: 0,
      radius: 2,
      field: true,
      fieldSupply: "item-field-dressing",
      effects: [
        { kind: "heal", amount: [6, 9, 12] },
        { kind: "stabilize" },
        { kind: "cleanse", keys: ["bleeding", "poisoned"], amount: 3 },
      ],
    },
  );
  add(
    "phantom-hunt",
    "Phantom Hunt",
    "A radius-two mental strike deals 4/6/9 damage, applies Dazed 1, and conceals the caster.",
    spell(
      "mental",
      [4, 6, 9],
      [status("dazed", 1), { ...buff({ hidden: true }), self: true }],
      { radius: 2, range: 6 },
    ),
  );
  add(
    "glacial-engine",
    "Glacial Engine",
    "Strike a radius-two area for 4/6/9 cold damage, apply Freezing 2 and leave difficult ground for four rounds.",
    spell(
      "cold",
      [4, 6, 9],
      [
        status("freezing", 2),
        { kind: "zone", surface: "difficult", rounds: 4 },
      ],
      { radius: 2 },
    ),
  );
  add(
    "sunfire-sanctuary",
    "Sunfire Sanctuary",
    "Grant nearby companions 12-point barriers, restore 4/6/9 HP and clear three temporary Burning severity.",
    {
      target: "self",
      range: 0,
      radius: 2,
      field: true,
      fieldSupply: "item-field-dressing",
      spell: true,
      effects: [
        barrier(12),
        { kind: "heal", amount: [4, 6, 9] },
        { kind: "cleanse", keys: ["burning"], amount: 3 },
      ],
    },
  );
  add(
    "thunderous-assault",
    "Thunderous Assault",
    "A melee shockwave strikes nearby enemies for 4/7/10 lightning damage and pushes them 3 squares.",
    spell("lightning", [4, 7, 10], [{ kind: "push", amount: 3 }], {
      weapon: "melee",
      attribute: "brawn",
      range: 1,
      radius: 1,
    }),
  );
  add(
    "silent-storm",
    "Silent Storm",
    "Two arrows strike one target using your bow profile, apply Dazed 1, and conceal the archer afterward.",
    bow([status("dazed", 1), { ...buff({ hidden: true }), self: true }], {
      shots: 2,
    }),
  );
  add(
    "fourfold-aegis",
    "Fourfold Aegis",
    "Shelter nearby living companions behind 16-point barriers, restore 5/8/12 HP, and clear three temporary Dazed, Frightened, Slowed and Poisoned severity.",
    {
      target: "self",
      range: 0,
      radius: 2,
      field: true,
      fieldSupply: "item-field-dressing",
      spell: true,
      effects: [
        barrier(16),
        { kind: "heal", amount: [5, 8, 12] },
        {
          kind: "cleanse",
          keys: ["dazed", "frightened", "slowed", "poisoned"],
          amount: 3,
        },
      ],
    },
  );
}
