// Concrete replacements for referee-dependent origin gifts and field skills.
const self = (tactic, extra = {}) => ({
  category: "maneuver",
  target: "self",
  tactic,
  adapted: true,
  ...extra,
});
const ally = (tactic, extra = {}) => ({
  ...self(tactic),
  target: "ally",
  range: 4,
  ...extra,
});
const hit = (attribute, type, extra = {}) => ({
  category: "main",
  target: "enemy",
  attribute,
  type,
  range: 4,
  damage: [2, 3, 5],
  adapted: true,
  ...extra,
});
const survey = () =>
  self({ reveal: true }, { category: "main", exploration: true });
const gather = () =>
  self(
    { gather: true },
    { category: "main", exploration: true, explorationOnly: true },
  );
export const FIELD_ABILITIES = Object.freeze({
  "ability-identify-a-mixture": ally(
    { cleanse: ["poisoned"], amount: 1 },
    { category: "main", range: 1 },
  ),
  "ability-an-invitation-elsewhere": hit("guile", "mental", {
    pull: [0, 1, 2],
    spell: true,
  }),
  "ability-borrow-the-beast": self(
    { attack: 1, charges: 1, stability: 1 },
    { spell: true },
  ),
  "ability-call-the-faithful-hound": hit("reason", "physical", {
    spell: true,
    mark: 1,
  }),
  "ability-the-bones-rise": ally({ defense: 1, stability: 1 }, { spell: true }),
  "ability-keep-the-door-closed": self(
    { defense: 1, stability: 1 },
    { spell: true },
  ),
  "ability-sure-ascent": self({ movement: 2 }),
  "ability-the-key-changes-hands": self({
    attack: 1,
    charges: 1,
    disengage: true,
  }),
  "ability-quiet-latch": survey(),
  "ability-smile-before-steel": hit("guile", "mental", {
    damage: [0, 1, 2],
    conditions: [[], [["dazed", 1]], [["dazed", 2]]],
  }),
  "ability-create-a-distraction": hit("guile", "mental", {
    damage: [0, 0, 0],
    mark: 1,
  }),
  "ability-anatomy-of-an-opening": ally({ attack: 2, charges: 1 }),
  "ability-measured-appeal": ally(
    { cleanse: ["frightened"], amount: 2 },
    { category: "main" },
  ),
  "ability-breath-of-the-wyrmling": hit("fortitude", "fire", {
    range: 2,
    spell: true,
    conditions: [[], [["burning", 1]], [["burning", 2]]],
  }),
  "ability-let-the-spark-decide": self(
    { attack: 1, charges: 1 },
    { spell: true },
  ),
  "ability-invitation-to-the-blade": self({ riposte: true }),
  "ability-roots-remember-feet": survey(),
  "ability-shielding-step": ally({ defense: 1, movement: 1 }, { shield: true }),
  "ability-guide-a-frightened-animal": ally({
    cleanse: ["frightened"],
    amount: 1,
  }),
  "ability-smoke-in-a-bottle": self(
    { defense: 1, disengage: true },
    { supply: "item-smoke-supply" },
  ),
  "ability-name-the-reckoning": hit("reason", "radiant", {
    spell: true,
    mark: 1,
  }),
  "ability-oathlight-strike": hit("brawn", "radiant", {
    range: 1,
    weapon: "melee",
  }),
  "ability-secure-a-hold": self({ stability: 2 }),
  "ability-read-the-quarry": self({ attack: 2, charges: 1 }),
  "ability-winter-store": gather(),
  "ability-a-courtesy-unanswered": hit("guile", "mental", {
    damage: [0, 1, 2],
    conditions: [[], [["frightened", 1]], [["frightened", 2]]],
  }),
  "ability-take-them-alive": hit("brawn", "physical", {
    range: 1,
    damage: [1, 2, 3],
    conditions: [
      [["slowed", 1]],
      [["slowed", 2]],
      [
        ["slowed", 2],
        ["prone", 1],
      ],
    ],
  }),
  "ability-forage-coast": gather(),
  "ability-expert-river-crossing": ally({ movement: 2 }),
  "ability-i-have-seen-this-step": self({ defense: 2 }),
  "ability-the-otter-s-bargain": self(
    { movement: 2, disengage: true },
    { spell: true },
  ),
  "ability-a-verse-for-courage": ally(
    { cleanse: ["frightened"], amount: 1, attack: 1, charges: 1 },
    { category: "main" },
  ),
  "ability-a-door-that-is-not-there": self(
    { disengage: true, movement: 2 },
    { spell: true },
  ),
  "ability-keep-time-with-steel": ally({ attack: 1, charges: 1 }),
  "ability-a-sign-against-harm": ally({ defense: 1 }, { spell: true }),
  "ability-a-hand-from-before": ally(
    { attack: 1, charges: 1 },
    { spell: true },
  ),
  "ability-lantern-moths": survey(),
  "ability-speak-with-the-hearth": survey(),
  "ability-forage-woodland": gather(),
  "ability-borrow-a-voice": hit("guile", "mental", {
    damage: [0, 0, 0],
    conditions: [[["dazed", 1]], [["dazed", 1]], [["dazed", 2]]],
  }),
  "ability-a-place-at-any-fire": ally(
    { cleanse: ["frightened"], amount: 1, defense: 1 },
    { category: "main" },
  ),
  "ability-silent-cue": ally({ movement: 1, attack: 1, charges: 1 }),
  "ability-read-the-remains": survey(),
  "ability-rime-footholds": ally(
    { movement: 2, stability: 1 },
    { spell: true },
  ),
  "ability-swing-into-trouble": hit("agility", "physical", {
    range: 1,
    weapon: "melee",
    after: { movement: 1 },
  }),
  "ability-aid": ally({ attack: 1, charges: 1 }, { category: "main" }),
  "ability-forage-mountains": gather(),
  "ability-forage-wetlands": gather(),
});
