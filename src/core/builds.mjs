import { strongest, weaponBonus } from "./equipment-bonuses.mjs";
import { forgePower, forgePowerText } from "./forge.mjs";
import { POWERS } from "./powers.mjs";
import { distance } from "./dungeon.mjs";
import { surfaceAt } from "./battlefield.mjs";

export const BUILD_BRANCHES = [
  ["steel", "Steel & Impact", "arms"],
  ["ember", "Ember & Ruin", "flame"],
  ["winter", "Winter & Wards", "frost"],
  ["storm", "Storm & Motion", "storm"],
  ["shadow", "Blood & Shadow", "subterfuge"],
  ["life", "Life & Command", "life"],
];
const nodes = [];
const node = (branch, id, name, text, stats, maxRank = 3, capstone = false) =>
  nodes.push({
    id,
    branch,
    name,
    text,
    stats,
    maxRank,
    capstone,
    level: capstone ? 4 : 1,
  });
node("steel", "heavy-hands", "Heavy Hands", "+1 physical damage per rank.", {
  physical: 1,
});
node(
  "steel",
  "crash",
  "Crash",
  "+2 wall collision damage per rank. Turn corridors into weapons.",
  { impact: 2 },
  2,
);
node(
  "steel",
  "follow-through",
  "Follow Through",
  "+1 movement after a kill per rank; strongest kill movement bonus wins.",
  { killMove: 1 },
  2,
);
node(
  "steel",
  "colossus",
  "Colossus",
  "+3 physical damage, +1 physical DR, −1 movement. Exclusive with Duelist.",
  { physical: 3, dr: 1, movement: -1 },
  1,
  true,
);
node(
  "steel",
  "duelist",
  "Duelist",
  "+4 damage on Strong hits, +1 attack Boon, −1 damage reduction. Exclusive with Colossus.",
  { critical: 4, attack: 1, reduction: -1 },
  1,
  true,
);
node("ember", "kindling", "Kindling", "+1 fire damage per rank.", { fire: 1 });
node(
  "ember",
  "fuel",
  "Feed the Fire",
  "+1 Burning applied per rank. Repeated applications accumulate.",
  { burning: 1 },
  2,
);
node(
  "ember",
  "execution-pyre",
  "Execution Pyre",
  "+1 damage per rank against targets already Burning.",
  { burningDamage: 1 },
);
node(
  "ember",
  "wildfire",
  "Wildfire",
  "Fire hits spread Burning 1 to enemies adjacent to the target. −1 direct damage. Exclusive with Glass Cannon.",
  { wildfire: 1, damage: -1 },
  1,
  true,
);
node(
  "ember",
  "glass-cannon",
  "Glass Cannon",
  "+4 spell damage, −2 damage reduction. Exclusive with Wildfire.",
  { spell: 4, reduction: -2 },
  1,
  true,
);
node("winter", "deep-cold", "Deep Cold", "+1 cold damage per rank.", {
  cold: 1,
});
node(
  "winter",
  "wardcraft",
  "Wardcraft",
  "+1 absorption from your barrier powers per rank.",
  { barrier: 1 },
);
node(
  "winter",
  "fracture",
  "Fracture",
  "+2 physical damage per rank against Freezing targets. Consumes one Freezing stack to shatter.",
  { shatter: 2 },
  2,
);
node(
  "winter",
  "iceblood",
  "Iceblood",
  "+1 physical DR, +3 barriers, −1 movement. Exclusive with Permafrost.",
  { dr: 1, barrier: 3, movement: -1 },
  1,
  true,
);
node(
  "winter",
  "permafrost",
  "Permafrost",
  "Cold hits apply Freezing 1. +1 Slowed applied; −1 direct damage. Exclusive with Iceblood.",
  { permafrost: 1, slowed: 1, damage: -1 },
  1,
  true,
);
node("storm", "voltage", "Voltage", "+1 lightning damage per rank.", {
  lightning: 1,
});
node(
  "storm",
  "stride",
  "Long Stride",
  "+1 movement per rank.",
  { movement: 1 },
  2,
);
node(
  "storm",
  "conductor",
  "Conductor",
  "+2 chain damage per rank when lightning hits a target standing in water.",
  { chain: 2 },
  2,
);
node(
  "storm",
  "stormrunner",
  "Stormrunner",
  "+4 damage after spending movement this turn; −1 damage reduction. Exclusive with Thunderheart.",
  { moveDamage: 4, reduction: -1 },
  1,
  true,
);
node(
  "storm",
  "thunderheart",
  "Thunderheart",
  "+3 lightning damage and +2 chain damage; −1 movement. Exclusive with Stormrunner.",
  { lightning: 3, chain: 2, movement: -1 },
  1,
  true,
);
node(
  "shadow",
  "open-vein",
  "Open Vein",
  "+1 Bleeding applied per rank.",
  { bleeding: 1 },
  2,
);
node("shadow", "precision", "Precision", "+2 damage on Strong hits per rank.", {
  critical: 2,
});
node(
  "shadow",
  "flanker",
  "Flanker",
  "+1 damage per rank if another capable ally is adjacent to the target.",
  { flanker: 1 },
);
node(
  "shadow",
  "ambusher",
  "Ambusher",
  "+6 damage when attacking from concealment. The attack reveals you. Exclusive with Venomhand.",
  { ambush: 6 },
  1,
  true,
);
node(
  "shadow",
  "venomhand",
  "Venomhand",
  "Weapon hits apply Poisoned 1; −1 direct damage. Exclusive with Ambusher.",
  { venom: 1, damage: -1 },
  1,
  true,
);
node(
  "life",
  "renewal",
  "Renewal",
  "+1 HP restored by your healing powers per rank; wounds remain separate.",
  { heal: 1 },
);
node(
  "life",
  "shelter",
  "Shelter",
  "+1 barrier strength per rank.",
  { barrier: 1 },
  2,
);
node(
  "life",
  "rallying-care",
  "Rallying Care",
  "Healing grants 1 movement through the recipient’s next turn.",
  { rallyMove: 1 },
  1,
);
node(
  "life",
  "reaper",
  "Reaper",
  "Recover 4 HP on a kill; −1 HP from your healing powers. Exclusive with Lifeguard.",
  { killHeal: 4, heal: -1 },
  1,
  true,
);
node(
  "life",
  "lifeguard",
  "Lifeguard",
  "Healing also grants a 3-point barrier for two turns; −1 direct damage. Exclusive with Reaper.",
  { healingWard: 3, damage: -1 },
  1,
  true,
);
export const TALENTS = Object.freeze(
  Object.fromEntries(nodes.map((n) => [n.id, n])),
);

