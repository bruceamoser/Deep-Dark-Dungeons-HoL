// Deliberate computer-game adaptations. Original cards and IDs remain intact.
// Every class keeps three choices at each of its three signature milestones.
const strike = (attribute, range, damage, type = "physical", extra = {}) => ({
  category: "main",
  target: "enemy",
  attribute,
  range,
  damage,
  type,
  ...extra,
});
const support = (effects, extra = {}) => ({
  category: "maneuver",
  target: "ally",
  range: 4,
  tactic: effects,
  ...extra,
});
const self = (effects, extra = {}) =>
  support(effects, { target: "self", ...extra });
const cond = (key, weak, standard, strong) =>
  [weak, standard, strong].map((r) => (r ? [[key, r]] : []));
const melee = (extra = {}) =>
  strike("brawn", 1, [2, 3, 5], "physical", { weapon: "melee", ...extra });
const ranged = (extra = {}) =>
  strike("agility", 8, [2, 3, 5], "physical", { weapon: "ranged", ...extra });
const ward = (defense = 1) => ({ defense });
const opening = (attack = 1) => ({ attack, charges: 1 });
const cleanse = (keys, amount = 1) => ({ cleanse: keys, amount });
const rows = {
  arcanist: {
    "bent-trajectory": self(opening(2), { spell: true }),
    "deliberate-spark": strike("knowledge", 6, [3, 5, 7], "fire", {
      spell: true,
    }),
    "study-the-pattern": support(opening(2)),
    "cast-and-scatter": self({ movement: 3, disengage: true }, { spell: true }),
    "leave-a-window": support(
      { movement: 3, disengage: true },
      { spell: true },
    ),
    "arcane-deflection": support(ward(2), { spell: true }),
    "fold-the-distance": self({ defense: 3 }, { spell: true, once: true }),
    "choose-the-edge": strike("knowledge", 6, [5, 7, 9], "radiant", {
      spell: true,
    }),
    "open-the-circle": self(
      { attack: 2, charges: 1 },
      { area: 3, category: "main", spell: true, once: true },
    ),
  },
  blade: {
    "cut-and-turn": melee({ after: { defense: 1 } }),
    "pressure-point": melee({ conditions: cond("slowed", 1, 1, 2) }),
    "measured-guard": self(ward(2)),
    "sweeping-entry": melee({ push: [0, 1, 2], after: { movement: 1 } }),
    "return-stroke": self({ riposte: true }),
    "fell-the-balance": melee({
      conditions: [
        [],
        [["prone", 1]],
        [
          ["prone", 1],
          ["slowed", 1],
        ],
      ],
    }),
    "dance-through-steel": self(
      { movement: 3, disengage: true, defense: 1 },
      { once: true },
    ),
    "relentless-pursuit": melee({ damage: [3, 5, 7], after: { movement: 2 } }),
    "perfect-placement": melee({ damage: [5, 7, 9], once: true }),
  },
  intellect: {
    "spot-the-leverage": support(opening(2)),
    "make-the-connection": self(
      { reveal: true },
      { exploration: true, category: "main" },
    ),
    // Prepared Explanation and Predict the Motion retain their existing source adapters.
    "a-better-angle": support({ attack: 1, charges: 1, movement: 2 }),
    "diagnose-the-failure": support(cleanse(["dazed", "frightened"], 2), {
      category: "main",
    }),
    "a-route-for-everyone": self(
      { movement: 2, disengage: true },
      { area: 3, category: "main", once: true },
    ),
    "test-the-hypothesis": strike("knowledge", 4, [3, 5, 7], "mental", {
      conditions: cond("dazed", 0, 1, 2),
    }),
    "expose-the-mechanism": strike("knowledge", 5, [3, 5, 7], "physical", {
      mark: 2,
      once: true,
    }),
  },
  leader: {
    "follow-my-signal": support(opening(2)),
    "lead-the-step": support({ movement: 2 }),
    "stand-together": self(ward(1), { area: 1, category: "main" }),
    "press-the-opening": support({ attack: 2, charges: 1, movement: 1 }),
    "orderly-withdrawal": self(
      { movement: 1, disengage: true },
      { area: 2, category: "main" },
    ),
    "hold-your-nerve": self(cleanse(["frightened", "dazed"], 2), {
      area: 3,
      category: "main",
    }),
    "coordinated-rush": self(
      { attack: 1, charges: 1, movement: 2 },
      { area: 3, category: "main", once: true },
    ),
    "refuse-the-rout": self(
      { cleanse: ["frightened"], amount: 3, defense: 2 },
      { area: 3, category: "main", once: true },
    ),
    "watch-the-rear": self(
      { riposte: true },
      { area: 2, category: "main", once: true },
    ),
  },
  odd: {
    "sideways-thinking": strike("guile", 4, [1, 2, 4], "mental", {
      conditions: cond("dazed", 0, 1, 1),
    }),
    "useful-interruption": support(ward(2)),
    "always-a-way-around": self({ movement: 3, disengage: true }),
    "unlikely-assistant": strike("guile", 5, [2, 3, 5], "physical", {
      spell: true,
      conditions: cond("poisoned", 0, 1, 2),
    }),
    "change-the-question": support({
      cleanse: ["dazed", "frightened"],
      amount: 1,
      attack: 1,
      charges: 1,
    }),
    "wrong-place-for-that": support(
      { defense: 2, disengage: true },
      { spell: true },
    ),
    "strange-but-effective": self(opening(3), { once: true }),
    "an-unexpected-exit": self(
      { movement: 3, disengage: true },
      { area: 2, category: "main", spell: true, once: true },
    ),
    "one-last-remark": support(
      { lastStand: true },
      { category: "main", once: true },
    ),
  },
  protector: {
    "set-your-feet": self({ defense: 1, stability: 2 }),
    "between-them": support({ guard: true }, { range: 1 }),
    "close-the-gap": support({ pull: 2 }, { range: 3 }),
    "break-their-advance": melee({
      push: [1, 2, 3],
      conditions: cond("slowed", 0, 1, 2),
    }),
    "shelter-the-fallen": support(
      { defense: 2, stabilize: true },
      { range: 1, category: "main" },
    ),
    "make-a-refuge": self(
      { defense: 1, stability: 1 },
      { area: 2, category: "main" },
    ),
    "unbroken-passage": self(
      { defense: 2, disengage: true },
      { area: 2, category: "main", once: true },
    ),
    "defiant-rescue": support(
      { guard: true, lastStand: true },
      { range: 2, category: "main", once: true },
    ),
    "drive-back-the-circle": strike("reason", 3, [3, 5, 7], "radiant", {
      spell: true,
      push: [1, 2, 3],
    }),
  },
  shadow: {
    // Blade in the Back keeps the established source adapter.
    "fade-behind": self({ defense: 1, disengage: true }),
    "turn-their-eye": strike("guile", 4, [0, 0, 0], "mental", {
      conditions: cond("dazed", 1, 1, 2),
      mark: 1,
    }),
    "strike-and-vanish": strike("agility", 1, [2, 3, 5], "physical", {
      weapon: "melee",
      after: { disengage: true, movement: 1 },
    }),
    "open-the-way": self(
      { reveal: true },
      { exploration: true, category: "main" },
    ),
    "pass-the-guard": self({ movement: 2, disengage: true }),
    "exploit-confusion": strike("agility", 1, [3, 5, 7], "physical", {
      weapon: "melee",
      boonCondition: ["dazed", 2],
    }),
    "unseen-passage": self(
      { movement: 3, disengage: true, defense: 2 },
      { once: true },
    ),
    "leave-no-pursuit": strike("guile", 4, [2, 3, 5], "mental", {
      conditions: cond("dazed", 1, 2, 3),
      once: true,
    }),
  },
  shepherd: {
    // Mend retains the established source healing adapter.
    "ease-the-burden": support(cleanse(["slowed", "dazed"], 1), {
      category: "main",
    }),
    "hear-me-still": support(
      { stabilize: true, pull: 2 },
      { range: 3, category: "main" },
    ),
    "careful-transfer": {
      category: "main",
      target: "ally",
      range: 3,
      attribute: "reason",
      healing: [4, 7, 10],
      hpCost: 2,
      freeHand: true,
    },
    "quiet-the-tremor": support(cleanse(["dazed", "frightened"], 2), {
      category: "main",
    }),
    "bring-them-near": self(
      { defense: 1 },
      { area: 3, category: "main", spell: true },
    ),
    "restore-composure": {
      category: "main",
      target: "ally",
      range: 3,
      attribute: "reason",
      healing: [5, 10, 15],
      hpCost: 3,
      freeHand: true,
      reduce: "dazed",
      reduction: [1, 2, 3],
    },
    "a-hand-in-darkness": support(
      { lastStand: true },
      { spell: true, category: "main", once: true },
    ),
    "shared-resolve": self(
      { attack: 2, charges: 1, defense: 1 },
      { area: 3, category: "main", spell: true, once: true },
    ),
  },
  unbalanced: {
    "shoulder-through": strike("brawn", 1, [2, 3, 5], "physical", {
      push: [1, 2, 3],
    }),
    "wild-approach": self({ attack: 2, charges: 1, defense: -1 }),
    "laugh-at-the-fall": self({ stand: true, movement: 1 }),
    "crush-the-barrier": strike("brawn", 1, [3, 5, 7], "physical", {
      push: [1, 2, 3],
    }),
    "raging-recoil": self({ riposte: true, defense: -1 }),
    "fling-the-captive": strike("brawn", 1, [3, 5, 7], "physical", {
      push: [2, 3, 4],
      conditions: [[], [], [["prone", 1]]],
    }),
    "scatter-the-line": strike("brawn", 1, [3, 5, 7], "physical", {
      push: [2, 3, 4],
      conditions: cond("slowed", 1, 2, 3),
    }),
    "break-their-grip": self(
      { cleanse: ["grappled"], amount: 3, lastStand: true },
      { once: true },
    ),
    "crash-down": strike("brawn", 1, [5, 7, 10], "physical", {
      selfCost: 2,
      push: [1, 2, 3],
    }),
  },
  warden: {
    "keep-the-quarry-close": self(opening(2)),
    "read-the-passing": self(
      { reveal: true },
      { exploration: true, category: "main" },
    ),
    "follow-my-footsteps": support({ movement: 2, defense: 1 }),
    "stay-on-the-scent": ranged({ damage: [3, 5, 7], mark: 1 }),
    "through-bramble-and-stone": strike("knowledge", 5, [2, 3, 5], "life", {
      spell: true,
      conditions: cond("slowed", 1, 2, 3),
    }),
    // A Watchful Rest retains its source magical spear attack.
    "turn-the-hunt": ranged({ damage: [3, 5, 7], mark: 2 }),
    "bring-them-through": self(
      { defense: 2, stability: 1 },
      { area: 2, category: "main", spell: true, once: true },
    ),
    "know-what-you-hunt": ranged({ damage: [5, 7, 9], once: true }),
  },
};
export const SIGNATURES = Object.freeze(
  Object.fromEntries(
    Object.entries(rows).flatMap(([cls, entries]) =>
      Object.entries(entries).map(([slug, spec]) => [
        `ability-signature-${cls}-${slug}`,
        { ...spec, adapted: true },
      ]),
    ),
  ),
);
export function gameDescription(a) {
  if (!a) return "";
  const parts = [];
  if (a.adapted) parts.push("Dungeon adaptation.");
  parts.push(
    `${a.category === "main" ? "Action" : "Maneuver"} · ${a.target}${a.range ? ` within ${a.range} squares` : ""}${a.area ? ` and companions within ${a.area} squares` : ""}.`,
  );
  if (a.damage)
    parts.push(
      `${a.attribute} attack: ${a.damage.join(" / ")} ${a.type} damage (Weak / Standard / Strong).`,
    );
  if (a.conditions)
    parts.push(
      `Conditions: ${a.conditions.map((xs) => xs.map(([k, v]) => `${k} ${v}`).join(", ") || "none").join(" / ")}.`,
    );
  if (a.healing)
    parts.push(
      `Restore ${a.healing.join(" / ")} HP${a.hpCost ? `; costs ${a.hpCost} HP` : ""}.`,
    );
  if (a.reduce)
    parts.push(`Reduce temporary ${a.reduce} by ${a.reduction.join(" / ")}.`);
  if (a.supply)
    parts.push(
      "Requires a smoke supply; each use rolls its supply die after use. Craft smoke flasks in town. Retrieving the supply provokes.",
    );
  if (a.weapon)
    parts.push(
      `Requires a ${a.weapon} weapon${a.weapon === "ranged" ? " and ammunition" : ""}.`,
    );
  if (a.shield) parts.push("Requires a readied shield.");
  if (a.push) parts.push(`Push ${a.push.join(" / ")} squares.`);
  if (a.pull) parts.push(`Pull ${a.pull.join(" / ")} squares.`);
  if (a.mark)
    parts.push(
      `Mark the target: your company gains ${a.mark} attack Boon${a.mark > 1 ? "s" : ""} against it for this encounter; marks do not stack.`,
    );
  if (a.selfCost) parts.push(`Costs ${a.selfCost} HP; must remain above 0 HP.`);
  if (a.boonCondition)
    parts.push(
      `+${a.boonCondition[1]} attack Boons against ${a.boonCondition[0]}.`,
    );
  for (const [effects, after] of [
    [a.tactic, false],
    [a.after, true],
  ])
    if (effects) {
      if (after) parts.push("After attacking:");
      if (effects.attack)
        parts.push(`+${effects.attack} Boons on the recipient’s next attack.`);
      if (effects.defense)
        parts.push(
          `${effects.defense > 0 ? "+" : ""}${effects.defense} defense Boons through the recipient’s next turn (self: this turn).`,
        );
      if (effects.stability)
        parts.push(`Stability +${effects.stability} for that duration.`);
      if (effects.movement)
        parts.push(
          `Gain ${effects.movement} movement for this turn, or the recipient’s next turn.`,
        );
      if (effects.disengage)
        parts.push("Movement does not provoke for that duration.");
      if (effects.cleanse)
        parts.push(
          `Reduce temporary ${effects.cleanse.join(", ")} by ${effects.amount}.`,
        );
      if (effects.gather)
        parts.push(
          "Harvest food from this floor’s single viable patch. One hour; Knowledge raises a food supply by 1 / 2 / 3 steps, up to d8. Once per floor for the company; cannot gather near enemies.",
        );
      if (effects.reveal)
        parts.push(
          "Reveal nearby floor layout, stairs and containers within 8 squares; creatures remain hidden until perceived. Available while exploring; costs 1 minute.",
        );
      if (effects.riposte)
        parts.push(
          "After the next adjacent physical attack, counter with a Basic Melee using your Reaction and readied weapon if still capable.",
        );
      if (effects.guard)
        parts.push(
          "Divert the next damaging hit to the caster while adjacent. Uses the caster’s Reaction and normal wound rules.",
        );
      if (effects.lastStand)
        parts.push(
          "Once before the effect expires, prevent a lethal hit from dropping HP below 1. Does not restore Grit, heal wounds or rescue a hero already Dying.",
        );
      if (effects.stabilize)
        parts.push(
          "Stabilize a Dying recipient, without restoring HP or treating wounds.",
        );
      if (effects.pull)
        parts.push(
          `Pull the willing recipient up to ${effects.pull} squares toward you; blocked paths stop movement.`,
        );
      if (effects.stand)
        parts.push("Stand up; this provokes before resolving.");
    }
  if (a.spell) parts.push("Casting provokes opportunity attacks.");
  if (a.once) parts.push("Once per encounter.");
  return parts.join(" ");
}
