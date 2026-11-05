import { ABILITIES } from "./abilities.mjs";
import { distance, lineOfSight, key } from "./dungeon.mjs";
export const tacticMethods = {
  activeTactics(h) {
    if (this.mode !== "combat") return [];
    return (h.tactics ?? []).filter((e) => e.expires >= h.survival.ownTurn);
  },
  tacticValue(h, key) {
    return (
      Math.max(0, ...this.activeTactics(h).map((e) => e.effects[key] ?? 0)) +
      Math.min(0, ...this.activeTactics(h).map((e) => e.effects[key] ?? 0))
    );
  },
  addTactic(actor, h, effects, id) {
    if (effects.cleanse)
      for (const c of effects.cleanse)
        h.conditions = this.R.reduceTemporary(h.conditions, c, effects.amount);
    if (effects.stabilize && h.survival.status === "dying")
      h.survival = this.R.stabilize(h.survival);
    if (effects.stand)
      h.conditions = h.conditions.filter((c) => c.key !== "prone");
    if (effects.pull && h !== actor)
      for (let n = 0; n < effects.pull && distance(h, actor) > 1; n++) {
        const point = {
          x: h.x + Math.sign(actor.x - h.x),
          z: h.z + Math.sign(actor.z - h.z),
        };
        if (
          !this.map.tiles[key(point.x, point.z)] ||
          this.map.obstacles[key(point.x, point.z)] ||
          !lineOfSight(this.map, h, point) ||
          [...this.party, ...this.enemies].some(
            (a) =>
              a !== h &&
              a.x === point.x &&
              a.z === point.z &&
              a.survival?.status !== "dead" &&
              (a.hp ?? 1) > 0,
          )
        )
          break;
        Object.assign(h, point);
      }
    if (effects.reveal)
      for (const p of Object.values(this.map.tiles))
        if (distance(actor, p) <= 8) this.seen[key(p.x, p.z)] = true;
    const persistent = Object.fromEntries(
      Object.entries(effects).filter(
        ([k]) =>
          ![
            "cleanse",
            "amount",
            "stand",
            "stabilize",
            "pull",
            "reveal",
            "gather",
          ].includes(k),
      ),
    );
    if (Object.keys(persistent).length) {
      this.emit("feedback", {
        id: h.id,
        kind: "recovery",
        text:
          this.C.choices.find((c) => c.id === id)?.name ?? "Tactical effect",
      });
      h.tactics = this.activeTactics(h).filter((e) => e.id !== id);
      h.tactics.push({
        id,
        source: actor.id,
        effects: persistent,
        expires: h.survival.ownTurn + (h === actor ? 0 : 1),
      });
      if (effects.movement && this.encounter?.current === h.id) {
        this.budgets[h.id].bonusMovement = Math.max(
          this.budgets[h.id].bonusMovement ?? 0,
          effects.movement,
        );
      }
    }
  },
  useTactic(id, targetId) {
    const a = ABILITIES[id],
      h = this.active;
    const reason = this.actionReason(id, h);
    if (reason) throw new Error(reason);
    let target =
      a.target === "self" ? h : this.party.find((p) => p.id === targetId);
    if (!target || ["dead", "lastWords"].includes(target.survival.status))
      throw new Error("Choose a living companion.");
    if (
      a.range &&
      (distance(h, target) > (a.range === 1 ? this.touchRange(h) : a.range) ||
        !lineOfSight(this.map, h, target))
    )
      throw new Error("Choose a companion in range with a clear path.");
    if (!this.continuingProvocation && a.once && h.signatureUses?.includes(id))
      throw new Error("Already used this encounter.");
    if (this.mode === "combat") {
      this.spend(a.category, id);
      if (
        (a.spell || a.supply || a.tactic.stand) &&
        this.provoke(h, {
          kind: "ability",
          id,
          target: targetId,
          label: a.spell
            ? "casting"
            : a.supply
              ? "retrieving a supply"
              : "standing up",
        })
      )
        return;
    } else if (!a.tactic.gather) this.advanceTime(60, { provisions: true });
    if (a.tactic.gather) this.gatherFood(h);
    if (a.once) (h.signatureUses ??= []).push(id);
    const recipients = a.area
      ? this.party.filter(
          (p) =>
            !["dead", "lastWords"].includes(p.survival.status) &&
            distance(p, target) <= a.area &&
            lineOfSight(this.map, target, p),
        )
      : [target];
    for (const p of recipients) this.addTactic(h, p, a.tactic, id);
    this.note(
      `${h.name} · ${this.C.choices.find((c) => c.id === id).name}: ${recipients.map((p) => p.name).join(", ")}.`,
    );
    if (a.supply)
      this.checkSupply(h, this.supplyItem(h, a.supply), "smoke flask used");
    this.syncTorches();
    this.emit("change");
  },
  interceptDamage(h, amount, type, source) {
    const guard = this.activeTactics(h).find((e) => e.effects.guard),
      protector = guard && this.party.find((p) => p.id === guard.source);
    if (
      amount > 0 &&
      protector &&
      protector !== h &&
      this.canAct(protector) &&
      (this.budgets[protector.id]?.remaining.reaction ?? 1) > 0 &&
      distance(protector, h) <= 1
    ) {
      h.tactics = h.tactics.filter((e) => e !== guard);
      this.spendReaction(protector, "intercept");
      this.note(
        `${protector.name} intercepts ${amount} ${type} damage for ${h.name}.`,
      );
      this.suffer(protector, amount, type, source);
      return 0;
    }
    const save = this.activeTactics(h).find((e) => e.effects.lastStand);
    if (
      save &&
      h.survival.status === "active" &&
      h.survival.hp > 0 &&
      amount >= h.survival.hp
    ) {
      h.tactics = h.tactics.filter((e) => e !== save);
      this.note(`${h.name} holds at 1 HP; the protection is spent.`);
      return h.survival.hp - 1;
    }
    return amount;
  },
  spendReaction(h, label) {
    this.budgets[h.id] ??= this.R.startTurn({
      turnId: `opening-${h.id}`,
      speed: this.speed(h),
    });
    this.budgets[h.id] = this.R.declareAction(this.budgets[h.id], {
      operationId: `${label}-${crypto.randomUUID()}`,
      sourceId: "ability-basic-melee",
      category: "reaction",
      ownTurn: false,
      conditions: this.restrictions(h),
    });
  },
  riposte(h, e) {
    const effect = this.activeTactics(h).find((t) => t.effects.riposte);
    if (!effect || e.hp <= 0 || !this.canOpportunity(h) || distance(h, e) > 1)
      return;
    h.tactics = h.tactics.filter((t) => t !== effect);
    this.spendReaction(h, "riposte");
    const spec = { type: "physical", weapon: "melee" },
      d = this.creatureDefense(e, h, spec);
    const r = this.heroRoll(h, "brawn", "attack", {
      target: e,
      spec,
      targetContributions: e.conditions,
      sources: [
        { kind: "boon", amount: d.boons },
        { kind: "bane", amount: d.banes },
      ],
    });
    const damage = this.R.damageEvent({
      components: [
        {
          type: "physical",
          amount: { weak: 2, standard: 3, strong: 5 }[r.tier],
        },
      ],
      resistances: d.resistances,
      weaknesses: this.creatureWeaknesses(e),
    }).total;
    e.hp = Math.max(0, e.hp - damage);
    this.creatureAfterHit(e, h, spec, damage);
    this.defeatEnemy(e);
    this.note(`${h.name} ripostes: ${r.tier}, ${damage} physical damage.`);
    this.emit("attack", {
      attacker: h.id,
      target: e.id,
      damage,
      element: "physical",
    });
  },
};
