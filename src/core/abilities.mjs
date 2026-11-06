import { POWERS } from "./powers.mjs";
import { FIELD_ABILITIES } from "./field-abilities.mjs";
import { gameDescription } from "./signatures.mjs";
import { SIGNATURES } from "./signatures.mjs";
import { CURATED_ATTACKS } from "./curated-attacks.mjs";
// Explicit dungeon adapters. Source cards remain immutable under vendor/hol.
const attack = (attribute, range, damage, type = "physical", extra = {}) => ({
  category: "main",
  target: "enemy",
  attribute,
  range,
  damage,
  type,
  ...extra,
});
export const ABILITIES = Object.freeze({
  ...POWERS,
  ...CURATED_ATTACKS,
  ...SIGNATURES,
  ...FIELD_ABILITIES,
  "ability-sustain-the-failing": {
    category: "main",
    target: "ally",
    range: 3,
    attribute: "reason",
    hpCost: 3,
    freeHand: true,
    healing: [5, 10, 15],
    reduce: "poisoned",
    reduction: [0, 0, 1],
  },
  "ability-bank-the-embers": {
    category: "maneuver",
    target: "ally",
    range: 1,
    reduce: "burning",
    reduction: [2, 2, 2],
    spell: true,
  },
  "ability-urgent-bandaging": {
    category: "maneuver",
    target: "ally",
    range: 1,
    attribute: "knowledge",
    reduce: "bleeding",
    reduction: [2, 3, 4],
    freeHand: true,
    cloth: true,
  },
  "ability-press-and-bind": {
    category: "maneuver",
    target: "ally",
    range: 1,
    reduce: "bleeding",
    reduction: [1, 1, 1],
    freeHand: true,
    cloth: true,
  },
  "ability-lantern-in-the-palm": { category: "maneuver", target: "self" },
  "ability-disengage": { category: "maneuver", target: "self" },
  "ability-basic-melee": attack("brawn", 1, [2, 3, 5], "physical", {
    weapon: "melee",
  }),
  "ability-basic-unarmed": attack("brawn", 1, [1, 2, 4]),
  "ability-basic-ranged": attack("agility", 8, [2, 3, 5], "physical", {
    weapon: "ranged",
  }),
  "ability-hook-and-drive": attack("brawn", 1, [2, 3, 5], "physical", {
    weapon: "melee",
    conditions: [
      [["slowed", 1]],
      [["slowed", 2]],
      [
        ["slowed", 2],
        ["prone", 1],
      ],
    ],
  }),
  "ability-pinning-shot": attack("agility", 8, [3, 3, 5], "physical", {
    weapon: "ranged",
    conditions: [[], [["slowed", 1]], [["slowed", 2]]],
  }),
  "ability-cinder-cast": attack("knowledge", 5, [3, 3, 5], "fire", {
    spell: true,
    conditions: [[], [["burning", 1]], [["burning", 2]]],
  }),
  "ability-rime-grip": attack("knowledge", 5, [3, 3, 5], "cold", {
    spell: true,
    conditions: [
      [],
      [["slowed", 1]],
      [
        ["slowed", 1],
        ["freezing", 1],
      ],
    ],
  }),
  "ability-drain-warmth": attack("guile", 4, [2, 3, 5], "life", {
    spell: true,
    conditions: [[], [], [["slowed", 1]]],
  }),
  "ability-rim-strike": attack("brawn", 1, [3, 3, 5], "physical", {
    shield: true,
    push: [0, 1, 2],
  }),
  "ability-signature-shadow-soft-landing": attack(
    "agility",
    1,
    [3, 4, 6],
    "physical",
    {
      weapon: "melee",
      flanking: true,
      conditions: [[], [["bleeding", 1]], [["bleeding", 2]]],
    },
  ),
  "ability-sap-and-breath": {
    category: "main",
    target: "ally",
    range: 2,
    attribute: "reason",
    healing: [3, 5, 7],
    hpCost: 1,
    freeHand: true,
    reduce: "bleeding",
    reduction: [0, 1, 2],
  },
  "ability-shared-breath": {
    category: "main",
    target: "ally",
    range: 3,
    attribute: "reason",
    healing: [3, 6, 9],
    hpCost: 1,
    freeHand: true,
  },
  "ability-mercy-in-the-light": {
    category: "main",
    target: "ally",
    range: 3,
    attribute: "reason",
    healing: [3, 5, 7],
    hpCost: 1,
    freeHand: true,
    reduce: "frightened",
    reduction: [0, 1, 2],
  },
  "ability-relieve-poison": {
    category: "main",
    target: "ally",
    range: 1,
    attribute: "knowledge",
    reduce: "poisoned",
    reduction: [1, 2, 3],
  },
  "ability-rouse-the-senses": {
    category: "main",
    target: "ally",
    range: 1,
    attribute: "reason",
    reduce: "dazed",
    reduction: [1, 2, 3],
    otherOnly: true,
  },
  "ability-signature-shepherd-gentle-return": {
    category: "main",
    target: "ally",
    range: 3,
    attribute: "reason",
    healing: [3, 6, 9],
    hpCost: 1,
    freeHand: true,
    noDying: true,
    standOnStrong: true,
  },
  "ability-use-a-healing-potion": {
    category: "maneuver",
    target: "ally",
    range: 1,
  },
  "ability-reduce-a-condition": { category: "main", target: "ally", range: 1 },
  "ability-defend": { category: "maneuver", target: "self" },
  "ability-stabilize": { category: "maneuver", target: "ally", range: 1 },
});
export const SUPPORT_ACTIONS = new Set([
  "ability-opportunity-attack",
  "ability-trail-workshop",
  "ability-make-something-useful",
  "ability-bottled-morning",
  "ability-ordinary-recipe-study",
  "ability-signature-intellect-predict-the-motion",
  "ability-wake-the-iron-rune",
  "ability-treat-soft-tissue",
  "ability-treat-bone",
  "ability-treat-mental-trauma",
  "ability-treat-elemental-injury",
  "ability-treat-radiant-injury",
  "ability-treat-life-injury",
  "ability-shield-block",
  "ability-convert-an-action",
  "ability-handle-an-item",
  "ability-stand",
  "ability-move",
]);
export function coverage(id) {
  if (POWERS[id])
    return {
      status: "included",
      decision: "game-design",
      reason: POWERS[id].description,
    };
  if (ABILITIES[id])
    return {
      status: "included",
      decision: ABILITIES[id].adapted ? "replace" : "keep",
      reason: gameDescription(ABILITIES[id]),
    };
  if (SUPPORT_ACTIONS.has(id))
    return {
      status: "included",
      reason:
        "Integrated into turn, movement or equipment controls. See game adaptation notes for current scope.",
    };
  if (
    [
      "ability-quick-exit",
      "ability-conditioned-body",
      "ability-one-more-dawn",
      "ability-wear-light-armor",
      "ability-wear-medium-armor",
      "ability-wear-heavy-armor",
    ].includes(id)
  )
    return {
      status: "included",
      reason:
        "Applied through the pinned character/development or passive-defense calculator.",
    };
  return {
    status: "retired",
    decision: "cut",
    reason:
      "Removed from dungeon training: this card depends on narrative adjudication or systems outside this game's tactical roster. Existing purchases can be retrained in town at no coin cost; original source rules remain available.",
  };
}
