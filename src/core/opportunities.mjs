import { activeItemEffects } from "./treasure.mjs";
import { distance, lineOfSight } from "./dungeon.mjs";
export const opportunityMethods = {
  canOpportunity(actor) {
    if (actor.survival)
      return (
        this.canAct(actor) &&
        !!this.held(actor, "item-ordinary-melee-weapon") &&
        (this.budgets[actor.id]?.remaining.reaction ?? 1) > 0 &&
        !this.restrictions(actor).blinded
      );
    return (
      actor.hp > 0 &&
      this.enemyCapable(actor) &&
      !actor.reactionUsed &&
      !this.R.conditionSummary(actor.conditions ?? []).blinded.active
    );
  },
  provoke(actor, operation, points = null) {
    if (this.continuingProvocation || this.mode !== "combat") return false;
    if (
      points &&
      (actor.survival
        ? this.budgets[actor.id]?.disengaged ||
          this.tacticValue(actor, "disengage")
        : actor.disengaged)
    )
      return false;
    const opponents = actor.survival ? this.enemies : this.party;
    const threats = opponents.filter(
      (other) =>
        this.canOpportunity(other) &&
        this.encounter.roster.some((r) => r.id === other.id && !r.withdrawn) &&
        (points
          ? [actor, ...points.slice(0, -1)].some(
              (from, i) =>
                distance(from, other) <= 1 &&
                distance(points[i], other) > 1 &&
                lineOfSight(this.map, from, other),
            )
          : distance(actor, other) <= 1 && lineOfSight(this.map, actor, other)),
    );
    if (!threats.length) return false;
    this.pendingProvocation = {
      actor: actor.id,
      operation,
      attackers: threats.map((t) => t.id),
      cursor: 0,
    };
    this.busy = true;
    this.note(
      `${actor.name} provokes an opportunity attack · ${operation.label ?? operation.kind}.`,
    );
    this.continueProvocation();
    return true;
  },
  continueProvocation() {
    const p = this.pendingProvocation;
    if (
      !p ||
      this.pendingDefense ||
      this.woundNotices?.length ||
      this.suspended
    )
      return;
    const actor = [...this.party, ...this.enemies].find(
      (a) => a.id === p.actor,
    );
    const capable = () =>
      actor.survival
        ? this.canAct(actor)
        : actor.hp > 0 && this.enemyCapable(actor);
    while (capable() && p.cursor < p.attackers.length) {
      const attacker = [...this.party, ...this.enemies].find(
        (a) => a.id === p.attackers[p.cursor],
      );
      if (!attacker || !this.canOpportunity(attacker)) {
        p.cursor++;
        continue;
      }
      if (attacker.survival) {
        this.emit("opportunity", { hero: attacker, enemy: actor });
        return;
      }
      attacker.reactionUsed = true;
      p.cursor++;
      if (this.canBlock(actor)) {
        this.pendingDefense = {
          attacker: attacker.id,
          target: actor.id,
          opportunity: true,
        };
        this.emit("reaction", { hero: actor, enemy: attacker });
        return;
      }
      this.resolveEnemyHit(attacker, actor, true);
      if (this.woundNotices?.length) return;
    }
    this.pendingProvocation = null;
    this.busy = false;
    if (!capable()) {
      this.paths.delete(actor.id);
      this.note(
        `${actor.name} cannot continue. The declared action remains spent; unused HP and supplies are retained.`,
      );
      if (!actor.survival) this.finishEnemyTurn(actor);
      this.advance();
      this.emit("change");
      return;
    }
    const o = p.operation;
    this.continuingProvocation = true;
    try {
      if (o.kind === "move") this.step();
      else if (o.kind === "ability") this.useAbility(o.id, o.target, o.options);
      else if (o.kind === "recovery") this.recoveryAbility(o.id, o.target);
      else if (o.kind === "potion") this.drinkPotion(o.index, o.item, o.target);
      else if (o.kind === "equip")
        this.equip(o.index, o.item, o.operation, o.slot);
      else if (o.kind === "stand") this.stand();
      else if (o.kind === "torch") this.toggleTorch(o.index);
      else if (o.kind === "lantern") this.toggleLantern(o.index);
      else if (o.kind === "enemy-move") {
        Object.assign(actor, o.points[0]);
        this.continuingProvocation = false;
        this.enemyTravel(
          actor,
          this.party.find((h) => h.id === o.target),
          o.points.slice(1),
        );
      } else if (o.kind === "enemy-stand") {
        actor.conditions = (actor.conditions ?? []).filter(
          (c) => c.key !== "prone",
        );
        this.continuingProvocation = false;
        this.enemyTravel(
          actor,
          this.party.find((h) => h.id === o.target),
          o.points ?? [],
        );
      } else if (o.kind === "enemy") {
        if (o.points?.length) Object.assign(actor, o.points.at(-1));
        actor.conditions = (actor.conditions ?? []).filter(
          (c) => c.key !== "prone",
        );
        this.enemyAttack(
          actor,
          this.party.find((h) => h.id === o.target),
        );
      }
    } finally {
      this.continuingProvocation = false;
    }
  },
  resolveOpportunity(use) {
    const p = this.pendingProvocation;
    if (!p || this.pendingDefense)
      throw new Error("There is no pending opportunity attack.");
    const h = this.party.find((h) => h.id === p.attackers[p.cursor]),
      e = this.enemies.find((e) => e.id === p.actor);
    if (!h || !e) throw new Error("Invalid opportunity attacker.");
    if (use) {
      if (!this.canOpportunity(h))
        throw new Error("Requires a readied melee weapon and Reaction.");
      this.budgets[h.id] ??= this.R.startTurn({
        turnId: `opening-${h.id}`,
        speed: this.speed(h),
      });
      this.budgets[h.id] = this.R.declareAction(this.budgets[h.id], {
        operationId: `opportunity-${crypto.randomUUID()}`,
        sourceId: "ability-basic-melee",
        category: "reaction",
        ownTurn: false,
        conditions: this.restrictions(h),
      });
      const spec = { type: "physical", weapon: "melee" },
        defense = this.creatureDefense(e, h, spec);
      const result = this.heroRoll(h, "brawn", "attack", {
        target: e,
        spec,
        targetContributions: e.conditions ?? [],
        sources: [
          { kind: "boon", amount: defense.boons },
          { kind: "bane", amount: defense.banes },
        ],
      });
      // Basic Melee only. No substitute action, free weapon draw, or extra Main.
      const effects = activeItemEffects(
        h,
        this.held(h, "item-ordinary-melee-weapon"),
      ).filter((x) => x.effect === "damage");
      const damage = this.R.damageEvent({
        components: [
          {
            type: "physical",
            amount: { weak: 2, standard: 3, strong: 5 }[result.tier],
          },
          ...effects.map((x) => ({ type: x.type, amount: x.value })),
        ],
        resistances: defense.resistances,
        weaknesses: this.creatureWeaknesses(e),
      });
      e.hp = Math.max(0, e.hp - damage.total);
      if (result.tier === "strong")
        for (const effect of effects)
          if (
            effect.condition &&
            !this.creature(e)?.immunities.some(
              (i) => i.toLowerCase() === effect.condition,
            )
          )
            (e.conditions ??= []).push({
              id: `effect-${crypto.randomUUID()}`,
              key: effect.condition,
              rating: 1,
              source: h.id,
              persistence: "temporary",
            });
      this.note(
        `${h.name} · opportunity Basic Melee: ${result.tier}, ${damage.total} damage to ${e.name}.`,
      );
      this.emit("attack", {
        attacker: h.id,
        target: e.id,
        damage: damage.total,
        element: "physical",
      });
      this.creatureAfterHit(e, h, spec, damage.total);
      this.defeatEnemy(e);
    }
    p.cursor++;
    this.continueProvocation();
    this.emit("change");
  },
};