export function specializationOptions(p) {
  if (!p || p.universal || p.category === "passive") return [];
  if (p.effects.some((e) => e.kind === "damage"))
    return [
      {
        id: "focused",
        name: "Focused",
        text: "+2 direct damage; range reduced by 1 (minimum 1).",
      },
      {
        id: "sweeping",
        name: "Sweeping",
        text: "Strike a radius of 1 around the aim point (larger existing radius +1); −2 direct damage. Lines/cones become a burst.",
      },
      {
        id: "cruel",
        name: "Cruel",
        text: "+1 condition severity; −1 direct damage. Attacks with no condition add Bleeding 1.",
      },
    ];
  if (p.effects.some((e) => e.kind === "move"))
    return [
      {
        id: "longstride",
        name: "Longstride",
        text: "+2 range, but uses your Action instead of Maneuver.",
      },
      {
        id: "guarded",
        name: "Guarded",
        text: "Gain a 3-point barrier for this turn after moving; −1 range (minimum 1).",
      },
      {
        id: "predatory",
        name: "Predatory",
        text: "Next attack within two turns deals +2 damage; −1 range (minimum 1).",
      },
    ];
  return [
    {
      id: "potent",
      name: "Potent",
      text: "+2 healing/barriers, +1 numeric buff or condition strength. Other powers grant you a 3-point barrier. Uses your Action.",
    },
    {
      id: "reaching",
      name: "Reaching",
      text: "+2 range; self-targeted powers instead gain 1 movement this turn.",
    },
    {
      id: "enduring",
      name: "Enduring",
      text: "+1 turn to buffs and +1 round to surfaces. Powers without a duration grant you 1 damage reduction for two turns. Uses your Action.",
    },
  ];
}
export const masteryBudget = (h) =>
  2 + 2 * ((h.preview?.state.level ?? h.draft.progression?.level ?? 1) - 1);
export const masterySpent = (h) =>
  Object.values(h.build?.talents ?? {}).reduce((n, v) => n + v, 0) +
  Object.keys(h.build?.specializations ?? {}).length;
