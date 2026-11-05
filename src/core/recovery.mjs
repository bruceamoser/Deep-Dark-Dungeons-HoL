import { ABILITIES } from "./abilities.mjs";
import { distance, key } from "./dungeon.mjs";
const uuid = (prefix) => `${prefix}-${crypto.randomUUID()}`;
const durationPolicies = {
  blinded: "independent",
  deafened: "independent",
  asleep: "independent",
  paralyzed: "independent",
};
const helpless = ["paralyzed", "asleep", "unconscious", "petrified"];
export const recoveryMethods = {
  recoveryAbility(id, targetId) {
    const spec = ABILITIES[id],
      h = this.active,
      target = this.party.find((p) => p.id === targetId);
    if (
      !target ||
      distance(h, target) >
        (spec.range === 1 ? this.touchRange(h) : spec.range) ||
      (spec.otherOnly && target === h)
    )
      throw new Error("Choose a willing companion in range.");
    if (
      ["dead", "lastWords"].includes(target.survival.status) ||
      (spec.noDying && target.survival.status === "dying")
    )
      throw new Error(
        "This ability cannot heal that survival state. Stabilize first where required.",
      );
    if (
      spec.freeHand &&
      Number(!!h.torch?.held) +
        h.preview.inventory.items
          .filter((i) => i.held)
          .reduce((n, i) => n + i.hands, 0) >=
        2
    )
      throw new Error("A free hand is required.");
    if (spec.hpCost && h.survival.hp <= spec.hpCost)
      throw new Error("The HP cost must leave the caster above 0 HP.");
    if (
      !spec.healing &&
      !target.conditions.some(
        (c) => c.key === spec.reduce && c.persistence === "temporary",
      )
    )
      throw new Error("There is no matching temporary condition to reduce.");
    this.spend(spec.category, id);
    if (
      (spec.hpCost || spec.spell) &&
      this.provoke(h, {
        kind: "recovery",
        id,
        target: targetId,
        label: "casting",
      })
    )
      return;
    h.survival.hp -= spec.hpCost ?? 0;
    const rolled = spec.attribute
        ? this.heroRoll(h, spec.attribute)
        : { tier: "standard" },
      tier = ["weak", "standard", "strong"].indexOf(rolled.tier);
    if (spec.healing) {
      const heal = this.R.healingPlan({
        amount: spec.healing[tier],
        current: target.survival.hp,
        max: this.healingMaximum(target),
        lifeResistances: [target.preview.resistances.life ?? 0],
      });
      target.survival = this.R.receiveHealing(target.survival, heal.restored);
      this.note(
        `${h.name}: ${rolled.tier}, restores ${heal.restored} HP to ${target.name}.`,
      );
    }
    if (spec.reduce) {
      const amount = spec.reduction[tier];
      target.conditions = this.R.reduceTemporary(
        target.conditions,
        spec.reduce,
        amount,
      );
      this.note(
        `${target.name}: temporary ${spec.reduce} reduced by ${amount}.`,
      );
    }
    if (spec.standOnStrong && tier === 2)
      target.conditions = target.conditions.filter((c) => c.key !== "prone");
    this.emit("attack", {
      attacker: h.id,
      target: target.id,
      damage: 0,
      spell: true,
      element: "life",
    });
    this.emit("change");
  },
  canAct(h) {
    const c = this.restrictions(h);
    return h.survival.status === "active" && !helpless.some((k) => c[k]);
  },
  speed(h) {
    return Math.max(
      0,
      h.preview.summary.speed -
        h.wounds
          .filter((w) => !w.treatment?.completed)
          .reduce(
            (n, w) =>
              n +
              (w.effects ?? [])
                .filter((e) => e.kind === "movementPenalty")
                .reduce((v, e) => v + e.amount, 0),
            0,
          ),
    );
  },
  woundRollSources(h, attribute) {
    return h.wounds
      .filter((w) => !w.treatment?.completed)
      .flatMap((w) =>
        (w.effects ?? [])
          .filter(
            (e) =>
              e.kind === "rollModifier" &&
              ((e.context === "physical" &&
                ["brawn", "fortitude", "agility"].includes(attribute)) ||
                (e.context === "mental" &&
                  ["guile", "knowledge", "reason"].includes(attribute))),
          )
          .map((e) => ({ kind: e.polarity, amount: e.amount })),
      );
  },
  heroRoll(h, attribute, mode = "attribute", extra = {}) {
    const sources = [
      ...(extra.sources ?? []),
      ...this.R.conditionRollSources(h.conditions, {
        mode: ["craft", "treatment"].includes(mode) ? "attribute" : mode,
        perceivedSources: this.perceivedSources(h),
        ...extra,
      }),
      ...(mode === "death"
        ? []
        : [...this.woundRollSources(h, attribute), ...this.fatigueSources(h)]),
    ];
    return this.rollFor(
      h,
      attribute,
      sources
        .filter((s) => s.kind === "boon")
        .reduce((n, s) => n + s.amount, 0),
      sources
        .filter((s) => s.kind === "bane")
        .reduce((n, s) => n + s.amount, 0),
      { mode, ...extra },
    );
  },
  suffer(h, amount, type = "physical", source = null) {
    amount = this.interceptDamage(h, amount, type, source);
    if (amount > 0)
      h.lastHarm = source?.name
        ? `Fell after ${source.name}'s ${type} attack`
        : `Fell after ${type} harm`;
    if (
      amount > 0 &&
      this.mode === "combat" &&
      source?.id &&
      this.enemies.some((e) => e.id === source.id) &&
      !h.grudgeTaken &&
      this.traits(h).some((t) => t.grudge)
    ) {
      h.grudgeTaken = true;
      h.grudges ??= [];
      const id = this.creatureIdentity(source);
      if (!h.grudges.includes(id)) h.grudges.push(id);
    }
    const prior = h.survival.wounds,
      result = this.R.sufferDamage(h.survival, amount);
    h.survival = result.state;
    if (amount > 0)
      h.conditions = h.conditions.filter((c) => c.key !== "asleep");
    if (result.wound) {
      const roll = this.R.woundRoll(prior, this.dice(Math.min(5, 3 + prior))),
        w = this.R.woundResult(this.C.wounds, type, roll.key);
      Object.assign(w, {
        id: uuid("wound"),
        damageType: type,
        roll,
        source: source?.id ?? source ?? h.id,
        applied: true,
      });
      h.wounds.push(w);
      for (const e of w.effects) {
        if (e.kind === "condition")
          h.conditions.push({
            id: uuid("injury"),
            key: e.key,
            rating: e.rating,
            persistence: e.persistence,
            source: e.requiresSource ? w.source : w.id,
            woundId: w.id,
            order: Date.now() + h.conditions.length,
          });
        if (e.kind === "lastWords")
          h.survival = this.R.enterLastWords(h.survival);
      }
      this.woundNotices ??= [];
      this.woundNotices.push({ heroId: h.id, woundId: w.id });
      this.note(`${h.name}: wound ${roll.key} · ${w.record.injury}.`);
      if (this.woundNotices.length === 1)
        this.emit("wound", { hero: h, wound: w });
    }
    return result;
  },
  acknowledgeWound(direction) {
    const notice = this.woundNotices?.[0];
    if (!notice) return;
    const h = this.party.find((p) => p.id === notice.heroId),
      w = h.wounds.find((w) => w.id === notice.woundId);
    const movement = w.effects.filter((e) => e.kind === "forcedMovement");
    if (
      movement.length &&
      (!direction ||
        !Number.isInteger(direction.x) ||
        !Number.isInteger(direction.z) ||
        Math.max(Math.abs(direction.x), Math.abs(direction.z)) !== 1)
    )
      throw new Error("Choose the direction of displacement.");
    this.woundNotices.shift();
    for (const e of movement) this.forceMove(h, direction, e.distance);
    this.paths.clear();
    this.emit("party");
    if (this.woundNotices.length) {
      const n = this.woundNotices[0],
        p = this.party.find((h) => h.id === n.heroId);
      this.emit("wound", {
        hero: p,
        wound: p.wounds.find((w) => w.id === n.woundId),
      });
    } else if (this.pendingProvocation) this.continueProvocation();
    else this.advance();
    this.emit("change");
  },
  forceMove(actor, dir, amount) {
    if (
      !Number.isInteger(dir?.x) ||
      !Number.isInteger(dir?.z) ||
      Math.max(Math.abs(dir.x), Math.abs(dir.z)) !== 1
    )
      throw new Error("Choose a unit grid direction.");
    const stability = (h) =>
      h.survival
        ? Math.min(
            3,
            (h.preview.summary.stability ?? 0) +
              this.tacticValue(h, "stability"),
          )
        : (h.stability ?? 0);
    let remaining = Math.max(0, amount - stability(actor));
    const group = [actor],
      charged = new Set([actor.id]);
    const actors = () => [
      ...this.party.filter((h) => h.survival.status !== "dead"),
      ...this.enemies.filter((e) => e.hp > 0),
    ];
    const hit = (h, n) => {
      const damage = this.R.damageEvent({
        components: [{ type: "physical", amount: n }],
        resistances: h.survival
          ? Object.entries(h.preview.resistances).map(([type, value]) => ({
              type,
              value,
            }))
          : this.creatureResistances(h),
      }).total;
      if (h.survival) this.suffer(h, damage, "physical", actor);
      else {
        h.hp = Math.max(0, h.hp - damage);
        this.defeatEnemy(h);
      }
      this.note(`${h.name}: ${damage} collision damage.`);
    };
    let collision = false;
    while (remaining > 0) {
      const next = group.map((h) => ({ x: h.x + dir.x, z: h.z + dir.z }));
      const hard = next.some(
        (p, i) =>
          !this.map.tiles[key(p.x, p.z)] ||
          this.map.obstacles?.[key(p.x, p.z)] ||
          (dir.x &&
            dir.z &&
            (!this.map.tiles[key(group[i].x + dir.x, group[i].z)] ||
              !this.map.tiles[key(group[i].x, group[i].z + dir.z)] ||
              this.map.obstacles?.[key(group[i].x + dir.x, group[i].z)] ||
              this.map.obstacles?.[key(group[i].x, group[i].z + dir.z)])),
      );
      if (hard) {
        for (const h of group) hit(h, remaining + 1);
        collision = true;
        break;
      }
      const contacts = actors().filter(
        (h) =>
          !group.includes(h) && next.some((p) => p.x === h.x && p.z === h.z),
      );
      if (contacts.length) {
        for (const h of [...group, ...contacts]) hit(h, remaining);
        collision = true;
        for (const h of contacts) {
          group.push(h);
          if (!charged.has(h.id)) {
            remaining = Math.max(0, remaining - stability(h));
            charged.add(h.id);
          }
        }
        if (!remaining) break;
        continue;
      }
      group.forEach((h, i) => Object.assign(h, next[i]));
      remaining -= Math.max(
        ...next.map((p) => (this.map.tiles[key(p.x, p.z)].difficult ? 2 : 1)),
      );
    }
    if (collision) {
      const p = { x: actor.x - dir.x, z: actor.z - dir.z };
      if (
        this.map.tiles[key(p.x, p.z)] &&
        !this.map.obstacles?.[key(p.x, p.z)] &&
        !actors().some((h) => h !== actor && h.x === p.x && h.z === p.z)
      )
        Object.assign(actor, p);
    }
    this.syncTorches();
    this.emit("move");
  },
  tickHeroConditions(h) {
    const plan = this.R.conditionEndPlan(h.conditions, {
      turnId: uuid("condition"),
      durationPolicies,
      resistances: Object.entries(h.preview.resistances).map(
        ([type, value]) => ({ type, value }),
      ),
    });
    if (!plan.ready) throw new Error("A condition duration policy is missing.");
    const prior = h.conditions;
    h.conditions = plan.contributions;
    // Explicit dungeon ordering: Burning, Freezing, Bleeding; each is its own event.
    for (const key of ["burning", "freezing", "bleeding"]) {
      const e = plan.events.find((e) => e.condition === key);
      if (!e) continue;
      this.suffer(
        h,
        e.damage.total,
        key === "burning" ? "fire" : key === "freezing" ? "cold" : "physical",
        prior.find((c) => c.key === key)?.source,
      );
      this.note(
        `${h.name}: ${e.damage.total} ${key} damage; temporary severity decays afterward.`,
      );
    }
  },
  reduceCondition(targetId, condition) {
    if (this.mode !== "combat" || this.busy)
      throw new Error("Use this on your combat turn.");
    const h = this.active,
      target = this.party.find((p) => p.id === targetId);
    if (
      !target ||
      distance(h, target) > 1 ||
      !["burning", "freezing", "bleeding"].includes(condition)
    )
      throw new Error(
        "Choose yourself or an adjacent companion, and Bleeding, Burning or Freezing.",
      );
    if (
      !target.conditions.some(
        (c) => c.key === condition && c.persistence === "temporary",
      )
    )
      throw new Error(
        "No temporary rating can be reduced; persistent injury sources need their printed remedy.",
      );
    const next = this.R.reduceTemporary(target.conditions, condition, 1);
    this.spend("main", "ability-reduce-a-condition");
    target.conditions = next;
    this.note(`${h.name} reduces ${target.name}’s ${condition} by 1.`);
    this.emit("change");
  },
  drinkPotion(index, instanceId, targetId = this.party[index].id) {
    const h = this.party[index],
      target = this.party.find((p) => p.id === targetId),
      item = h.preview.inventory.items.find(
        (i) => i.instanceId === instanceId && i.carried,
      );
    if (
      !["town", "exploration", "combat"].includes(this.mode) ||
      this.busy ||
      this.woundNotices?.length
    )
      throw new Error("Finish the pending event first.");
    if (!this.canAct(h)) throw new Error("The giver cannot handle a potion.");
    if (!target || !item || !this.R.HEALING_POTION_IDS.includes(item.catalogId))
      throw new Error("Choose an owned healing potion and companion.");
    if ((h.supplies[instanceId] ?? item.inventoryDie) !== 4)
      throw new Error("This bottle is exhausted.");
    if (target.survival.hp >= this.healingMaximum(target))
      throw new Error("This companion is already at full health.");
    if (this.freeHands(h) < 1)
      throw new Error("A free hand is required to use a potion.");
    const combat = this.mode === "combat";
    if (combat) {
      if (h !== this.active || this.encounter.nextSide !== "players")
        throw new Error("Only the acting hero can give a potion.");
      if (!this.encounter.current) this.beginHero();
      if (!this.continuingProvocation && !this.budget.remaining.maneuver)
        throw new Error("No Maneuver remains.");
    }
    const turn = (who) =>
      this.budgets[who.id] ??
      this.R.startTurn({
        turnId: uuid("potionturn"),
        speed: this.speed(who),
      });
    if (
      combat &&
      target !== h &&
      target.survival.hp > 0 &&
      !turn(target).remaining.reaction
    )
      throw new Error("The recipient needs a Reaction.");
    if (
      combat &&
      target !== h &&
      target.survival.hp > 0 &&
      !this.canAct(target)
    )
      throw new Error(
        "The conscious recipient cannot take the required Reaction.",
      );
    const potionTurn = turn(h);
    const declaringTurn = this.continuingProvocation
      ? {
          ...potionTurn,
          remaining: {
            ...potionTurn.remaining,
            maneuver: potionTurn.remaining.maneuver + 1,
          },
        }
      : potionTurn;
    const plan = this.R.planHealingPotion({
      operationId: uuid("potion"),
      recipientOperationId: uuid("receive"),
      potionId: item.catalogId,
      catalog: this.C.inventory,
      inventoryDie: 4,
      giver: {
        actorId: h.id,
        items: h.preview.inventory.items.map((i) => ({
          ...i,
          id: i.instanceId,
          hands: i.hands ?? 0,
        })),
        turn: declaringTurn,
        ownTurn: true,
        survival: h.survival,
        conditions: this.restrictions(h),
      },
      recipient: {
        actorId: target.id,
        turn: turn(target),
        survival: { ...target.survival, maxHp: this.healingMaximum(target) },
        conditions: this.restrictions(target),
        lifeResistances: [target.preview.resistances.life ?? 0],
      },
      relation: target === h ? "self" : "other",
      adjacent: distance(h, target) <= this.touchRange(h),
      willing: true,
      capable: true,
      encounter: combat,
    });
    if (combat && !this.continuingProvocation) {
      this.budgets[h.id] = plan.giverTurn;
      if (
        this.provoke(h, {
          kind: "potion",
          index,
          item: instanceId,
          target: targetId,
          label: "retrieving a potion",
        })
      )
        return;
    }
    const result = this.R.resolveHealingPotionInventory(plan, {
      retained: this.supplyDie(4),
    });
    if (combat) {
      this.budgets[h.id] = plan.giverTurn;
      if (target !== h) this.budgets[target.id] = plan.recipientTurn;
    }
    target.survival = {
      ...result.recipientSurvival,
      maxHp: target.survival.maxHp,
    };
    h.supplies[instanceId] = result.inventory.after;
    if (result.inventory.exhausted)
      this.supplyNotice(
        h,
        item,
        `${item.definition.name} is exhausted after this use.`,
      );
    this.note(
      `${h.name} gives ${target.name} ${item.definition.name}: ${result.healing.restored} HP restored${result.inventory.exhausted ? "; bottle exhausted" : ""}.`,
    );
    this.emit("change");
  },
  supplyDie(sides) {
    return 1 + Math.floor(Math.random() * sides);
  },
  treatmentOptions(patient, wound) {
    if (!wound.record.recoveryValue || wound.treatment?.completed) return [];
    return this.party.flatMap((h, index) =>
      h.preview.state.abilities
        .filter((id) => id.startsWith("ability-treat-"))
        .flatMap((id) => {
          try {
            const c = this.R.treatmentCardAdapter(
              id.replace("ability-", ""),
              this.C.inventory,
            );
            return c.capability === wound.record.capability && this.canAct(h)
              ? [{ healer: index, card: c }]
              : [];
          } catch {
            return [];
          }
        }),
    );
  },
  treatWound(patientIndex, woundId, healerIndex, cardId) {
    if (this.mode !== "town")
      throw new Error("One-hour wound treatment requires safety in Greyhaven.");
    const patient = this.party[patientIndex],
      healer = this.party[healerIndex],
      w = patient.wounds.find((w) => w.id === woundId);
    if (
      !w ||
      !this.treatmentOptions(patient, w).some(
        (o) => o.healer === healerIndex && o.card.id === cardId,
      )
    )
      throw new Error("Choose a capable healer with the matching treatment.");
    const card = this.R.treatmentCardAdapter(cardId, this.C.inventory);
    const reservation = this.R.reserveWoundTreatment({
      operationId: uuid("treatment"),
      dayKey: `day-${this.clock().day}`,
      elapsedHours: 1,
      cardId,
      woundId: w.record.id,
      woundEventId: w.id,
      inventoryCatalog: this.C.inventory,
      woundCatalog: this.C.wounds,
      treatment: w.treatment ?? null,
      healer: {
        actorId: healer.id,
        survival: healer.survival,
        learnedAbilityIds: healer.preview.state.abilities,
        ownTurn: true,
        turn: this.R.startTurn({
          turnId: uuid("care"),
          speed: this.speed(healer),
        }),
        conditions: this.restrictions(healer),
      },
      target: {
        actorId: patient.id,
        survival: patient.survival,
        relation: patient === healer ? "self" : "other",
        willing: true,
        kind: "character",
      },
      woundApplicable: true,
    });
    const result = this.heroRoll(healer, card.attribute, "treatment");
    const settled = this.R.settleWoundTreatment({
      reservation,
      currentTreatment: reservation.treatment,
      attribute: card.attribute,
      outcome: result.tier,
    });
    w.treatment = structuredClone(settled.treatment);
    this.advanceTime(3600, { provisions: true });
    if (w.treatment.completed)
      patient.conditions = patient.conditions.filter(
        (c) => !(c.woundId === w.id && c.persistence === "starred"),
      );
    this.note(
      `${healer.name} treats ${patient.name}: ${result.tier}, recovery ${w.treatment.progress}/${w.record.recoveryValue}. ${w.treatment.completed ? "Penalties relieved; scar and wound count remain." : "One hour passes."}`,
    );
    this.emit("change");
  },
  nextTreatmentDay() {
    if (this.mode !== "town")
      throw new Error("Wait for treatment in Greyhaven.");
    const seconds = 86400 - ((this.clock().seconds + 8 * 3600) % 86400);
    this.advanceTime(seconds, { provisions: true });
    this.note(
      "A new treatment day begins. Wounds, HP and spent Grit are unchanged.",
    );
    this.emit("change");
  },
};
