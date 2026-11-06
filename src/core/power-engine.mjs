import { POWERS, mappedPower } from "./powers.mjs";
import { distance, key, lineOfSight, pathfind } from "./dungeon.mjs";
import { surfaceAt, wallAt } from "./battlefield.mjs";
import { activeItemEffects } from "./treasure.mjs";
const alive = (h) =>
  h.survival ? !["dead", "lastWords"].includes(h.survival.status) : h.hp > 0;
const value = (n, tier) => (Array.isArray(n) ? n[tier] : n);
export const powerMethods = {
  powerForceMove(actor, dir, amount, source = null) {
    if (!dir.x && !dir.z) return;
    for (let i = 0; i < amount; i++) {
      const next = { x: actor.x + dir.x, z: actor.z + dir.z };
      const wall =
        !this.map.tiles[key(next.x, next.z)] ||
        this.map.obstacles[key(next.x, next.z)] ||
        wallAt(this.map, next.x, next.z) ||
        !lineOfSight(this.map, actor, next);
      if (wall) {
        const impact =
          2 +
          (amount - i) +
          (source ? (this.buildStat?.(source, "impact") ?? 0) : 0);
        const dealt = this.powerDamage(actor, impact, "physical", source);
        this.emit("feedback", {
          id: actor.id,
          kind: "damage",
          text: `WALL SLAM · ${dealt}`,
        });
        this.note(
          `${actor.name} slams into a wall (${impact} physical impact before resistance).`,
        );
        break;
      }
      if (this.occupied(actor.id).has(key(next.x, next.z))) break;
      if (
        dir.x &&
        dir.z &&
        [
          { x: actor.x + dir.x, z: actor.z },
          { x: actor.x, z: actor.z + dir.z },
        ].some(
          (p) =>
            !this.map.tiles[key(p.x, p.z)] ||
            this.map.obstacles[key(p.x, p.z)] ||
            wallAt(this.map, p.x, p.z),
        )
      )
        break;
      Object.assign(actor, next);
      this.surfaceContact(actor, { entry: true });
      if (!alive(actor)) break;
    }
    this.emit("move");
  },
  powerIds(h) {
    return [
      ...new Set(
        h.preview.state.abilities.map((id) =>
          this.C.gamePowers ? mappedPower(id, this.C) : id,
        ),
      ),
    ];
  },
  powerStat(h, name) {
    const xs = (h.powerEffects ?? []).filter(
      (e) =>
        e.expiresAt > this.clock().seconds &&
        (this.mode !== "combat" || e.expiresTurn >= (h.powerTurn ?? 0)),
    );
    return (
      (["attack", "defense", "movement", "dr", "reduction"].includes(name)
        ? (this.buildStat?.(h, name) ?? 0)
        : 0) +
      Math.max(0, ...xs.map((e) => Number(e.stats[name]) || 0)) +
      Math.min(0, ...xs.map((e) => Number(e.stats[name]) || 0))
    );
  },
  powerBuff(actor, target, stats, turns = 2, id = "effect") {
    target.powerEffects = (target.powerEffects ?? []).filter(
      (e) => e.id !== id,
    );
    target.powerEffects.push({
      id,
      source: actor.id,
      stats: { ...stats },
      expiresTurn:
        (target.powerTurn ?? 0) + turns - 1 + (target !== actor ? 1 : 0),
      expiresAt: this.clock().seconds + Math.max(60, turns * 6),
    });
    this.emit("feedback", {
      id: target.id,
      kind: "recovery",
      text: this.C.choices.find((c) => c.id === id)?.name ?? "Power effect",
    });
    if (stats.movement && target === this.active && this.budget)
      this.budget.bonusMovement = Math.max(
        this.budget.bonusMovement ?? 0,
        stats.movement,
      );
    if (stats.disengage && target === this.active && this.budget)
      this.budget.disengaged = true;
  },
  consumeDamageBonus(h) {
    const n = this.powerStat(h, "damage");
    for (const e of h.powerEffects ?? []) delete e.stats.damage;
    return n;
  },
  breakConcealment(h) {
    for (const e of h.powerEffects ?? []) delete e.stats.hidden;
  },
  powerTargetable(h, observer) {
    return (
      !this.powerStat(h, "hidden") ||
      distance(h, observer) <= 1 ||
      surfaceAt(this.map, h, "light")
    );
  },
  powerCondition(target, condition, rating, source) {
    if (
      !alive(target) ||
      (!target.survival &&
        this.creature(target)?.immunities?.some(
          (i) => i.toLowerCase() === condition,
        ))
    )
      return;
    target.conditions ??= [];
    const id = `power-condition-${source}-${condition}`;
    const previous = target.conditions.find((c) => c.id === id);
    const severity = [
      "burning",
      "freezing",
      "bleeding",
      "poisoned",
      "frightened",
      "slowed",
      "dazed",
    ].includes(condition);
    if (severity) rating += previous?.rating ?? 0;
    target.conditions = target.conditions.filter((c) => c.id !== id);
    target.conditions.push({
      id,
      key: condition,
      rating,
      source,
      order: this.encounter?.serial ?? 0,
      persistence: condition === "prone" ? "binary" : "temporary",
    });
  },
  powerHeal(target, amount) {
    if (!alive(target) || !target.survival) return 0;
    const healed = this.R.healingPlan({
      amount,
      current: target.survival.hp,
      max: this.healingMaximum(target),
      lifeResistances: [target.preview.resistances.life ?? 0],
    }).restored;
    target.survival = this.R.receiveHealing(target.survival, healed);
    return healed;
  },
  powerResistances(target, base) {
    const delta = this.powerStat(target, "dr");
    if (!delta) return base;
    const physical = Math.max(
      0,
      ...base.filter((r) => r.type === "physical").map((r) => r.value),
    );
    return [
      ...base.filter((r) => r.type !== "physical"),
      { type: "physical", value: Math.max(0, Math.min(3, physical + delta)) },
    ];
  },
  absorbPowerDamage(target, amount, type) {
    if (amount <= 0) return 0;
    let result = Math.max(0, amount - this.powerStat(target, "reduction"));
    const shield = (target.powerEffects ?? [])
      .filter(
        (e) =>
          e.expiresAt > this.clock().seconds &&
          e.expiresTurn >= (target.powerTurn ?? 0) &&
          e.stats.absorb > 0,
      )
      .sort((a, b) => b.stats.absorb - a.stats.absorb)[0];
    if (shield) {
      const used = Math.min(result, shield.stats.absorb);
      shield.stats.absorb -= used;
      result -= used;
    }
    if (amount > 0) this.breakConcealment(target);
    return result;
  },
  powerDamage(target, amount, type, actor) {
    if (!alive(target)) return 0;
    const resistances = target.survival
      ? this.powerResistances(
          target,
          Object.entries(target.preview.resistances).map(([type, value]) => ({
            type,
            value,
          })),
        )
      : this.creatureResistances(target);
    let damage = this.R.damageEvent({
      components: [{ type, amount: Math.max(0, amount) }],
      resistances,
      weaknesses: target.survival ? [] : this.creatureWeaknesses(target),
    }).total;
    if (target.survival) this.suffer(target, damage, type, actor);
    else {
      damage = this.absorbPowerDamage(target, damage, type);
      target.hp = Math.max(0, target.hp - damage);
      if (actor) this.creatureAfterHit(target, actor, { type }, damage);
      this.defeatEnemy(target);
    }
    return damage;
  },
  powerCells(spec, actor, point) {
    const origin = spec.target === "self" ? actor : point;
    const dx = point.x - actor.x,
      dz = point.z - actor.z,
      len = Math.hypot(dx, dz) || 1;
    return Object.values(this.map.tiles).filter((p) => {
      if (wallAt(this.map, p.x, p.z)) return false;
      if (spec.shape === "line") {
        const along = ((p.x - actor.x) * dx + (p.z - actor.z) * dz) / len,
          side = Math.abs((p.x - actor.x) * dz - (p.z - actor.z) * dx) / len;
        return (
          along > 0 &&
          along <= len + 0.1 &&
          side < 0.55 &&
          lineOfSight(this.map, actor, p)
        );
      }
      if (spec.shape === "cone") {
        const px = p.x - actor.x,
          pz = p.z - actor.z;
        return (
          distance(actor, p) > 0 &&
          distance(actor, p) <= spec.range &&
          (px * dx + pz * dz) / (Math.hypot(px, pz) * len) >= 0.7 &&
          lineOfSight(this.map, actor, p)
        );
      }
      if (spec.shape === "wall") {
        const sx = Math.sign(dx),
          sz = Math.sign(dz);
        return [-1, 0, 1].some(
          (n) => p.x === point.x - sz * n && p.z === point.z + sx * n,
        );
      }
      return (
        distance(p, origin) <= (spec.radius ?? 0) &&
        lineOfSight(this.map, origin, p)
      );
    });
  },
  powerPlan(id, target, actor = this.active) {
    const spec = this.powerSpec(id, actor);
    if (!spec) throw new Error("Unknown game power.");
    const point =
      spec.target === "self"
        ? actor
        : typeof target === "string"
          ? [...this.party, ...this.enemies].find((p) => p.id === target)
          : target;
    if (
      !point ||
      !Number.isInteger(point.x) ||
      !Number.isInteger(point.z) ||
      !this.map.tiles[key(point.x, point.z)]
    )
      throw new Error("Choose a valid target on the dungeon floor.");
    if (spec.otherOnly && point.id === actor.id)
      throw new Error("Choose another companion.");
    if (
      spec.target === "enemy" &&
      (!this.enemies.includes(point) ||
        point.hp <= 0 ||
        !this.encounter?.roster.some((p) => p.id === point.id && !p.withdrawn))
    )
      throw new Error("Choose a living enemy in this encounter.");
    if (
      spec.target === "ally" &&
      (!this.party.includes(point) || !alive(point))
    )
      throw new Error("Choose a living companion.");
    const relocating = spec.effects.some((e) => e.kind === "move");
    if (distance(actor, point) > (spec.range ?? 0) && spec.target !== "self")
      throw new Error(`Choose a target within ${spec.range} squares.`);
    if (spec.target !== "self" && !lineOfSight(this.map, actor, point))
      throw new Error("The path or line of sight is blocked.");
    if (
      (spec.target === "enemy" || spec.target === "ground") &&
      !this.heroCanSee(actor, point)
    )
      throw new Error("The target is hidden. Bring light or reveal it first.");
    let route = [];
    if (relocating) {
      if (
        this.occupied(actor.id).has(key(point.x, point.z)) ||
        this.map.obstacles[key(point.x, point.z)] ||
        wallAt(this.map, point.x, point.z) ||
        distance(actor, point) === 0
      )
        throw new Error("Choose empty, reachable ground.");
      if (spec.effects.find((e) => e.kind === "move").mode === "route") {
        route = pathfind(this.map, actor, point, this.occupied(actor.id));
        if (!route.length || route.length > spec.range)
          throw new Error("No clear walking route within range.");
      }
    }
    const cells = this.powerCells(spec, actor, point),
      cellSet = new Set(cells.map((p) => key(p.x, p.z)));
    if (
      spec.effects.some((e) => e.kind === "zone" && e.surface === "wall") &&
      (!cells.length ||
        cells.some(
          (p) =>
            this.occupied().has(key(p.x, p.z)) ||
            this.map.obstacles[key(p.x, p.z)] ||
            [this.map.entrance, this.map.exit].some(
              (s) => s && s.x === p.x && s.z === p.z,
            ),
        ))
    )
      throw new Error("A barrier needs empty ground away from stairs.");
    const hostile =
      spec.target === "enemy" ||
      spec.effects.some((e) => ["damage", "condition"].includes(e.kind));
    let recipients = relocating
      ? [actor]
      : spec.target === "ground" || spec.radius || spec.shape
        ? [...(hostile ? this.enemies : this.party)].filter(
            (p) => alive(p) && cellSet.has(key(p.x, p.z)),
          )
        : [point];
    if (spec.target === "self" && !spec.radius) recipients = [actor];
    if (hostile)
      recipients = recipients.filter((p) =>
        this.encounter?.roster.some((r) => r.id === p.id && !r.withdrawn),
      );
    if (spec.effects.some((e) => e.kind === "damage") && !recipients.length)
      throw new Error("No enemies in the affected area.");
    if (
      spec.effects.some((e) => e.kind === "wound") &&
      !recipients.some((p) =>
        p.wounds?.some(
          (w) => !w.treatment?.completed && w.record.recoveryValue,
        ),
      )
    )
      throw new Error("No recoverable wound on this target.");
    for (const effect of spec.effects.filter((e) => e.kind === "resource")) {
      const budget = this.budgets?.[point.id];
      if (
        !this.canAct(point) ||
        (effect.resource === "maneuver" && point.powerPendingManeuver)
      )
        throw new Error(
          "Choose a capable companion without a queued bonus Maneuver.",
        );
      if (
        effect.resource !== "maneuver" &&
        (!budget ||
          !budget.retained.includes(effect.resource) ||
          budget.remaining[effect.resource] > 0)
      )
        throw new Error("Choose a companion with a spent, retained Reaction.");
    }
    const canCleanse = spec.effects.some(
      (effect) =>
        effect.kind === "cleanse" &&
        (effect.self ? [actor] : recipients).some((p) =>
          p.conditions?.some(
            (c) => c.persistence === "temporary" && effect.keys.includes(c.key),
          ),
        ),
    );
    if (spec.effects.every((e) => e.kind === "cleanse") && !canCleanse)
      throw new Error(
        "Choose a companion with a temporary condition this power can remove.",
      );
    if (
      spec.effects.some((e) => e.kind === "heal") &&
      !spec.effects.some((e) => ["wound", "stabilize"].includes(e.kind)) &&
      !canCleanse &&
      recipients.every((p) => p.survival.hp >= this.healingMaximum(p))
    )
      throw new Error("The selected companions are already at full HP.");
    return { spec, point, cells, recipients, route };
  },
  powerReason(id, h = this.active) {
    const p = this.powerSpec(id, h);
    if (!p.universal && !this.powerIds(h).includes(id)) return "Not learned.";
    if (p.supply && !this.supplyItem(h, p.supply))
      return (
        "Carry a usable " +
        p.supply.replace("item-", "").replaceAll("-", " ") +
        "."
      );
    if (
      this.mode !== "combat" &&
      p.fieldSupply &&
      !this.supplyItem(h, p.fieldSupply)
    )
      return "Outside combat, carry a usable field dressing for this power.";
    if (p.category === "passive")
      return "Automatic benefit. Open the recipe book for crafting.";
    if (
      !this.canAct(h) ||
      this.busy ||
      this.pendingDefense ||
      this.pendingProvocation ||
      this.woundNotices?.length
    )
      return "Finish the current event first.";
    if (
      !this.continuingProvocation &&
      p.limit &&
      (h.powerUses?.[id] ?? 0) >= p.limit
    )
      return "No uses remain this encounter.";
    if (
      !this.continuingProvocation &&
      p.restLimit &&
      (h.restPowerUses?.[id] ?? 0) >= p.restLimit
    )
      return "No uses remain. Complete 8 hours of sleep to recover charges.";
    if (this.mode !== "combat") {
      if (!p.field || !["town", "exploration"].includes(this.mode))
        return "Available on your combat turn.";
      if (this.mode === "town" && p.effects.some((e) => e.kind === "zone"))
        return "Use on a dungeon battlefield.";
    } else {
      if (
        h !== this.active ||
        this.encounter.nextSide !== "players" ||
        (this.encounter.current && this.encounter.current !== h.id)
      )
        return "Wait for this hero’s turn.";
      if (this.paths.get(h.id)?.length) return "Wait until movement finishes.";
      if (
        !this.encounter.current &&
        !this.R.availableParticipants(this.encounter).some((p) => p.id === h.id)
      )
        return "This hero has already acted.";
      if (
        !this.continuingProvocation &&
        this.encounter.current === h.id &&
        !this.budget?.remaining[p.category]
      )
        return `No ${p.category} remains.`;
    }
    if (p.weapon && !this.held(h, `item-ordinary-${p.weapon}-weapon`))
      return `Ready a ${p.weapon === "ranged" ? "bow" : "melee weapon"} first.`;
    if (p.weapon === "ranged" && !this.supplyItem(h, "item-ammunition-bundle"))
      return "Ammunition exhausted.";
    return "";
  },
  usePower(id, target) {
    const h = this.active,
      reason = this.powerReason(id, h);
    if (reason) throw new Error(reason);
    const { spec, point, cells, recipients, route } = this.powerPlan(
      id,
      target,
      h,
    );
    if (this.mode === "combat") {
      this.spend(spec.category, id);
      if (
        (spec.spell || spec.supply) &&
        this.provoke(h, {
          kind: "ability",
          id,
          target,
          label: spec.spell ? "casting" : "retrieving a supply",
        })
      )
        return;
    } else this.advanceTime(60, { provisions: true });
    h.powerUses ??= {};
    h.restPowerUses ??= {};
    if (spec.limit) h.powerUses[id] = (h.powerUses[id] ?? 0) + 1;
    if (spec.restLimit) h.restPowerUses[id] = (h.restPowerUses[id] ?? 0) + 1;
    const damaging = spec.effects.some((e) => e.kind === "damage");
    const extra = damaging ? this.consumeDamageBonus(h) : 0;
    const hidden = !!this.powerStat(h, "hidden");
    if (damaging) this.breakConcealment(h);
    for (const effect of spec.effects) {
      if (effect.kind === "zone") {
        this.createSurface(
          effect.surface,
          cells,
          h,
          effect.rounds +
            (spec.supply && this.traits(h).some((t) => t.device) ? 1 : 0),
        );
        continue;
      }
      if (effect.kind === "survey") {
        this.addTactic(h, h, { reveal: true }, id);
        continue;
      }
      for (const recipient of effect.self ? [h] : recipients) {
        switch (effect.kind) {
          case "damage": {
            const d = this.creatureDefense(recipient, h, {
              type: effect.type,
              weapon: spec.weapon,
              spell: spec.spell,
            });
            const roll = this.heroRoll(
              h,
              spec.attribute ?? "knowledge",
              "attack",
              {
                target: recipient,
                spec: {
                  ...spec,
                  push: spec.effects.some((e) => e.kind === "push")
                    ? [1]
                    : null,
                },
                sources: [
                  { kind: "boon", amount: d.boons },
                  { kind: "bane", amount: d.banes },
                ],
              },
            );
            const tier = ["weak", "standard", "strong"].indexOf(roll.tier);
            const damage = this.powerDamage(
              recipient,
              Math.max(
                0,
                value(effect.amount, tier) +
                  extra +
                  this.buildDamage(
                    h,
                    recipient,
                    spec,
                    effect.type,
                    tier,
                    hidden,
                  ),
              ),
              effect.type,
              h,
            );
            const weapon =
              spec.weapon &&
              this.held(h, `item-ordinary-${spec.weapon}-weapon`);
            for (const enchant of weapon
              ? activeItemEffects(h, weapon).filter(
                  (e) => e.effect === "damage",
                )
              : [])
              this.powerDamage(recipient, enchant.value, enchant.type, h);
            this.buildAfterHit(h, recipient, spec, effect.type);
            this.emit("attack", {
              attacker: h.id,
              target: recipient.id,
              ability: id,
              damage,
              element: effect.type,
              spell: spec.spell,
              ranged: spec.weapon === "ranged",
            });
            break;
          }
          case "heal": {
            const tier = spec.attribute
              ? ["weak", "standard", "strong"].indexOf(
                  this.heroRoll(h, spec.attribute).tier,
                )
              : 1;
            this.powerHeal(
              recipient,
              Math.max(
                0,
                value(effect.amount, tier) + this.buildStat(h, "heal"),
              ),
            );
            if (this.buildStat(h, "healingWard") > 0)
              this.powerBuff(
                h,
                recipient,
                { absorb: this.buildStat(h, "healingWard") },
                2,
                "build-healing-ward",
              );
            if (this.buildStat(h, "rallyMove") > 0)
              this.powerBuff(
                h,
                recipient,
                { movement: this.buildStat(h, "rallyMove") },
                1,
                "build-rallying-care",
              );
            break;
          }
          case "condition":
            this.powerCondition(
              recipient,
              effect.key,
              effect.rating + this.buildStat(h, effect.key),
              h.id,
            );
            break;
          case "cleanse":
            for (const k of effect.keys)
              recipient.conditions = this.R.reduceTemporary(
                recipient.conditions ?? [],
                k,
                effect.amount,
              );
            break;
          case "stabilize":
            if (recipient.survival.status === "dying")
              recipient.survival = this.R.stabilize(recipient.survival);
            break;
          case "buff":
            this.powerBuff(h, recipient, effect.stats, effect.turns, id);
            break;
          case "barrier":
            this.powerBuff(
              h,
              recipient,
              {
                absorb:
                  effect.amount +
                  this.buildStat(h, "barrier") +
                  (spec.supply && this.traits(h).some((t) => t.device) ? 2 : 0),
              },
              effect.turns,
              id,
            );
            break;
          case "guard":
            this.addTactic(h, recipient, { guard: true }, id);
            break;
          case "counter":
            this.addTactic(h, recipient, { riposte: true }, id);
            break;
          case "push":
          case "pull": {
            const sign = effect.kind === "push" ? 1 : -1;
            this.powerForceMove(
              recipient,
              {
                x: Math.sign(recipient.x - h.x) * sign,
                z: Math.sign(recipient.z - h.z) * sign,
              },
              effect.amount,
              h,
            );
            break;
          }
          case "swap": {
            const from = { x: h.x, z: h.z };
            Object.assign(h, { x: recipient.x, z: recipient.z });
            Object.assign(recipient, from);
            this.surfaceContact(h, { entry: true });
            this.surfaceContact(recipient, { entry: true });
            break;
          }
          case "move": {
            const from = { x: h.x, z: h.z };
            if (effect.mode === "route")
              for (const p of route) {
                Object.assign(h, p);
                this.surfaceContact(h, { entry: true });
                if (!this.canAct(h)) break;
              }
            else {
              Object.assign(h, { x: point.x, z: point.z });
              this.surfaceContact(h, { entry: true });
            }
            this.emit("move", {
              steps: [
                {
                  heroId: h.id,
                  points:
                    effect.mode === "route"
                      ? route
                      : [from, { x: h.x, z: h.z }],
                },
              ],
            });
            break;
          }
          case "reveal":
            this.breakConcealment(recipient);
            break;
          case "resource":
            if (effect.resource === "maneuver")
              recipient.powerPendingManeuver = true;
            else this.budgets[recipient.id].remaining[effect.resource] = 1;
            (recipient.powerResourceUsed ??= []).push(effect.resource);
            break;
          case "wound": {
            const w = recipient.wounds.find(
              (w) => !w.treatment?.completed && w.record.recoveryValue,
            );
            if (w) this.completeWound(recipient, w, "Restorative magic");
            break;
          }
        }
      }
    }
    if (spec.weapon === "ranged")
      this.checkSupply(
        h,
        this.supplyItem(h, "item-ammunition-bundle"),
        "ammunition after shot",
      );
    if (spec.supply) {
      const item = this.supplyItem(h, spec.supply);
      if (spec.consume) {
        h.supplies[item.instanceId] = 0;
        this.supplyNotice(h, item, `${item.definition.name} was used.`);
      } else this.checkSupply(h, item, "supply after use");
    }
    if (this.mode !== "combat" && spec.fieldSupply)
      this.checkSupply(
        h,
        this.supplyItem(h, spec.fieldSupply),
        "field care after use",
      );
    this.note(
      `${h.name} · ${spec.name}${recipients.length ? `: ${recipients.map((p) => p.name).join(", ")}` : ""}.`,
    );
    this.emit("battlefield");
    this.emit("change");
    if (this.mode === "combat") this.advance();
  },
};
