// Class signatures are build starters, with three choices at each tier.
// Existing IDs remain valid. New variants combine an action with a persistent
// specialization; these bonuses apply automatically, with no encounter counters.
export function expandSignatures(definitions) {
  const paths = {
    arcanist: [
      { barrier: 1 },
      ["pyre", "Pyre Adept", "flame-fan", { fire: 1, burning: 1 }],
      ["rift", "Rift Weaver", "crosswind", { spell: 1, movement: 1 }],
    ],
    blade: [
      { critical: 2 },
      ["sanguine", "Sanguine Edge", "low-blow", { bleeding: 1, killHeal: 1 }],
      [
        "reaver",
        "Reaver’s Reach",
        "sweeping-blade",
        { physical: 1, impact: 1 },
      ],
    ],
    intellect: [
      { flanker: 1 },
      ["dismantler", "Dismantler", "brittle-armor", { shatter: 2, impact: 1 }],
      [
        "anticipation",
        "Perfect Anticipation",
        "calculated-opening",
        { barrier: 1, critical: 1 },
      ],
    ],
    leader: [
      { rallyMove: 1 },
      ["marshal", "Shield Marshal", "guardian-link", { barrier: 2 }],
      ["warmaster", "War Master", "press-advantage", { flanker: 2 }],
    ],
    odd: [
      { ambush: 2 },
      [
        "mirror",
        "Mirror Walker",
        "spirit-crossing",
        { movement: 1, critical: 1 },
      ],
      ["hex", "Hex Weaver", "fracture-focus", { mental: 1, poisoned: 1 }],
    ],
    protector: [
      { reduction: 1 },
      [
        "bastion",
        "Living Bastion",
        "reinforced-guard",
        { barrier: 2, movement: -1 },
      ],
      ["breaker", "Line Breaker", "shoulder-check", { impact: 3, physical: 1 }],
    ],
    shadow: [
      { ambush: 2 },
      ["venom", "Venom Fang", "low-blow", { venom: 1 }],
      [
        "executioner",
        "Executioner",
        "execution-edge",
        { critical: 2, flanker: 1 },
      ],
    ],
    shepherd: [
      { heal: 1 },
      [
        "bloodweaver",
        "Blood Weaver",
        "spirit-needle",
        { killHeal: 2, mental: 1 },
      ],
      [
        "sanctuary",
        "Sanctuary Keeper",
        "spirit-ward",
        { healingWard: 2, barrier: 1 },
      ],
    ],
    unbalanced: [
      { impact: 2 },
      [
        "berserker",
        "Berserker",
        "sweeping-blade",
        { physical: 2, reduction: -1 },
      ],
      ["tempest", "Living Tempest", "static-arc", { lightning: 1, chain: 1 }],
    ],
    warden: [
      { bleeding: 1 },
      ["frosthunter", "Frost Hunter", "leg-shot", { shatter: 2, cold: 1 }],
      [
        "pathfinder",
        "Pathfinder",
        "bounding-step",
        { moveDamage: 2, movement: 1 },
      ],
    ],
  };
  const labels = {
    critical: "Strong-hit damage",
    fire: "fire damage",
    physical: "physical damage",
    mental: "mental damage",
    cold: "cold damage",
    lightning: "lightning damage",
    spell: "spell damage",
    movement: "movement",
    impact: "wall impact",
    burning: "Burning applied",
    bleeding: "Bleeding applied",
    poisoned: "Poisoned applied",
    venom: "Poisoned on weapon hits",
    barrier: "barriers",
    reduction: "damage reduction",
    heal: "HP healing",
    killHeal: "HP on a kill",
    ambush: "damage from concealment",
    flanker: "damage when another ally is adjacent to the target",
    shatter: "damage against Freezing targets",
    chain: "lightning chain damage on wet targets",
    rallyMove: "movement granted by healing",
    healingWard: "barrier granted by healing",
    moveDamage: "damage after moving this turn",
  };
  const bonusText = (stats) =>
    " Always active: " +
    Object.entries(stats)
      .map(([k, n]) => `${n > 0 ? "+" : ""}${n} ${labels[k]}`)
      .join("; ") +
    ".";
  for (const [cls, [baseline, ...variants]] of Object.entries(paths)) {
    for (const [i, level] of [1, 3, 7].entries()) {
      const scale = i + 1;
      const stats = (s) =>
        Object.fromEntries(
          Object.entries(s).map(([k, v]) => [
            k,
            v < 0 || ["movement", "rallyMove", "venom"].includes(k)
              ? v
              : v * scale,
          ]),
        );
      const existing = definitions.find(
        (p) => p.classId === `class-${cls}` && p.minimumLevel === level,
      );
      existing.buildStats = stats(baseline);
      existing.description += bonusText(existing.buildStats);
      for (const [slug, name, base, modifiers] of variants) {
        const template = definitions.find((p) => p.id === `power-${base}`);
        const buildStats = stats(modifiers);
        definitions.push({
          ...structuredClone(template),
          id: `power-signature-${cls}-${slug}-${level}`,
          name: `${name}${level > 1 ? ` ${["", "II", "III"][i]}` : ""}`,
          discipline: null,
          rank: 0,
          classId: `class-${cls}`,
          signature: true,
          cost: 4,
          minimumLevel: level,
          grants: [],
          buildStats,
          description: template.description + bonusText(buildStats),
        });
      }
    }
  }
}

export function makeAtWill(definitions) {
  for (const p of definitions) {
    delete p.limit;
    delete p.restLimit;
    p.description = p.description
      .replace(
        /(?:Once|Twice|One use|Two uses|Three uses) per (?:encounter|rest)\.?/gi,
        "",
      )
      .replace(/\d+ uses per completed 8-hour sleep\./g, "")
      .replace(/At most once per recipient per encounter\./g, "")
      .trim();
    if (p.effects.some((e) => e.kind === "resource")) {
      p.category = "main"; // One Action buys one ally resource; never an extra-action loop.
      p.description += " Costs an Action. Cannot stack queued bonus Maneuvers.";
    }
    if (p.effects.some((e) => e.kind === "wound")) {
      p.supply = "item-restoration-draught";
      p.consume = true;
      p.description += " Consumes a restoration draught.";
    } else if (
      p.field &&
      p.effects.some((e) => ["heal", "stabilize", "cleanse"].includes(e.kind))
    ) {
      p.fieldSupply = "item-field-dressing";
      p.description +=
        " Outside combat, checks a field dressing supply after use.";
    }
    if (p.category !== "passive" && !p.universal)
      p.description += " At will; pay the displayed action cost.";
  }
}
