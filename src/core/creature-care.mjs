import { distance, lineOfSight, key } from "./dungeon.mjs";
import { surfaceAt } from "./battlefield.mjs";
import { reachableCells, safestReachableCells } from "./movement.mjs";

export const creatureCareMethods = {
  enemyDanger(e, point) {
    let risk = 0;
    for (const [kind, type, amount] of [
      ["fire", "fire", 2],
      ["trap", "mental", 5],
    ]) {
      if (!surfaceAt(this.map, point, kind)) continue;
      risk += this.R.damageEvent({
        components: [{ type, amount }],
        resistances: this.creatureResistances(e),
        weaknesses: this.creatureWeaknesses(e),
      }).total;
      if (
        kind === "fire" &&
        !this.creature(e)?.immunities.some((i) => i.toLowerCase() === "burning")
      )
        risk += 3;
    }
    return risk;
  },
  enemyMovementCells(e, budget, blocked, cost) {
    if (!(this.map.zones ?? []).some((z) => ["fire", "trap"].includes(z.kind)))
      return reachableCells(this.map, e, budget, blocked, cost).map((p) => ({
        ...p,
        risk: 0,
      }));
    const risks = new Map();
    return safestReachableCells(this.map, e, budget, blocked, cost, (p) => {
      const k = key(p.x, p.z);
      if (!risks.has(k)) risks.set(k, this.enemyDanger(e, p));
      return risks.get(k);
    });
  },
  enemyCare(e, { othersOnly = false } = {}) {
    if (e.hp <= 0 || !this.enemyCapable(e) || !e.retained?.includes("main"))
      return false;
    const target = this.enemyTarget(e),
      action = this.creatureAction(e),
      canAttack =
        target &&
        distance(e, target) <= action.range &&
        lineOfSight(this.map, e, target);
    const options = [];
    for (const ally of this.enemies.filter(
      (a) =>
        (!othersOnly || a !== e) &&
        a.hp > 0 &&
        a.group === e.group &&
        distance(e, a) <= 1 &&
        lineOfSight(this.map, e, a),
    )) {
      for (const condition of ["burning", "freezing", "bleeding"]) {
        if (
          !(ally.conditions ?? []).some(
            (c) =>
              c.key === condition &&
              c.persistence === "temporary" &&
              c.rating > 0,
          )
        )
          continue;
        const rating = this.R.conditionSummary(ally.conditions)[condition]
          .rating;
        const damage =
          condition === "bleeding"
            ? rating
            : this.R.damageEvent({
                components: [
                  {
                    type: condition === "burning" ? "fire" : "cold",
                    amount: rating,
                  },
                ],
                resistances: this.creatureResistances(ally),
              }).total;
        const lethal = damage >= ally.hp;
        if (rating < 2 && !lethal && canAttack) continue;
        options.push({
          ally,
          condition,
          score: rating * 2 + (lethal ? 100 : 0) + Number(ally === e),
        });
      }
    }
    const choice = options.sort((a, b) => b.score - a.score)[0];
    if (!choice) return false;
    choice.ally.conditions = this.R.reduceTemporary(
      choice.ally.conditions,
      choice.condition,
      1,
    );
    e.retained = e.retained.filter((c) => c !== "main");
    const label = {
      burning: "Smother flames",
      freezing: "Warm affected area",
      bleeding: "Apply pressure",
    }[choice.condition];
    e.aiState ??= {};
    e.aiState.action = label;
    this.enemyAnnounce(e, label);
    this.note(
      `${e.name} reduces ${choice.ally.name}'s ${choice.condition} by 1 · Main action.`,
    );
    return true;
  },
};
