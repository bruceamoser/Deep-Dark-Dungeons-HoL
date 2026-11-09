// Additional game-owned branches at rank 1. Origins keep their original grant;
// these purchases provide alternatives after that grant, including 1-DP choices.
// All effects use the same targeting, action, duration and resource rules as the
// rest of the catalog. Purchasing another technique does not grant another weapon.
export function addStarterPowers({
  power,
  strike,
  aid,
  buff,
  zone,
  move,
  condition,
}) {
  const self = (effects, extra = {}) =>
    aid(effects, { target: "self", ...extra });
  const cleanse = (keys, amount = 1) => ({ kind: "cleanse", keys, amount });
  const barrier = (amount, turns = 2) => ({ kind: "barrier", amount, turns });
  const damage = (type, amount) => ({ kind: "damage", type, amount });
  const melee = (effects, extra = {}) =>
    strike("brawn", "physical", {
      range: 1,
      weapon: "melee",
      effects,
      ...extra,
    });
  const bow = (effects, extra = {}) =>
    strike("agility", "physical", {
      range: 6,
      weapon: "ranged",
      effects,
      ...extra,
    });
  const study = (recipes, extra = {}) => ({
    category: "passive",
    target: "self",
    effects: [],
    recipes,
    ...extra,
  });
  const add = (discipline, cost, slug, name, description, spec) => {
    const limit =
      spec.category === "passive" || spec.restLimit ? 0 : (spec.limit ?? 2);
    const cadence = spec.restLimit
      ? ` ${spec.restLimit} uses per completed 8-hour sleep.`
      : limit
        ? ` ${limit === 1 ? "Once" : "Twice"} per encounter.`
        : "";
    power(discipline, 1, slug, name, description + cadence, {
      ...spec,
      limit,
      cost,
      grants: [],
    });
  };

  add(
    "arms",
    1,
    "measured-cut",
    "Measured Cut",
    "A readied melee weapon deals 2/3/4 physical damage. Gain 1 defense Boon for this turn.",
    melee(
      [
        damage("physical", [2, 3, 4]),
        { ...buff({ defense: 1 }, 1), self: true },
      ],
      { limit: 1 },
    ),
  );
  add(
    "arms",
    2,
    "hamstring",
    "Hamstring",
    "A readied melee weapon deals 1/2/3 physical damage and applies Slowed 1.",
    melee([damage("physical", [1, 2, 3]), condition("slowed")]),
  );
  add(
    "arms",
    2,
    "pommel-rattle",
    "Pommel Rattle",
    "A readied melee weapon deals 1/2/3 physical damage and applies Dazed 1.",
    melee([damage("physical", [1, 2, 3]), condition("dazed")]),
  );
  add(
    "arms",
    3,
    "blade-ward",
    "Blade Ward",
    "Gain 1 defense Boon for two turns and prepare a counter against the next adjacent attacker. Countering spends your Reaction and requires a readied melee weapon.",
    self([buff({ defense: 1 }), { kind: "counter" }]),
  );

  add(
    "armor",
    1,
    "plated-advance",
    "Plated Advance",
    "Gain 2 movement and reduce incoming damage by 1 for this turn.",
    self([buff({ movement: 2, reduction: 1 }, 1)], { limit: 1 }),
  );
  add(
    "armor",
    2,
    "clear-visor",
    "Clear Visor",
    "Reduce temporary Blinded by 2 and absorb the next 2 damage for two turns.",
    self([cleanse(["blinded"], 2), barrier(2)]),
  );
  add(
    "armor",
    2,
    "reinforced-guard",
    "Reinforced Guard",
    "Spend your Action to absorb the next 5 damage for two turns.",
    self([barrier(5)], { category: "main" }),
  );
  add(
    "armor",
    3,
    "deflecting-stance",
    "Deflecting Stance",
    "Gain 1 defense Boon and reduce incoming damage by 1 for two turns.",
    self([buff({ defense: 1, reduction: 1 })]),
  );

  add(
    "athletics",
    1,
    "quick-roll",
    "Quick Roll",
    "Reposition along a clear walking route of 1 square without provoking movement attacks. Reduce temporary Slowed by 1.",
    move("route", 1, {
      limit: 1,
      effects: [{ kind: "move", mode: "route" }, cleanse(["slowed"])],
    }),
  );
  add(
    "athletics",
    2,
    "shoulder-check",
    "Shoulder Check",
    "Push an adjacent enemy 2 squares straight away from you. Obstacles and occupied squares stop the push.",
    aid([{ kind: "push", amount: 2 }], {
      category: "main",
      target: "enemy",
      range: 1,
    }),
  );
  add(
    "athletics",
    2,
    "bounding-step",
    "Bounding Step",
    "Leap up to 2 squares to empty visible ground, crossing creatures and ground hazards but never walls. Gain 1 defense Boon for this turn.",
    move("leap", 2, {
      effects: [{ kind: "move", mode: "leap" }, buff({ defense: 1 }, 1)],
    }),
  );
  add(
    "athletics",
    3,
    "drag-to-safety",
    "Drag to Safety",
    "Pull an ally within 3 squares up to 2 squares toward you without provoking. They absorb the next 2 damage for two turns.",
    aid([{ kind: "pull", amount: 2 }, barrier(2)], {
      range: 3,
      otherOnly: true,
      limit: 1,
    }),
  );

  add(
    "calling",
    1,
    "wisp-lantern",
    "Wisp Lantern",
    "Illuminate one visible square within 4 squares for three rounds. Magical light counters darkness.",
    zone("light", { range: 4, radius: 0, spell: true, limit: 1 }),
  );
  add(
    "calling",
    2,
    "spectral-hand",
    "Spectral Hand",
    "Pull an enemy within 4 squares 1 square toward you. Obstacles and occupied squares stop the pull.",
    aid([{ kind: "pull", amount: 1 }], {
      category: "main",
      target: "enemy",
      spell: true,
    }),
  );
  add(
    "calling",
    2,
    "spirit-needle",
    "Spirit Needle",
    "Deal 2/3/4 mental damage to an enemy within 4 squares.",
    strike("reason", "mental", {
      range: 4,
      spell: true,
      effects: [damage("mental", [2, 3, 4])],
    }),
  );
  add(
    "calling",
    3,
    "ancestral-guidance",
    "Ancestral Guidance",
    "Grant an ally 1 attack Boon and 1 defense Boon for two turns.",
    aid([buff({ attack: 1, defense: 1 })], { spell: true, limit: 1 }),
  );

  add(
    "craft",
    1,
    "edge-honing",
    "Edge Honing",
    "Your next attack within two turns deals +1 damage. Does not stack with stronger damage bonuses.",
    self([buff({ damage: 1 })], { limit: 1 }),
  );
  add(
    "craft",
    2,
    "apothecary-apprentice",
    "Apothecary Apprentice",
    "Learn healing potion and field dressing recipes. Craft or replenish them from the recipe book; ingredients, tools and location requirements still apply.",
    study(["recipe-lesser-healing-bottle", "recipe-field-dressing"]),
  );
  add(
    "craft",
    2,
    "makeshift-screen",
    "Makeshift Screen",
    "Raise smoke in a radius of 1 within 4 squares for three rounds. Blocks sight and ranged targeting for both sides; adjacent targeting remains possible.",
    zone("smoke", { range: 4, limit: 1 }),
  );
  add(
    "craft",
    3,
    "repair-ward",
    "Repair Ward",
    "Spend your Action to let an adjacent ally absorb the next 5 damage for two turns.",
    aid([barrier(5)], { category: "main", range: 1, limit: 1 }),
  );

  add(
    "flame",
    1,
    "cinderlight",
    "Cinderlight",
    "Illuminate a radius of 1 within 3 squares for three rounds. Magical light counters darkness.",
    zone("light", { range: 3, spell: true, limit: 1 }),
  );
  add(
    "flame",
    2,
    "searing-mark",
    "Searing Mark",
    "Reduce an enemy’s physical DR by 1 for two turns, to a minimum of zero.",
    aid([buff({ dr: -1 })], { target: "enemy", spell: true }),
  );
  add(
    "flame",
    2,
    "flame-fan",
    "Flame Fan",
    "Deal 1/2/3 fire damage to enemies in a cone up to 3 squares. Allies are spared.",
    strike("knowledge", "fire", {
      target: "ground",
      shape: "cone",
      range: 3,
      spell: true,
      limit: 1,
      effects: [damage("fire", [1, 2, 3])],
    }),
  );
  add(
    "flame",
    3,
    "ash-veil",
    "Ash Veil",
    "Fill a radius of 1 within 4 squares with smoke for three rounds, obscuring both sides. Disengage for this turn; casting itself can provoke.",
    zone("smoke", {
      category: "maneuver",
      range: 4,
      spell: true,
      limit: 1,
      effects: [
        { kind: "zone", surface: "smoke", rounds: 3 },
        { ...buff({ disengage: true }, 1), self: true },
      ],
    }),
  );

  add(
    "frost",
    1,
    "cool-blood",
    "Cool Blood",
    "Reduce an ally’s temporary Burning by 2. Requires a target that is Burning.",
    aid([cleanse(["burning"], 2)], { range: 2, spell: true, limit: 1 }),
  );
  add(
    "frost",
    2,
    "rime-shell",
    "Rime Shell",
    "Absorb the next 3 damage you receive for two turns.",
    self([barrier(3)], { spell: true }),
  );
  add(
    "frost",
    2,
    "frost-patch",
    "Frost Patch",
    "Create difficult ground in a radius of 1 within 4 squares for three rounds. Each square costs 2 movement for both sides.",
    zone("difficult", { range: 4, spell: true }),
  );
  add(
    "frost",
    3,
    "brittle-armor",
    "Brittle Armor",
    "Apply Slowed 1 and reduce an enemy’s physical DR by 1 for two turns, to a minimum of zero.",
    aid([condition("slowed"), buff({ dr: -1 })], {
      category: "main",
      target: "enemy",
      spell: true,
    }),
  );

  add(
    "guard",
    1,
    "warning-call",
    "Warning Call",
    "Grant an ally within 3 squares 1 defense Boon through the end of their next turn.",
    aid([buff({ defense: 1 }, 1)], { range: 3, otherOnly: true, limit: 1 }),
  );
  add(
    "guard",
    2,
    "shielding-step",
    "Shielding Step",
    "Swap places with an adjacent ally without provoking movement attacks. You absorb the next 2 damage for two turns.",
    aid([{ kind: "swap" }, { ...barrier(2), self: true }], {
      range: 1,
      otherOnly: true,
    }),
  );
  add(
    "guard",
    2,
    "stand-firm",
    "Stand Firm",
    "Gain 1 physical DR for this turn. DR cannot exceed 3.",
    self([buff({ dr: 1 }, 1)], { limit: 1 }),
  );
  add(
    "guard",
    3,
    "guarded-retreat",
    "Guarded Retreat",
    "Grant an ally 2 movement and disengagement through the end of their next turn.",
    aid([buff({ movement: 2, disengage: true }, 1)], { otherOnly: true }),
  );

  add(
    "influence",
    1,
    "rouse",
    "Rouse",
    "Reduce an ally’s temporary Dazed by 1. Requires a target that is Dazed.",
    aid([cleanse(["dazed"])], { limit: 1 }),
  );
  add(
    "influence",
    2,
    "reassuring-word",
    "Reassuring Word",
    "Restore 2/3/4 HP to an ally within 3 squares. Usable in the field; does not heal wounds or restore Grit.",
    aid([{ kind: "heal", amount: [2, 3, 4] }], {
      category: "main",
      range: 3,
      attribute: "guile",
      restLimit: 2,
      field: true,
    }),
  );
  add(
    "influence",
    2,
    "demoralize",
    "Demoralize",
    "Apply 1 attack Bane to an enemy for two turns.",
    aid([buff({ attack: -1 })], { target: "enemy" }),
  );
  add(
    "influence",
    3,
    "press-advantage",
    "Press the Advantage",
    "Grant an ally 1 movement for two turns. Their next attack within that time deals +2 damage.",
    aid([buff({ movement: 1, damage: 2 })], { otherOnly: true, limit: 1 }),
  );

  add(
    "life",
    1,
    "vital-spark",
    "Vital Spark",
    "Restore 2 HP to an ally within 2 squares. Usable in the field; does not heal wounds or restore Grit.",
    aid([{ kind: "heal", amount: 2 }], {
      range: 2,
      spell: true,
      restLimit: 2,
      field: true,
    }),
  );
  add(
    "life",
    2,
    "cleanse-blood",
    "Cleanse Blood",
    "Reduce an ally’s temporary Poisoned and Bleeding by 2 each. Requires one of those conditions. Usable in the field.",
    aid([cleanse(["poisoned", "bleeding"], 2)], {
      category: "main",
      spell: true,
      restLimit: 3,
      field: true,
    }),
  );
  add(
    "life",
    2,
    "living-ward",
    "Living Ward",
    "Spend your Action to let an ally within 3 squares absorb the next 4 damage for two turns.",
    aid([barrier(4)], { category: "main", range: 3, spell: true }),
  );
  add(
    "life",
    3,
    "life-spring",
    "Life Spring",
    "Create a healing spring on one square for two rounds. An ally starting a turn there regains 2 HP. Does not heal wounds or restore Grit.",
    zone("healing", {
      radius: 0,
      spell: true,
      restLimit: 1,
      effects: [{ kind: "zone", surface: "healing", rounds: 2 }],
    }),
  );

  add(
    "marksmanship",
    1,
    "aiming-breath",
    "Aiming Breath",
    "Gain 1 attack Boon for this turn. Prepare before shooting; this Maneuver does not expend ammunition.",
    self([buff({ attack: 1 }, 1)], { limit: 1 }),
  );
  add(
    "marksmanship",
    2,
    "leg-shot",
    "Leg Shot",
    "A readied bow deals 1/2/3 physical damage and applies Slowed 1 within 6 squares. Uses ammunition.",
    bow([damage("physical", [1, 2, 3]), condition("slowed")]),
  );
  add(
    "marksmanship",
    2,
    "covering-shot",
    "Covering Shot",
    "A readied bow deals 2/3/4 physical damage and applies 1 attack Bane for two turns within 6 squares. Uses ammunition.",
    bow([damage("physical", [2, 3, 4]), buff({ attack: -1 })]),
  );
  add(
    "marksmanship",
    3,
    "point-blank-shot",
    "Point-Blank Shot",
    "A readied bow deals 2/4/6 physical damage to an enemy within 2 squares and pushes it 1 square away. Uses ammunition.",
    bow([damage("physical", [2, 4, 6]), { kind: "push", amount: 1 }], {
      range: 2,
    }),
  );

  add(
    "medicine",
    1,
    "clear-head",
    "Clear Head",
    "Reduce an adjacent ally’s temporary Dazed and Blinded by 1 each. Requires one of those conditions.",
    aid([cleanse(["dazed", "blinded"])], { range: 1, limit: 1 }),
  );
  add(
    "medicine",
    2,
    "field-antidote",
    "Field Antidote",
    "Reduce an adjacent ally’s temporary Poisoned by 2 and restore 2 HP. Usable in the field; does not heal wounds or restore Grit.",
    aid([cleanse(["poisoned"], 2), { kind: "heal", amount: 2 }], {
      category: "main",
      range: 1,
      restLimit: 2,
      field: true,
    }),
  );
  add(
    "medicine",
    2,
    "dressing-maker",
    "Dressing Maker",
    "Learn the field dressing recipe. All crafting takes 25% less time; this does not stack with other crafting speed bonuses. Ingredients and other recipe requirements still apply.",
    study(["recipe-field-dressing"], { passive: { craftSpeed: 0.25 } }),
  );
  add(
    "medicine",
    3,
    "emergency-care",
    "Emergency Care",
    "Stabilize an adjacent ally and restore 2/3/4 HP. Usable in the field; does not heal wounds or restore Grit.",
    aid([{ kind: "stabilize" }, { kind: "heal", amount: [2, 3, 4] }], {
      category: "main",
      range: 1,
      attribute: "knowledge",
      restLimit: 2,
      field: true,
    }),
  );

  add(
    "mind",
    1,
    "distract",
    "Distract",
    "Apply 1 attack Bane to an enemy through the end of its next turn.",
    aid([buff({ attack: -1 }, 1)], { target: "enemy", spell: true, limit: 1 }),
  );
  add(
    "mind",
    2,
    "mind-needle",
    "Mind Needle",
    "Deal 2/4/6 mental damage to an enemy within 4 squares.",
    strike("reason", "mental", { range: 4, spell: true }),
  );
  add(
    "mind",
    2,
    "shared-focus",
    "Shared Focus",
    "Grant an ally 1 attack Boon for two turns.",
    aid([buff({ attack: 1 })], { spell: true }),
  );
  add(
    "mind",
    3,
    "telekinetic-shove",
    "Telekinetic Shove",
    "Push an enemy within 4 squares 2 squares straight away from you and apply Slowed 1.",
    aid([{ kind: "push", amount: 2 }, condition("slowed")], {
      category: "main",
      target: "enemy",
      spell: true,
    }),
  );

  add(
    "radiance",
    1,
    "kindle-courage",
    "Kindle Courage",
    "Reduce an ally’s temporary Frightened by 1 and grant 1 defense Boon through the end of their next turn.",
    aid([cleanse(["frightened"]), buff({ defense: 1 }, 1)], {
      otherOnly: true,
      spell: true,
      limit: 1,
    }),
  );
  add(
    "radiance",
    2,
    "dawn-ray",
    "Dawn Ray",
    "Deal 2/4/6 radiant damage to an enemy within 5 squares.",
    strike("reason", "radiant", { spell: true }),
  );
  add(
    "radiance",
    2,
    "revealing-brand",
    "Revealing Brand",
    "Reveal an enemy within 4 squares and apply Blinded 1. Illuminate its current square for three rounds; the light does not follow it.",
    aid(
      [
        { kind: "reveal" },
        condition("blinded"),
        { kind: "zone", surface: "light", rounds: 3 },
      ],
      { category: "main", target: "enemy", spell: true },
    ),
  );
  add(
    "radiance",
    3,
    "halo-ward",
    "Halo Ward",
    "You and allies within 1 square absorb the next 3 damage each for two turns.",
    self([barrier(3)], { category: "main", radius: 1, spell: true, limit: 1 }),
  );

  add(
    "scholarship",
    1,
    "measured-advice",
    "Measured Advice",
    "Grant another ally 1 attack Boon through the end of their next turn.",
    aid([buff({ attack: 1 }, 1)], { otherOnly: true, limit: 1 }),
  );
  add(
    "scholarship",
    2,
    "threat-analysis",
    "Threat Analysis",
    "Apply 1 attack Bane to an enemy for two turns. Your next attack within two turns deals +1 damage.",
    aid([buff({ attack: -1 }), { ...buff({ damage: 1 }), self: true }], {
      target: "enemy",
    }),
  );
  add(
    "scholarship",
    2,
    "alchemical-primer",
    "Alchemical Primer",
    "Learn healing potion and smoke flask recipes. Craft or replenish them from the recipe book; ingredients, tools and location requirements still apply.",
    study(["recipe-lesser-healing-bottle", "recipe-smoke-flask"]),
  );
  add(
    "scholarship",
    3,
    "anatomists-strike",
    "Anatomist’s Strike",
    "A readied melee weapon deals 1/3/5 physical damage using Guile and applies Bleeding 1.",
    melee([damage("physical", [1, 3, 5]), condition("bleeding")], {
      attribute: "guile",
    }),
  );

  add(
    "storm",
    1,
    "tailwind",
    "Tailwind",
    "Grant another ally 2 movement through the end of their next turn.",
    aid([buff({ movement: 2 }, 1)], { otherOnly: true, spell: true, limit: 1 }),
  );
  add(
    "storm",
    2,
    "static-arc",
    "Static Arc",
    "Deal 1/2/3 lightning damage to enemies in a cone up to 3 squares. Allies are spared.",
    strike("knowledge", "lightning", {
      target: "ground",
      shape: "cone",
      range: 3,
      spell: true,
      effects: [damage("lightning", [1, 2, 3])],
    }),
  );
  add(
    "storm",
    2,
    "gust-screen",
    "Gust Screen",
    "Apply 1 attack Bane to an enemy within 5 squares for two turns.",
    aid([buff({ attack: -1 })], { target: "enemy", range: 5, spell: true }),
  );
  add(
    "storm",
    3,
    "storm-hop",
    "Storm Hop",
    "Leap up to 3 squares to empty visible ground, crossing creatures and hazards but never walls. Your next attack within two turns deals +2 damage. Casting can provoke.",
    move("leap", 3, {
      spell: true,
      limit: 1,
      effects: [{ kind: "move", mode: "leap" }, buff({ damage: 2 })],
    }),
  );

  add(
    "subterfuge",
    1,
    "sidestep",
    "Sidestep",
    "Reposition along a clear walking route of 1 square without provoking movement attacks. Gain 1 defense Boon for this turn.",
    move("route", 1, {
      limit: 1,
      effects: [{ kind: "move", mode: "route" }, buff({ defense: 1 }, 1)],
    }),
  );
  add(
    "subterfuge",
    2,
    "pocket-sand",
    "Pocket Sand",
    "Apply Blinded 1 to an adjacent enemy.",
    aid([condition("blinded")], {
      category: "main",
      target: "enemy",
      range: 1,
    }),
  );
  add(
    "subterfuge",
    2,
    "low-blow",
    "Low Blow",
    "A readied melee weapon deals 1/2/3 physical damage using Guile and applies Bleeding 1.",
    melee([damage("physical", [1, 2, 3]), condition("bleeding")], {
      attribute: "guile",
    }),
  );
  add(
    "subterfuge",
    3,
    "escape-route",
    "Escape Route",
    "Reposition along a clear walking route of up to 3 squares without provoking. Become concealed for this turn; attacking or taking damage breaks concealment.",
    move("route", 3, {
      limit: 1,
      effects: [{ kind: "move", mode: "route" }, buff({ hidden: true }, 1)],
    }),
  );

  add(
    "wilderness",
    1,
    "brush-cover",
    "Brush Cover",
    "Become concealed and gain 1 defense Boon for this turn. Enemies beyond 1 square cannot target you; attacking or taking damage breaks concealment.",
    self([buff({ hidden: true, defense: 1 }, 1)], { limit: 1 }),
  );
  add(
    "wilderness",
    2,
    "briar-lash",
    "Briar Lash",
    "Deal 1/3/5 physical damage to an enemy within 3 squares and pull it 1 square toward you.",
    strike("reason", "physical", {
      range: 3,
      spell: true,
      effects: [damage("physical", [1, 3, 5]), { kind: "pull", amount: 1 }],
    }),
  );
  add(
    "wilderness",
    2,
    "forager-remedies",
    "Forager Remedies",
    "Greatly improves finding medicinal materials and food when foraging. Learn field dressing and healing potion recipes. Craft or replenish them from the recipe book; ingredients, tools and location requirements still apply.",
    study(["recipe-field-dressing", "recipe-lesser-healing-bottle"]),
  );
  add(
    "wilderness",
    3,
    "hunting-snare",
    "Hunting Snare",
    "Place a spectral snare on one square within 3 squares for three rounds. The first creature crossing it suffers 5 mental damage. Can harm either side.",
    zone("trap", { radius: 0, range: 3 }),
  );

  // General training remains available even if both origins grant one discipline.
  add(
    null,
    1,
    "catch-breath",
    "Catch Breath",
    "Restore 2 of your own HP. Usable in the field; does not heal wounds or restore Grit.",
    self([{ kind: "heal", amount: 2 }], { restLimit: 2, field: true }),
  );
  add(
    null,
    1,
    "watchful-stance",
    "Watchful Stance",
    "Gain 1 defense Boon for this turn.",
    self([buff({ defense: 1 }, 1)], { limit: 1 }),
  );
  add(
    null,
    2,
    "step-aside",
    "Step Aside",
    "Reposition along a clear walking route of up to 2 squares without provoking movement attacks.",
    move("route", 2, { limit: 1 }),
  );
  add(
    null,
    2,
    "focused-blow",
    "Focused Blow",
    "Your next attack within two turns deals +2 damage. Does not stack with stronger damage bonuses.",
    self([buff({ damage: 2 })], { limit: 1 }),
  );
  add(
    null,
    3,
    "cover-companion",
    "Cover a Companion",
    "An adjacent ally absorbs the next 3 damage for two turns.",
    aid([barrier(3)], { range: 1, otherOnly: true }),
  );
  add(
    null,
    3,
    "camp-apothecary",
    "Camp Apothecary",
    "Learn field dressing and healing potion recipes. Use the recipe book to craft or replenish them; healing potions require town, a mixing kit and ingredients.",
    study(["recipe-field-dressing", "recipe-lesser-healing-bottle"]),
  );
}