export function validateBuild(h) {
  if (!h.build) return;
  if (typeof h.build !== "object" || Array.isArray(h.build))
    throw new Error("Saved hero build is invalid.");
  const { talents = {}, specializations = {} } = h.build;
  if (
    !talents ||
    typeof talents !== "object" ||
    Array.isArray(talents) ||
    !specializations ||
    typeof specializations !== "object" ||
    Array.isArray(specializations)
  )
    throw new Error("Saved hero build is invalid.");
  const level = h.draft.progression?.level ?? 1;
  for (const [id, rank] of Object.entries(talents)) {
    const n = TALENTS[id];
    if (
      !n ||
      !Number.isSafeInteger(rank) ||
      rank < 1 ||
      rank > n.maxRank ||
      level < n.level
    )
      throw new Error("Saved mastery rank is invalid.");
    if (
      n.capstone &&
      (Object.entries(talents)
        .filter(
          ([k]) => TALENTS[k]?.branch === n.branch && !TALENTS[k].capstone,
        )
        .reduce((s, [, r]) => s + r, 0) < 3 ||
        Object.keys(talents).some(
          (k) =>
            k !== id && TALENTS[k]?.branch === n.branch && TALENTS[k].capstone,
        ))
    )
      throw new Error("Saved capstone prerequisites are invalid.");
  }
  for (const [id, choice] of Object.entries(specializations))
    if (!specializationOptions(POWERS[id]).some((s) => s.id === choice))
      throw new Error("Saved skill specialization is invalid.");
  if (masterySpent(h) > masteryBudget(h))
    throw new Error("Saved hero exceeds their mastery budget.");
}
export const buildMethods = {
  buildStat(h, key) {
    if (!h?.preview || !this.C.gamePowers) return 0;
    if (h.draft.forge)
      return (
        (h.preview.forge?.stats[key] ?? 0) +
        strongest(h, "build", (e) => e.stat === key)
      );
    const talents = Object.entries(h.build?.talents ?? {}).reduce(
      (n, [id, rank]) => n + (TALENTS[id]?.stats[key] ?? 0) * rank,
      0,
    );
    // Signature tiers improve a role rather than multiplying identical bonuses.
    const values = this.powerIds(h).map(
      (id) => POWERS[id]?.buildStats?.[key] ?? 0,
    );
    const equipment = strongest(h, "build", (e) => e.stat === key);
    return (
      talents + equipment + Math.max(0, ...values) + Math.min(0, ...values)
    );
  },
  editBuild(index, edit) {
    const h = this.party[index];
    if (this.mode !== "town" || !this.canAct(h))
      throw new Error("Change your build safely in Greyhaven.");
    if (h.draft.forge)
      throw new Error("Use discipline paths to develop this hero.");
    const before = h.build;
    h.build = structuredClone(before ?? { talents: {}, specializations: {} });
    h.build.talents ??= {};
    h.build.specializations ??= {};
    try {
      if (edit.reset) h.build = { talents: {}, specializations: {} };
      else if (edit.talent) {
        const next = (h.build.talents[edit.talent] ?? 0) + edit.delta;
        if (![1, -1].includes(edit.delta) || next < 0)
          throw new Error("Choose one mastery rank to add or refund.");
        if (next) h.build.talents[edit.talent] = next;
        else delete h.build.talents[edit.talent];
      } else if (edit.power) {
        if (!this.powerIds(h).includes(edit.power))
          throw new Error("Learn this power before specializing it.");
        if (edit.specialization)
          h.build.specializations[edit.power] = edit.specialization;
        else delete h.build.specializations[edit.power];
      }
      validateBuild(h);
    } catch (e) {
      h.build = before;
      throw e;
    }
    this.refreshHero(h);
    this.emit("party");
    this.emit("change");
  },
  powerSpec(id, h = this.active) {
    const p = structuredClone(POWERS[id]);
    if (!p) return p;
    if (h?.draft?.forge) {
      const result = forgePower(p, h);
      if (result.weapon === "ranged")
        result.range += weaponBonus(h, result, "range");
      result.description = forgePowerText(result);
      return result;
    }
    if (p.weapon === "ranged") p.range += weaponBonus(h, p, "range");
    const augment = h?.build?.specializations?.[id];
    const add = (value, n) =>
      Array.isArray(value)
        ? value.map((x) => Math.max(1, x + n))
        : Math.max(1, value + n);
    if (augment === "focused") {
      p.damageModifier = 2;
      p.range = Math.max(1, (p.range ?? 1) - 1);
    }
    if (augment === "sweeping") {
      p.damageModifier = -2;
      p.radius = (p.radius ?? 0) + 1;
      delete p.shape;
    }
    if (augment === "cruel") {
      p.damageModifier = -1;
      if (!p.effects.some((e) => e.kind === "condition"))
        p.effects.push({ kind: "condition", key: "bleeding", rating: 1 });
      else
        for (const e of p.effects.filter((e) => e.kind === "condition"))
          e.rating++;
    }
    if (augment === "longstride") {
      p.range += 2;
      p.category = "main";
    }
    if (["guarded", "predatory"].includes(augment)) {
      p.range = Math.max(1, p.range - 1);
      p.effects.push(
        augment === "guarded"
          ? { kind: "barrier", amount: 3, turns: 1 }
          : { kind: "buff", stats: { damage: 2 }, turns: 2 },
      );
    }
    if (augment === "potent") {
      p.category = "main";
      let enhanced = false;
      for (const e of p.effects) {
        if (["heal", "barrier"].includes(e.kind)) {
          e.amount = add(e.amount, 2);
          enhanced = true;
        }
        if (e.kind === "condition") {
          e.rating++;
          enhanced = true;
        }
        if (e.kind === "buff")
          for (const k of Object.keys(e.stats))
            if (typeof e.stats[k] === "number" && e.stats[k]) {
              e.stats[k] += Math.sign(e.stats[k]);
              enhanced = true;
            }
      }
      if (!enhanced)
        p.effects.push({ kind: "barrier", amount: 3, turns: 2, self: true });
    }
    if (augment === "reaching") {
      if (p.target === "self")
        p.effects.push({ kind: "buff", stats: { movement: 1 }, turns: 1 });
      else p.range += 2;
    }
    if (augment === "enduring") {
      p.category = "main";
      let extended = false;
      for (const e of p.effects) {
        if (e.turns) {
          e.turns++;
          extended = true;
        }
        if (e.rounds) {
          e.rounds++;
          extended = true;
        }
      }
      if (!extended)
        p.effects.push({
          kind: "buff",
          stats: { reduction: 1 },
          turns: 2,
          self: true,
        });
    }
    return p;
  },
  buildDamage(h, target, spec, type, tier, hidden = false) {
    if (!this.C.gamePowers) return 0;
    let n =
      this.buildStat(h, "damage") +
      this.buildStat(h, type) +
      (spec?.damageModifier ?? 0);
    if (spec?.spell) n += this.buildStat(h, "spell");
    if (tier === 2)
      n += this.buildStat(h, "critical") + weaponBonus(h, spec, "strongDamage");
    if (hidden)
      n += this.buildStat(h, "ambush") + weaponBonus(h, spec, "hiddenDamage");
    if (this.budgets?.[h.id]?.movementSpent > 0)
      n += this.buildStat(h, "moveDamage");
    if (
      this.party.some(
        (a) => a !== h && this.canAct(a) && distance(a, target) <= 1,
      )
    )
      n += this.buildStat(h, "flanker");
    if (target.conditions?.some((c) => c.key === "burning"))
      n += this.buildStat(h, "burningDamage");
    if (
      type === "physical" &&
      target.conditions?.some((c) => c.key === "freezing")
    ) {
      n += 2 + this.buildStat(h, "shatter");
      target.conditions = this.R.reduceTemporary(
        target.conditions,
        "freezing",
        1,
      );
      this.emit("feedback", { id: target.id, kind: "status", text: "SHATTER" });
    }
    return n;
  },
  enchantmentDamage(h, effect, primaryType) {
    return Math.max(
      0,
      effect.value +
        (effect.type === primaryType ? 0 : this.buildStat(h, effect.type)),
    );
  },
  buildAfterHit(h, target, spec, type, enchantments = []) {
    if (!this.C.gamePowers) return;
    if (target.hp > 0 && spec?.weapon && this.buildStat(h, "venom"))
      this.powerCondition(target, "poisoned", this.buildStat(h, "venom"), h.id);
    for (const element of new Set([type, ...enchantments.map((e) => e.type)])) {
      if (
        target.hp > 0 &&
        element === "cold" &&
        this.buildStat(h, "permafrost")
      )
        this.powerCondition(target, "freezing", 1, h.id);
      if (element === "fire" && this.buildStat(h, "wildfire"))
        for (const e of this.enemies.filter(
          (e) => e !== target && e.hp > 0 && distance(e, target) <= 1,
        ))
          this.powerCondition(e, "burning", 1, h.id);
      if (element === "lightning" && surfaceAt(this.map, target, "water")) {
        this.emit("feedback", {
          id: target.id,
          kind: "status",
          text: "CONDUCT",
        });
        for (const e of this.enemies.filter(
          (e) => e !== target && e.hp > 0 && distance(e, target) <= 2,
        ))
          this.powerDamage(e, 2 + this.buildStat(h, "chain"), "lightning", h);
      }
    }
    if (target.hp <= 0) {
      if (this.buildStat(h, "killHeal") > 0)
        this.powerHeal(h, this.buildStat(h, "killHeal"));
      if (this.buildStat(h, "killMove") > 0)
        this.powerBuff(
          h,
          h,
          { movement: this.buildStat(h, "killMove") },
          1,
          "build-kill-move",
        );
    }
  },
};
