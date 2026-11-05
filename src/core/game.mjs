import {
  movementBlockers,
  traversalCost,
  leastCostPath,
  companyStep,
} from "./movement.mjs";
import { recoveryMethods } from "./recovery.mjs";
import { interactionMethods } from "./interactions.mjs";
import { experienceMethods, xpForLevel } from "./experience.mjs";
import {
  rosterMethods,
  prepareRoster,
  validateRoster,
  storedHero,
} from "./roster.mjs";
import { ABILITIES, coverage } from "./abilities.mjs";
import { formationRoutes, validateFormation } from "./formations.mjs";
import {
  generate,
  Random,
  key,
  distance,
  pathfind,
  lineOfSight,
  neighbors,
} from "./dungeon.mjs";
export class Game {
  constructor(rules, catalogs, notify = () => {}) {
    this.R = rules;
    this.C = catalogs;
    this.notify = notify;
    this.listeners = [];
    this.log = [];
    this.selected = 0;
    this.paths = new Map();
    this.mode = "town";
    this.busy = false;
  }
  emit(type, data = {}) {
    this.recordFallen();
    for (const f of this.listeners) f(type, data);
  }
  note(text) {
    this.log.push(text);
    this.log = this.log.slice(-60);
    this.emit("log");
  }
  hero(draft, index) {
    const preview = this.R.workshopCharacter(draft, this.C);
    if (!preview.valid)
      throw new Error(preview.errors.map((e) => e.text ?? e.code).join("\n"));
    const cls = draft.classId;
    return {
      id: `hero-${index}`,
      heroId: crypto.randomUUID(),
      xp: xpForLevel(draft.progression?.level ?? 1),
      xpHistory: [],
      draft: structuredClone(draft),
      name: draft.name,
      model:
        cls === "class-arcanist" ||
        cls === "class-shepherd" ||
        cls === "class-intellect"
          ? "Mage"
          : cls === "class-shadow"
            ? "Rogue"
            : cls === "class-protector"
              ? "Knight"
              : "Barbarian",
      x: 0,
      z: 0,
      survival: this.R.survivalState({
        hp: preview.summary.maximumHp,
        maxHp: preview.summary.maximumHp,
        gritAvailable: preview.summary.gritGranted,
      }),
      wounds: [],
      conditions: [],
      buffs: {},
      supplies: {},
      earnedLevel: draft.progression?.level ?? 1,
      milestones: [],
      favorites: this.C.choices
        .filter(
          (c) =>
            ABILITIES[c.id] &&
            (c.universal || preview.state.abilities.includes(c.id)),
        )
        .filter(
          (c) =>
            ![
              "ability-basic-unarmed",
              "ability-basic-ranged",
              "ability-stabilize",
            ].includes(c.id),
        )
        .slice(0, 6)
        .map((c) => c.id),
      preview,
    };
  }
  fresh(drafts) {
    this.woundNotices = [];
    this.campaign = {
      seed: Math.floor(Math.random() * 2147483647),
      depth: 1,
      bank: 0,
      haul: 0,
      expeditions: 0,
      hours: 0,
      memorial: [],
      reserve: [],
      fallenHeroes: [],
      pendingTreasureXP: 0,
      caches: [],
      formation: "square",
      order: drafts.map((_, i) => `hero-${i}`),
      party: drafts.map((d, i) => this.hero(d, i)),
    };
    this.newFloor();
    this.mode = "town";
    this.note("Four names in the register. One road beneath the earth.");
  }
  load(c) {
    prepareRoster(c);
    c.woundNotices ??= [];
    if (c.mode === "wound-review" && c.encounter) c.mode = "combat";
    for (const h of [
      ...c.party,
      ...c.reserve,
      ...c.fallenHeroes.map((e) => e.hero),
    ]) {
      const p = this.R.workshopCharacter(h.draft, this.C);
      if (!p.valid)
        throw new Error("A saved hero no longer passes character validation.");
      h.preview = p;
      h.conditions ??= [];
      h.buffs ??= {};
      h.supplies ??= {};
      h.favorites = [
        ...new Set(
          (
            h.favorites ??
            this.availableActions(h)
              .slice(0, 6)
              .map((c) => c.id)
          ).filter((id) => this.availableActions(h).some((c) => c.id === id)),
        ),
      ].slice(0, 8);
      h.earnedLevel ??= p.state.level;
      h.milestones ??= [];
      for (const w of h.wounds ?? []) {
        if (
          !w.applied &&
          w.record?.id &&
          this.C.wounds.records.some((r) => r.id === w.record.id)
        ) {
          w.id ??= `wound-${crypto.randomUUID()}`;
          w.source ??= h.id;
          w.applied = true;
          for (const e of w.effects ?? [])
            if (e.kind === "condition")
              h.conditions.push({
                id: `injury-${crypto.randomUUID()}`,
                key: e.key,
                rating: e.rating,
                persistence: e.persistence,
                source: e.requiresSource ? w.source : w.id,
                woundId: w.id,
              });
          if (!c.woundNotices.some((n) => n.woundId === w.id))
            c.woundNotices.push({ heroId: h.id, woundId: w.id });
        }
      }
      this.R.validateSurvival(h.survival);
      this.R.validateContributions(h.conditions);
      if (
        !Number.isInteger(h.earnedLevel) ||
        h.earnedLevel < p.state.level ||
        h.earnedLevel > 100 ||
        !Array.isArray(h.milestones) ||
        h.milestones.some((d) => !Number.isInteger(d) || d < 1) ||
        Object.values(h.supplies).some(
          (d) => ![0, 4, 6, 8, 10, 12, 20].includes(d),
        )
      )
        throw new Error("Saved development or supplies are invalid.");
    }
    c.hours ??= 0;
    validateRoster(c);
    if (!Number.isSafeInteger(c.hours) || c.hours < 0)
      throw new Error("Invalid campaign time.");
    c.formation ??= "square";
    c.order ??= c.party.map((h) => h.id);
    validateFormation(c.formation, c.order, c.party);
    this.campaign = c;
    this.selected =
      Number.isInteger(c.selected) && c.selected >= 0 && c.selected < 4
        ? c.selected
        : 0;
    this.busy = false;
    this.pendingDefense = null;
    this.woundNotices = c.woundNotices ?? [];
    this.newFloor(c.floor);
    this.mode = c.mode ?? "town";
    if (this.mode === "combat") {
      this.encounter = c.encounter;
      this.budgets = c.budgets ?? {};
      const actor = this.party.findIndex(
        (h) => h.id === this.encounter.current,
      );
      if (actor >= 0) this.selected = actor;
    }
    this.party.forEach((h, i) => (h.selected = i === this.selected));
    if (c.pendingDefense && this.mode === "combat") {
      if (
        !this.party.some((h) => h.id === c.pendingDefense.target) ||
        !this.enemies.some((e) => e.id === c.pendingDefense.attacker) ||
        this.encounter.current !== c.pendingDefense.attacker
      )
        throw new Error("Saved reaction is invalid.");
      this.pendingDefense = c.pendingDefense;
      this.busy = true;
      this.emit("reaction", {
        hero: this.party.find((h) => h.id === c.pendingDefense.target),
        enemy: this.enemies.find((e) => e.id === c.pendingDefense.attacker),
      });
    }
    this.emit("change");
    if (this.woundNotices.length) {
      const n = this.woundNotices[0],
        h = this.party.find((h) => h.id === n.heroId);
      this.emit("wound", {
        hero: h,
        wound: h.wounds.find((w) => w.id === n.woundId),
      });
    } else if (
      this.mode === "combat" &&
      this.encounter.current &&
      this.active.survival.status === "dying" &&
      this.active.survival.due === this.active.survival.ownTurn &&
      !this.active.survival.choice?.resolved
    )
      this.emit("dying", { hero: this.active });
    else if (this.mode === "combat" && !this.encounter?.current) this.advance();
  }
  snapshot() {
    this.recordFallen();
    return {
      ...this.campaign,
      party: this.party.map(storedHero),
      reserve: this.campaign.reserve.map(storedHero),
      fallenHeroes: this.campaign.fallenHeroes.map((e) => ({
        ...e,
        hero: storedHero(e.hero),
      })),
      mode: this.mode,
      selected: this.selected,
      encounter: this.encounter,
      budgets: this.budgets,
      pendingDefense: this.pendingDefense,
      woundNotices: this.woundNotices ?? [],
      floor: { map: this.map, seen: this.seen, enemies: this.enemies },
    };
  }
  newFloor(saved) {
    this.pendingInteraction = null;
    this.map = saved?.map ?? generate(this.campaign.seed, this.campaign.depth);
    if (!this.map.xpClaims) {
      this.map.xpClaims = saved
        ? [
            ...this.map.rooms.flatMap((r, i) =>
              saved.seen?.[key(r.cx, r.cz)] ? [`room:${i}`] : [],
            ),
            ...(saved.enemies ?? [])
              .filter((e) => e.hp <= 0)
              .map((e) => `enemy:${e.id}`),
          ]
        : [];
    }
    if (
      !Array.isArray(this.map.xpClaims) ||
      this.map.xpClaims.some((id) => typeof id !== "string")
    )
      throw new Error("Invalid saved experience claims.");
    this.seen = saved?.seen ?? {};
    this.rng = new Random(this.campaign.seed + this.campaign.depth * 31);
    this.enemies =
      saved?.enemies ??
      this.map.enemies.map((e) => ({
        ...e,
        hp: 10,
        maxHp: 10,
        conditions: [],
        type: "creature-bone-sentry",
        name: "Bone sentry",
      }));
    if (!saved)
      this.party.forEach((h, i) =>
        Object.assign(h, {
          x: this.map.start.x + (i % 2),
          z: this.map.start.z + Math.floor(i / 2),
          selected: i === this.selected,
        }),
      );
    this.paths.clear();
    this.encounter = null;
    this.budgets = {};
    this.emit("floor");
  }
  get party() {
    return this.campaign.party;
  }
  get active() {
    return this.party[this.selected];
  }
  get budget() {
    return this.encounter?.current === this.active.id
      ? this.budgets[this.active.id]
      : undefined;
  }
  restrictions(h) {
    return this.R.conditionActionRestrictions(h.conditions ?? []);
  }
  movementLeft() {
    return this.budget
      ? this.R.movementRemaining(
          { ...this.budget, speed: this.speed(this.active) },
          this.restrictions(this.active),
        )
      : this.speed(this.active);
  }
  held(h, catalogId) {
    return h.preview.inventory.items.find(
      (i) => i.catalogId === catalogId && i.carried && i.held,
    );
  }
  setFormation(name, order) {
    if (!["town", "exploration"].includes(this.mode))
      throw new Error("Change marching formation outside combat.");
    validateFormation(name, order, this.party);
    this.campaign.formation = name;
    this.campaign.order = [...order];
    this.paths.clear();
    this.emit("change");
  }
  availableActions(h = this.active) {
    return this.C.choices.filter(
      (c) =>
        ABILITIES[c.id] &&
        (c.universal || h.preview.state.abilities.includes(c.id)),
    );
  }
  useAbility(id, targetId, options = {}) {
    if (id === "ability-use-a-healing-potion") {
      const i = this.active.preview.inventory.items.find(
        (i) =>
          i.carried &&
          this.R.HEALING_POTION_IDS.includes(i.catalogId) &&
          (this.active.supplies[i.instanceId] ?? i.inventoryDie) > 0,
      );
      return this.drinkPotion(
        this.selected,
        options.instanceId ?? i?.instanceId,
        targetId ?? this.active.id,
      );
    }
    if (id === "ability-reduce-a-condition")
      return this.reduceCondition(
        targetId ?? this.active.id,
        options.condition,
      );
    if (this.mode !== "combat" || this.busy)
      throw new Error("Wait for your company’s turn.");
    const spec = ABILITIES[id],
      card = this.availableActions().find((c) => c.id === id),
      h = this.active;
    if (!spec || !card)
      throw new Error("This hero has not learned that dungeon action.");
    const target =
      spec.target === "self"
        ? h
        : spec.target === "ally"
          ? this.party.find((p) => p.id === targetId)
          : this.enemies.find((e) => e.id === targetId && e.hp > 0);
    if (!target)
      throw new Error(
        `Choose a ${spec.target === "ally" ? "Dying companion" : "living enemy"}.`,
      );
    if (
      spec.target === "enemy" &&
      !this.encounter.roster.some((p) => p.id === target.id && !p.withdrawn)
    )
      throw new Error("That creature is outside this encounter.");
    if (
      spec.range &&
      (distance(h, target) > spec.range || !lineOfSight(this.map, h, target))
    )
      throw new Error(
        `${card.name} needs line of sight within ${spec.range} square${spec.range === 1 ? "" : "s"}.`,
      );
    if (
      id === "ability-stabilize" &&
      (target === h || target.survival.status !== "dying")
    )
      throw new Error("Choose an adjacent Dying companion.");
    if (spec.shield && !this.held(h, "item-ordinary-shield"))
      throw new Error("Ready a shield first.");
    if (
      spec.flanking &&
      !this.party.some(
        (p) =>
          p !== h && p.survival.status === "active" && distance(p, target) <= 1,
      )
    )
      throw new Error(
        "Blade in the Back needs a companion adjacent to the target.",
      );
    if (spec.healing || spec.reduce) return this.recoveryAbility(id, targetId);
    if (
      spec.target === "enemy" &&
      this.R.conditionSummary(h.conditions).blinded.active
    )
      throw new Error(
        "This attack needs a visible target; resolve Blinded first.",
      );
    let drawWeapon = null;
    if (spec.weapon && !this.held(h, `item-ordinary-${spec.weapon}-weapon`)) {
      const freeHands =
        2 -
        h.preview.inventory.items
          .filter((i) => i.carried && i.held)
          .reduce((n, i) => n + (i.hands ?? 0), 0);
      drawWeapon = h.preview.inventory.items.find(
        (i) =>
          i.carried &&
          i.catalogId === `item-ordinary-${spec.weapon}-weapon` &&
          i.hands <= freeHands,
      );
      if (!drawWeapon)
        throw new Error(
          `Ready an owned ${spec.weapon} weapon on the character sheet first; its attack can draw it only with enough free hands.`,
        );
    }
    const ammunition =
      spec.weapon === "ranged"
        ? h.preview.inventory.items.find(
            (i) =>
              i.catalogId === "item-ammunition-bundle" &&
              i.carried &&
              (h.supplies[i.instanceId] ?? i.inventoryDie) > 0,
          )
        : null;
    if (spec.weapon === "ranged" && !ammunition)
      throw new Error("No usable ammunition remains.");
    this.spend(spec.category, id);
    if (drawWeapon) {
      h.draft.loadout ??= {};
      h.draft.loadout[drawWeapon.instanceId] = {
        ...h.draft.loadout[drawWeapon.instanceId],
        held: true,
        carried: true,
      };
      h.preview = this.R.workshopCharacter(h.draft, this.C);
      this.emit("party");
    }
    if (id === "ability-defend") {
      h.buffs.defend = true;
      this.note(`${h.name} defends: +1 defense Boon until their next turn.`);
    } else if (id === "ability-stabilize") {
      target.survival = this.R.stabilize(target.survival);
      this.note(
        `${h.name} stabilizes ${target.name} at 0 HP; death marks cleared.`,
      );
    } else {
      const sources = [
        ...this.woundRollSources(h, spec.attribute),
        ...this.R.conditionRollSources(h.conditions ?? [], {
          mode: "attack",
          targetContributions: target.conditions ?? [],
          perceivedSources: this.perceivedSources(h),
        }),
      ];
      const boons = sources
          .filter((s) => s.kind === "boon")
          .reduce((n, s) => n + s.amount, 0),
        banes = sources
          .filter((s) => s.kind === "bane")
          .reduce((n, s) => n + s.amount, 0);
      const result = this.roll(
          h.draft.attributes[spec.attribute],
          boons,
          banes,
        ),
        tier = ["weak", "standard", "strong"].indexOf(result.tier);
      const damage = this.R.damageEvent({
        components: [{ type: spec.type, amount: spec.damage[tier] }],
        resistances: [{ type: "physical", value: 1 }],
      });
      target.hp = Math.max(0, target.hp - damage.total);
      target.conditions ??= [];
      for (const [condition, rating] of spec.conditions?.[tier] ?? [])
        target.conditions.push({
          id: `effect-${crypto.randomUUID()}`,
          key: condition,
          rating,
          source: h.id,
          order: this.encounter.serial,
          persistence: condition === "prone" ? "binary" : "temporary",
        });
      this.note(
        `${h.name} · ${card.name} (${spec.attribute}): ${result.retained.join(" + ")} ${h.draft.attributes[spec.attribute] >= 0 ? "+" : ""}${h.draft.attributes[spec.attribute]} → ${result.total} ${result.tier}; ${damage.total} ${spec.type} damage${result.natural ? ` · natural ${result.natural}` : ""}${target.hp === 0 ? " · sentry destroyed" : ""}.`,
      );
      if (spec.conditions?.[tier]?.length)
        this.note(
          `${target.name}: ${spec.conditions[tier].map(([k, r]) => `${k} ${r}`).join(", ")}.`,
        );
      if (ammunition) {
        const die =
          h.supplies[ammunition.instanceId] ?? ammunition.inventoryDie;
        const check = this.R.inventoryCheck({
          die,
          retained: 1 + Math.floor(Math.random() * die),
        });
        h.supplies[ammunition.instanceId] = check.after;
        this.note(
          `Ammunition d${die}: ${check.retained}${check.after !== die ? (check.exhausted ? " · exhausted after this shot" : ` → d${check.after}`) : " · retained"}.`,
        );
      }
      if (spec.push?.[tier] && target.hp > 0)
        this.forceMove(
          target,
          { x: Math.sign(target.x - h.x), z: Math.sign(target.z - h.z) },
          spec.push[tier],
        );
      this.defeatEnemy(target);
      this.emit("attack", {
        attacker: h.id,
        target: target.id,
        ability: id,
        damage: damage.total,
        spell: spec.spell,
        element: spec.type,
        ranged: spec.weapon === "ranged",
      });
    }
    this.advance();
    this.emit("change");
  }
  perceivedSources(h) {
    return [...this.party, ...this.enemies]
      .filter((p) => distance(h, p) < 10 && lineOfSight(this.map, h, p))
      .map((p) => p.id);
  }
  defeatEnemy(e) {
    if (
      this.encounter &&
      e.hp === 0 &&
      this.encounter.current !== e.id &&
      this.encounter.roster.some((p) => p.id === e.id && !p.withdrawn)
    )
      this.encounter = this.R.changeRoster(this.encounter, {
        id: e.id,
        side: "opposition",
        mode: "withdraw",
        reason: "defeated",
      });
  }
  enemySpeed(e) {
    const summary = this.R.conditionSummary(e.conditions ?? []);
    return Math.max(
      0,
      5 - summary.slowed.rating - (summary.prone.active ? 2 : 0),
    );
  }
  finishEnemyConditions(e) {
    // Sentries stand before acting when prone; this spends two movement squares.
    if (5 - this.R.conditionSummary(e.conditions ?? []).slowed.rating >= 2)
      e.conditions = (e.conditions ?? []).filter((c) => c.key !== "prone");
    const plan = this.R.conditionEndPlan(e.conditions, {
      turnId: `npc-${this.encounter.serial}`,
      resistances: [{ type: "physical", value: 1 }],
    });
    if (!plan.ready)
      throw new Error("This condition combination needs a duration ruling.");
    for (const event of plan.events) {
      e.hp = Math.max(0, e.hp - event.damage.total);
      this.note(
        `${e.name}: ${event.damage.total} ${event.condition} damage at turn end.`,
      );
    }
    e.conditions = plan.contributions;
    this.defeatEnemy(e);
  }
  canBlock(h) {
    return (
      this.canAct(h) &&
      this.held(h, "item-ordinary-shield") &&
      !h.buffs.shield &&
      (this.budgets[h.id]?.remaining.reaction ?? 1) > 0
    );
  }
  resolveReaction(block) {
    if (!this.pendingDefense) throw new Error("There is no pending defense.");
    const e = this.enemies.find((e) => e.id === this.pendingDefense.attacker),
      h = this.party.find((h) => h.id === this.pendingDefense.target);
    if (block) {
      if (!this.canBlock(h))
        throw new Error("Shield Block requires a held shield and a Reaction.");
      this.budgets[h.id] ??= this.R.startTurn({
        turnId: `opening-${h.id}`,
        speed: this.speed(h),
      });
      this.budgets[h.id] = this.R.declareAction(this.budgets[h.id], {
        operationId: `block-${crypto.randomUUID()}`,
        sourceId: "ability-shield-block",
        category: "reaction",
        ownTurn: false,
      });
      h.buffs.shield = true;
      this.note(
        `${h.name} uses Shield Block: +1 defense Boon until their next turn.`,
      );
    }
    this.pendingDefense = null;
    this.resolveEnemyHit(e, h);
    this.finishEnemyConditions(e);
    this.encounter = this.R.finishTurn(this.encounter);
    this.defeatEnemy(e);
    this.busy = false;
    this.advance();
    this.emit("change");
  }
  resolveEnemyHit(e, h) {
    const sources = [
      ...this.R.conditionRollSources(h.conditions ?? [], {
        mode: "defense",
        perceivedSources: this.perceivedSources(h),
      }),
      ...this.R.passiveAncestryDefenseSources(h.draft.traitIds ?? []),
      ...this.woundRollSources(h, "agility"),
    ];
    const boons =
        Number(!!h.buffs.defend) +
        Number(!!h.buffs.shield) +
        sources
          .filter((s) => s.kind === "boon")
          .reduce((n, s) => n + s.amount, 0),
      banes = sources
        .filter((s) => s.kind === "bane")
        .reduce((n, s) => n + s.amount, 0);
    const result = this.roll(h.draft.attributes.agility, boons, banes);
    const damage = this.R.damageEvent({
      components: [
        {
          type: "physical",
          amount: { weak: 5, standard: 3, strong: 2 }[result.tier],
        },
      ],
      resistances: Object.entries(h.preview.resistances).map(
        ([type, value]) => ({ type, value }),
      ),
    });
    this.suffer(h, damage.total, "physical", e);
    this.note(
      `${h.name} defends (Agility, ${boons} Boon / ${banes} Bane): ${result.retained.join(" + ")} → ${result.total} ${result.tier}; suffers ${damage.total} damage.`,
    );
    this.emit("attack", { attacker: e.id, target: h.id, damage: damage.total });
  }
  stand() {
    if (this.mode !== "combat" || this.busy || !this.canAct(this.active))
      throw new Error("Wait for an active hero’s turn.");
    if (!this.encounter.current) this.beginHero();
    if (!(this.active.conditions ?? []).some((c) => c.key === "prone"))
      throw new Error("This hero is already standing.");
    if (this.movementLeft() < 2)
      throw new Error("Standing requires 2 movement.");
    this.budgets[this.active.id] = this.R.spendMovement(this.budget, {
      operationId: `stand-${crypto.randomUUID()}`,
      amount: 2,
      conditions: this.restrictions(this.active),
    });
    this.active.conditions = this.active.conditions.filter(
      (c) => c.key !== "prone",
    );
    this.emit("change");
  }
  favorite(index, id) {
    const h = this.party[index];
    if (!this.availableActions(h).some((c) => c.id === id))
      throw new Error("Only playable actions can be favorited.");
    h.favorites ??= [];
    if (h.favorites.includes(id))
      h.favorites = h.favorites.filter((x) => x !== id);
    else {
      if (h.favorites.length >= 8)
        throw new Error(
          "Eight favorites fit on the action bar. Unpin one first.",
        );
      h.favorites.push(id);
    }
    this.emit("change");
  }
  gearPlan(index, instanceId, operation = "ready") {
    const items = this.party[index].preview.inventory.items,
      item = items.find((i) => i.instanceId === instanceId),
      held = items.filter((i) => i.held && i !== item);
    if (!item) return { stow: [], cost: 0 };
    const stow = [];
    let occupied = held.reduce((n, i) => n + i.hands, 0);
    if (operation === "ready")
      for (const i of [...held].sort(
        (a, b) =>
          Number(/shield/.test(a.catalogId)) -
          Number(/shield/.test(b.catalogId)),
      )) {
        if (occupied + item.hands <= 2) break;
        stow.push(i.instanceId);
        occupied -= i.hands;
      }
    return {
      stow,
      cost: ["wear", "remove"].includes(operation)
        ? 0
        : Math.max(1, stow.length),
    };
  }
  gearReason(index, instanceId, operation = "ready") {
    const h = this.party[index],
      item = h?.preview.inventory.items.find(
        (i) => i.instanceId === instanceId,
      );
    if (!item?.carried) return "This item must be carried.";
    if (!["town", "exploration", "combat"].includes(this.mode) || this.busy)
      return "Wait for your company’s turn.";
    if (!this.canAct(h)) return "This hero cannot handle equipment.";
    if (operation === "wear" || operation === "remove") {
      if (this.mode === "combat") return "Change armor outside combat.";
      const tier = item.catalogId.match(
        /item-ordinary-(light|medium|heavy)-armor/,
      )?.[1];
      if (!tier) return "Choose a suit of armor.";
      if (
        operation === "wear" &&
        !h.preview.state.abilities.includes(`ability-wear-${tier}-armor`)
      )
        return `Requires ${tier} armor training.`;
    } else {
      if (!item.hands) return "Choose a weapon or shield.";
      if (operation === "ready" && item.held) return "Already readied.";
      if (operation === "stow" && !item.held) return "Already stowed.";
    }
    if (this.mode === "combat") {
      if (h !== this.active || this.encounter.nextSide !== "players")
        return "Only the acting hero can change equipment.";
      if (this.paths.get(h.id)?.length) return "Wait until movement finishes.";
      if (
        (this.encounter.current === h.id
          ? (this.budgets[h.id]?.remaining.maneuver ?? 0)
          : 1) < this.gearPlan(index, instanceId, operation).cost
      )
        return `Requires ${this.gearPlan(index, instanceId, operation).cost} Maneuver${this.gearPlan(index, instanceId, operation).cost === 1 ? "" : "s"}; convert Main if needed.`;
      if (!this.canAct(h)) return "This hero cannot act.";
    }
    return "";
  }
  equip(index, instanceId, operation = "ready") {
    const reason = this.gearReason(index, instanceId, operation);
    if (reason) throw new Error(reason);
    const h = this.party[index],
      items = h.preview.inventory.items,
      item = items.find((i) => i.instanceId === instanceId);
    const plan = this.gearPlan(index, instanceId, operation);
    const draft = structuredClone(h.draft);
    draft.loadout ??= {};
    const set = (i, values) =>
      (draft.loadout[i.instanceId] = {
        ...draft.loadout[i.instanceId],
        ...values,
      });
    if (operation === "wear") {
      for (const i of items.filter((i) =>
        /item-ordinary-(light|medium|heavy)-armor/.test(i.catalogId),
      ))
        set(i, { worn: i === item });
    } else if (operation === "remove") set(item, { worn: false });
    else if (operation === "stow") set(item, { held: false });
    else {
      for (const i of items)
        set(i, {
          held: i === item || (!plan.stow.includes(i.instanceId) && i.held),
        });
    }
    const preview = this.R.workshopCharacter(draft, this.C);
    if (!preview.valid)
      throw new Error(preview.errors.map((e) => e.text).join("; "));
    if (this.mode === "combat")
      for (let n = 0; n < plan.cost; n++)
        this.spend("maneuver", "ability-handle-an-item");
    h.draft = draft;
    h.preview = preview;
    this.note(
      `${h.name} ${{ ready: "readies", stow: "stows", wear: "puts on", remove: "removes" }[operation]} ${item.definition.name}${this.mode === "combat" ? ` · ${plan.cost} Maneuver${plan.cost === 1 ? "" : "s"} spent` : ""}.`,
    );
    this.emit("party");
    this.emit("change");
  }
  actionReason(id, h = this.active) {
    if (
      this.mode !== "combat" ||
      this.busy ||
      this.encounter?.nextSide !== "players"
    )
      return "Available on your combat turn.";
    if (h !== this.active) return "Select this hero when they can act.";
    if (this.woundNotices?.length) return "Acknowledge the wound first.";
    if (this.encounter.current && this.encounter.current !== h.id)
      return "Finish the acting hero’s turn first.";
    if (
      !this.encounter.current &&
      !this.R.availableParticipants(this.encounter).some((p) => p.id === h.id)
    )
      return "This hero has already acted this round.";
    if (!this.canAct(h))
      return "This hero cannot act; resolve survival or disabling conditions.";
    if (this.paths.get(h.id)?.length) return "Wait until movement finishes.";
    const a = ABILITIES[id];
    if (!a || !this.availableActions(h).some((c) => c.id === id))
      return "Not learned.";
    if (this.encounter.current === h.id && !this.budget?.remaining[a.category])
      return `No ${a.category} remains.`;
    if (id === "ability-use-a-healing-potion") {
      if (
        !h.preview.inventory.items.some(
          (i) =>
            i.carried &&
            this.R.HEALING_POTION_IDS.includes(i.catalogId) &&
            (h.supplies[i.instanceId] ?? i.inventoryDie) > 0,
        )
      )
        return "No usable healing potion remains.";
      if (
        h.preview.inventory.items
          .filter((i) => i.held)
          .reduce((n, i) => n + (i.hands ?? 0), 0) >= 2
      )
        return "Free a hand to use a potion.";
    }
    if (a.hpCost && h.survival.hp <= a.hpCost)
      return "Life magic must leave the caster above 0 HP.";
    if (a.shield && !this.held(h, "item-ordinary-shield"))
      return "Ready a shield first.";
    if (
      a.freeHand &&
      h.preview.inventory.items
        .filter((i) => i.held)
        .reduce((n, i) => n + i.hands, 0) >= 2
    )
      return "Free a hand first.";
    if (
      a.target === "enemy" &&
      this.R.conditionSummary(h.conditions).blinded.active
    )
      return "This attack needs a visible target.";
    if (a.weapon && !this.held(h, `item-ordinary-${a.weapon}-weapon`)) {
      const hands =
        2 -
        h.preview.inventory.items
          .filter((i) => i.held)
          .reduce((n, i) => n + i.hands, 0);
      if (
        !h.preview.inventory.items.some(
          (i) =>
            i.carried &&
            i.catalogId === `item-ordinary-${a.weapon}-weapon` &&
            i.hands <= hands,
        )
      )
        return `Ready a ${a.weapon} weapon first.`;
    }
    if (
      a.weapon === "ranged" &&
      !h.preview.inventory.items.some(
        (i) =>
          i.carried &&
          i.catalogId === "item-ammunition-bundle" &&
          (h.supplies[i.instanceId] ?? i.inventoryDie) > 0,
      )
    )
      return "Ammunition exhausted.";
    return "";
  }
  develop(index, proposed) {
    if (this.mode !== "town") throw new Error("Train in Greyhaven.");
    const h = this.party[index],
      next = structuredClone(h.draft),
      progression = structuredClone(
        proposed.progression ?? { level: 1, levels: {} },
      );
    if (
      progression.level < h.preview.state.level ||
      progression.level > h.earnedLevel
    )
      throw new Error(`This hero has earned level ${h.earnedLevel}.`);
    const prior = h.draft.progression?.levels ?? {};
    for (const [level, entry] of Object.entries(prior)) {
      const candidate = progression.levels?.[level];
      if (
        !candidate ||
        JSON.stringify(candidate.purchases.slice(0, entry.purchases.length)) !==
          JSON.stringify(entry.purchases) ||
        Object.entries(entry.signatures ?? {}).some(
          ([k, v]) => candidate.signatures?.[k] !== v,
        ) ||
        Object.entries(entry.acquisitions ?? {}).some(
          ([k, v]) =>
            JSON.stringify(candidate.acquisitions?.[k]) !== JSON.stringify(v),
        )
      )
        throw new Error(
          "Committed development choices cannot be refunded or rewritten.",
        );
    }
    for (const [level, entry] of Object.entries(progression.levels ?? {})) {
      if (+level > progression.level)
        throw new Error(
          "Future development choices cannot be committed early.",
        );
      for (const purchase of entry.purchases.slice(
        prior[level]?.purchases?.length ?? 0,
      )) {
        const choice = this.C.choices.find((c) => c.id === purchase.id);
        if (
          choice?.kind === "ability" &&
          coverage(choice.id).status !== "included"
        )
          throw new Error(
            `${choice.name} is not in the playable dungeon roster.`,
          );
      }
    }
    next.progression = progression;
    const preview = this.R.workshopCharacter(next, this.C);
    if (!preview.valid)
      throw new Error(
        preview.errors
          .map(
            (e) => e.text ?? e.reasons?.map((r) => r.text).join("; ") ?? e.code,
          )
          .join("\n"),
      );
    for (const id of preview.state.abilities.filter(
      (id) => !h.preview.state.abilities.includes(id),
    ))
      if (coverage(id).status !== "included")
        throw new Error(
          `${this.C.choices.find((c) => c.id === id)?.name}: this card is not yet in the playable dungeon roster.`,
        );
    const hpDelta = preview.summary.maximumHp - h.preview.summary.maximumHp,
      gritDelta = preview.summary.gritGranted - h.preview.summary.gritGranted;
    h.survival.maxHp += hpDelta; // Training does not heal existing damage or refill spent Grit.
    h.survival.gritAvailable += gritDelta;
    h.draft = next;
    h.preview = preview;
    this.note(
      `${h.name} trained to level ${preview.state.level}; ${preview.development.current} DP remain.`,
    );
    this.emit("party");
    this.emit("change");
  }
  dice(n = 3) {
    return Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6));
  }
  roll(attribute, boons = 0, banes = 0) {
    const plan = this.R.rollPlan({ attribute, boons, banes });
    const all = this.dice(plan.count),
      ordered = [...all].sort((a, b) => (plan.net < 0 ? a - b : b - a)),
      retained = ordered.slice(0, 3);
    return { ...this.R.classifyRoll(retained, attribute), retained, all };
  }
  descend() {
    if (this.mode !== "town")
      throw new Error("Return to town before beginning an expedition.");
    if (
      this.party.some(
        (h) =>
          h.survival.status !== "active" || h.wounds.some((w) => !w.applied),
      )
    )
      throw new Error("Replace or resolve injured heroes before descending.");
    this.campaign.expeditions++;
    this.mode = "exploration";
    this.note(
      `Expedition ${this.campaign.expeditions} · The Drowned Reliquary, depth ${this.campaign.depth}.`,
    );
    this.emit("change");
  }
  select(i) {
    if (!this.party[i]) return;
    if (this.mode === "combat") {
      if (this.busy || this.encounter.nextSide !== "players")
        throw new Error("Wait for your company’s turn.");
      if (this.encounter.current && this.encounter.current !== this.party[i].id)
        throw new Error("Finish the current hero’s turn first.");
      if (
        !this.encounter.current &&
        !this.R.availableParticipants(this.encounter).some(
          (p) => p.id === this.party[i].id,
        )
      )
        throw new Error("This hero has already acted this round.");
    }
    this.selected = i;
    this.party.forEach((h, j) => (h.selected = i === j));
    if (
      this.mode === "combat" &&
      !this.encounter.current &&
      this.encounter.nextSide === "players"
    )
      this.beginHero();
    this.emit("change");
  }
  occupied(except) {
    return new Set(
      [
        ...this.party.filter(
          (h) => h.id !== except && h.survival.status !== "dead",
        ),
        ...this.enemies.filter((e) => e.hp > 0 && e.id !== except),
      ].map((p) => key(p.x, p.z)),
    );
  }
  route(to) {
    if (!["exploration", "combat"].includes(this.mode) || this.busy) return [];
    const h =
      this.mode === "exploration"
        ? this.party.find((h) => h.id === this.campaign.order[0])
        : this.active;
    if (h.survival.status !== "active") return [];
    const blockers = movementBlockers(this.party, this.enemies, h, (other) =>
      this.canAct(other),
    );
    if (this.mode === "combat") {
      if (this.occupied(h.id).has(key(to.x, to.z))) return [];
      return leastCostPath(this.map, h, to, blockers, (p) => this.moveCost(p));
    }
    return pathfind(this.map, h, to, blockers);
  }
  moveCost(point) {
    return traversalCost(
      this.map,
      [
        ...this.party.filter((h) => h.survival.status !== "dead"),
        ...this.enemies.filter((e) => e.hp > 0),
      ],
      point,
    );
  }
  move(to) {
    if (this.busy) return;
    this.pendingInteraction = null;
    if (
      this.mode === "combat" &&
      this.occupied(this.active.id).has(key(to.x, to.z))
    )
      throw new Error(
        "Move through companions, but finish on an empty square.",
      );
    const route = this.route(to);
    if (!route.length) return;
    if (this.mode === "combat" && !this.encounter.current) this.beginHero();
    if (this.mode === "combat") {
      if (this.encounter.current !== this.active.id)
        throw new Error("Choose a hero whose turn is available.");
      const remaining = this.movementLeft();
      const cost = route.reduce((n, p) => n + this.moveCost(p), 0);
      if (cost > remaining)
        throw new Error(
          `This route costs ${cost} movement; only ${remaining} remains.`,
        );
      this.budgets[this.active.id] = this.R.spendMovement(this.budget, {
        operationId: `move-${crypto.randomUUID()}`,
        amount: cost,
        conditions: this.restrictions(this.active),
      });
      this.paths.clear();
      this.paths.set(this.active.id, route);
    } else {
      this.paths = formationRoutes(
        this.map,
        this.party,
        this.enemies,
        this.campaign.formation,
        this.campaign.order,
        to,
      );
    }
    this.emit("change");
  }
  step() {
    if (this.busy || !["exploration", "combat"].includes(this.mode)) return;
    const marching =
      this.mode === "combat"
        ? this.encounter.current === this.active.id
          ? [this.active]
          : []
        : this.campaign.order
            .map((id) => this.party.find((h) => h.id === id))
            .filter((h) => this.canAct(h));
    const occupants = [
      ...this.party.filter((h) => h.survival.status !== "dead"),
      ...this.enemies.filter((e) => e.hp > 0),
    ];
    const steps = companyStep(marching, this.paths, occupants, (h) =>
      movementBlockers(this.party, this.enemies, h, (other) =>
        this.canAct(other),
      ),
    );
    if (steps.length) {
      this.emit("move", {
        steps: steps.map(({ hero, points }) => ({ heroId: hero.id, points })),
      });
      this.discoverRooms();
      if (this.mode === "exploration") this.detect();
      this.checkInteractionArrival();
    } else if (marching.some((h) => this.paths.get(h.id)?.length)) {
      // Do not leave an impossible formation silently waiting forever.
      this.paths.clear();
      this.notify("The route is blocked. Choose another destination.");
      this.emit("change");
      this.checkInteractionArrival();
    }
  }
  detect() {
    const visible = this.enemies.filter(
      (e) =>
        e.hp > 0 &&
        this.party.some(
          (h) =>
            h.survival.status === "active" &&
            distance(h, e) <= 7 &&
            lineOfSight(this.map, h, e),
        ),
    );
    if (!visible.length) return false;
    const groups = new Set(visible.map((e) => e.group)),
      opposition = this.enemies.filter((e) => e.hp > 0 && groups.has(e.group));
    this.paths.clear();
    this.budgets = {};
    this.party.forEach((h) => {
      h.buffs = {};
    });
    this.mode = "combat";
    this.encounter = this.R.startEncounter(
      [
        ...this.party
          .filter((h) => h.survival.status !== "dead")
          .map((h) => ({ id: h.id, side: "players" })),
        ...opposition.map((e) => ({ id: e.id, side: "opposition" })),
      ],
      this.dice(),
    );
    this.note(
      `Encounter · opening ${this.encounter.opening.total}. ${this.encounter.startingSide === "players" ? "Your party" : "The sentries"} acts first.`,
    );
    this.emit("combat");
    this.advance();
    return true;
  }
  beginHero(retained) {
    const h = this.active;
    if (this.encounter.nextSide !== "players")
      throw new Error("The opposition is acting.");
    const restriction = Math.min(
      3,
      Math.max(this.restrictions(h).dazed, this.restrictions(h).grappled),
    );
    if (restriction > 0 && restriction < 3 && !retained) {
      this.emit("turnchoices", { hero: h, count: 3 - restriction });
      throw new Error("Choose the action categories this hero retains.");
    }
    retained ??= restriction === 3 ? [] : ["main", "maneuver", "reaction"];
    this.encounter = this.R.chooseParticipant(this.encounter, h.id);
    h.survival = this.R.startSurvivalTurn(h.survival, h.survival.ownTurn + 1);
    h.buffs = {};
    this.budgets[h.id] = this.R.startTurn({
      turnId: `turn-${this.encounter.serial}`,
      retained,
      speed: this.speed(h),
      conditions: this.restrictions(h),
    });
    if (h.survival.status === "dying") this.emit("dying", { hero: h });
    this.emit("change");
  }
  advance() {
    if (this.mode !== "combat" || this.woundNotices?.length) return;
    this.recordFallen();
    for (const h of this.party.filter((h) => h.survival.status === "dead")) {
      if (
        this.encounter.current !== h.id &&
        this.encounter.roster.some((r) => r.id === h.id && !r.withdrawn)
      )
        this.encounter = this.R.changeRoster(this.encounter, {
          id: h.id,
          mode: "withdraw",
          reason: "Final death",
        });
    }
    if (this.party.every((h) => h.survival.status === "dead")) {
      this.fail();
      return;
    }
    const ids = this.encounter.roster
      .filter((r) => r.side === "opposition" && !r.withdrawn)
      .map((r) => r.id);
    if (
      !this.enemies.some((e) => e.hp > 0 && ids.includes(e.id)) &&
      !this.party.some(
        (h) =>
          ["dying", "lastWords"].includes(h.survival.status) ||
          (h.survival.status !== "dead" &&
            h.conditions.some((c) =>
              ["burning", "freezing", "bleeding"].includes(c.key),
            )),
      )
    ) {
      this.awardEncounterXP(
        this.encounter.roster
          .filter((r) => r.side === "opposition")
          .map((r) => r.id),
      );
      this.mode = "exploration";
      this.encounter = null;
      this.note(
        "The chamber falls silent. Take a safe breath when you are ready.",
      );
      this.emit("change");
      return;
    }
    if (
      this.party.every((h) => ["dead", "stable"].includes(h.survival.status))
    ) {
      this.fail();
      return;
    }
    if (this.encounter.nextSide === "opposition") {
      this.busy = true;
      this.party.forEach((h) => (h.selected = false));
      this.emit("change");
      const expectedEncounter = this.encounter;
      setTimeout(() => {
        if (this.encounter !== expectedEncounter) return;
        try {
          this.enemyTurn();
        } catch (e) {
          this.notify(e.message);
          this.note("Encounter paused: " + e.message);
        } finally {
          this.busy =
            !!this.pendingDefense ||
            (this.mode === "combat" &&
              this.encounter?.nextSide === "opposition");
          this.emit("change");
        }
      }, 650);
    } else {
      const available = this.R.availableParticipants(this.encounter);
      if (this.encounter.current) {
        this.selected = this.party.findIndex(
          (h) => h.id === this.encounter.current,
        );
      } else {
        const lastHero = [...this.encounter.history]
          .reverse()
          .find(
            (e) => e.kind === "end" && this.party.some((h) => h.id === e.id),
          );
        const start = lastHero
          ? (this.party.findIndex((h) => h.id === lastHero.id) + 1) %
            this.party.length
          : this.selected;
        const next = Array.from(
          { length: this.party.length },
          (_, i) => (start + i) % this.party.length,
        ).find((i) => available.some((p) => p.id === this.party[i].id));
        if (next !== undefined) this.selected = next;
      }
      this.party.forEach((h, i) => (h.selected = i === this.selected));
      this.emit("change");
    }
  }
  spend(category, id) {
    if (
      this.mode !== "combat" ||
      this.busy ||
      this.woundNotices?.length ||
      this.encounter.nextSide !== "players"
    )
      throw new Error("Wait for your company’s turn.");
    if (this.paths.get(this.active.id)?.length)
      throw new Error("Wait until movement finishes.");
    if (this.encounter.current !== this.active.id) this.beginHero();
    if (this.active.survival.status === "dying")
      throw new Error("Resolve Dying first.");
    if (!this.canAct(this.active)) throw new Error("This hero cannot act.");
    if (!this.budget.remaining[category])
      throw new Error(`No ${category} action remains.`);
    this.budgets[this.active.id] = this.R.declareAction(this.budget, {
      operationId: `action-${crypto.randomUUID()}`,
      sourceId: id,
      category,
      conditions: this.restrictions(this.active),
    });
  }
  attack(enemyId, kind = null) {
    kind ??= this.held(this.active, "item-ordinary-ranged-weapon")
      ? "ranged"
      : "melee";
    const melee = this.held(this.active, "item-ordinary-melee-weapon");
    return this.useAbility(
      `ability-basic-${kind === "melee" && !melee ? "unarmed" : kind}`,
      enemyId,
    );
  }
  enemyTurn() {
    if (this.mode !== "combat") return;
    const next = this.R.availableParticipants(this.encounter)[0];
    if (!next) return;
    this.encounter = this.R.chooseParticipant(this.encounter, next.id);
    const e = this.enemies.find((e) => e.id === next.id);
    const targets = this.party
      .filter((h) =>
        ["active", "lastWords", "dying"].includes(h.survival.status),
      )
      .sort((a, b) => distance(e, a) - distance(e, b));
    const h = targets[0];
    if (h) {
      if (distance(e, h) > 1) {
        const candidates = neighbors(this.map, h, this.occupied(e.id));
        const routes = candidates
          .map((p) => pathfind(this.map, e, p, this.occupied(e.id)))
          .filter((p) => p.length)
          .sort((a, b) => a.length - b.length);
        const path = routes[0];
        if (path?.length)
          Object.assign(e, path[Math.min(this.enemySpeed(e), path.length) - 1]);
      }
      if (distance(e, h) <= 1 && lineOfSight(this.map, e, h)) {
        if (this.canBlock(h)) {
          this.pendingDefense = { attacker: e.id, target: h.id };
          this.emit("reaction", { hero: h, enemy: e });
          return;
        }
        this.resolveEnemyHit(e, h);
      }
    }
    this.finishEnemyConditions(e);
    this.encounter = this.R.finishTurn(this.encounter);
    this.defeatEnemy(e);
    this.advance();
  }
  survivalChoice(kind) {
    const h = this.active;
    const result =
      kind === "roll" ? this.heroRoll(h, "fortitude", "death") : null;
    h.survival = this.R.resolveSurvival(
      this.R.chooseSurvival(h.survival, kind),
      { retained: result?.retained, fortitude: h.draft.attributes.fortitude },
    );
    this.note(
      `${h.name}: ${h.survival.status}, ${h.survival.marks} death marks, ${h.survival.gritAvailable} Grit.`,
    );
    this.emit("change");
  }
  endTurn() {
    if (this.mode !== "combat" || this.busy) return;
    if (this.woundNotices?.length)
      throw new Error("Acknowledge the wound first.");
    if (this.paths.get(this.active.id)?.length)
      throw new Error("Wait until movement finishes.");
    if (!this.encounter.current) this.beginHero();
    const h = this.active;
    this.R.endSurvivalTurn(h.survival, h.survival.ownTurn); // Validate a due choice before any tick.
    this.tickHeroConditions(h);
    h.survival = this.R.endSurvivalTurn(h.survival, h.survival.ownTurn);
    this.encounter = this.R.finishTurn(this.encounter);
    this.advance();
    this.emit("change");
  }
  convert(from = "maneuver") {
    if (this.mode !== "combat" || this.busy || this.woundNotices?.length)
      return;
    if (!this.encounter.current) this.beginHero();
    if (!this.canAct(this.active))
      throw new Error("Only a capable active hero can convert actions.");
    if (from === "main" && !this.budget.retained.includes("maneuver"))
      throw new Error("Maneuver was not retained this turn.");
    if (!this.budget.remaining[from])
      throw new Error(`No ${from} action remains.`);
    this.budgets[this.active.id] = this.R.convertAction(this.budget, {
      operationId: `convert-${crypto.randomUUID()}`,
      from,
      to: from === "main" ? "maneuver" : "movement",
      conditions: this.restrictions(this.active),
    });
    this.emit("change");
  }
  rest() {
    if (this.mode !== "exploration")
      throw new Error("A safe breath needs a quiet place.");
    if (
      this.enemies.some(
        (e) =>
          e.hp > 0 &&
          this.party.some(
            (h) => distance(h, e) < 10 && lineOfSight(this.map, h, e),
          ),
      )
    )
      throw new Error("Enemies are too close.");
    if (this.party.some((h) => h.wounds.some((w) => !w.applied)))
      throw new Error("Resolve outstanding wounds before resting.");
    if (
      this.party.some((h) =>
        h.conditions.some((c) =>
          ["burning", "freezing", "bleeding"].includes(c.key),
        ),
      )
    )
      throw new Error("Resolve ongoing harm before a safe breath.");
    if (
      this.party.some((h) => ["dying", "lastWords"].includes(h.survival.status))
    )
      throw new Error("Resolve survival before taking a safe breath.");
    this.party
      .filter((h) => h.survival.status !== "dead")
      .forEach((h) => (h.survival = this.R.safeBreath(h.survival)));
    this.note("A safe breath restores HP. Spent Grit does not return.");
    this.emit("change");
  }
  extract() {
    if (
      this.mode !== "exploration" ||
      this.party.some(
        (h) =>
          h.survival.status === "active" && distance(h, this.map.start) > 3,
      )
    )
      throw new Error("Bring the party back to the entrance stairs.");
    this.bankTreasureXP();
    this.campaign.bank += this.campaign.haul;
    this.campaign.haul = 0;
    this.mode = "town";
    this.paths.clear();
    this.note(
      "The expedition returns to Greyhaven. Recovered treasure enters the vault.",
    );
    this.emit("change");
  }
  deeper() {
    if (
      this.mode !== "exploration" ||
      this.party.some(
        (h) => h.survival.status === "active" && distance(h, this.map.exit) > 3,
      )
    )
      throw new Error("Gather the party at the far stairs.");
    this.campaign.depth++;
    this.newFloor();
    this.note(`Descending to depth ${this.campaign.depth}.`);
    this.emit("change");
  }
  fail() {
    if (this.mode === "defeat") return;
    this.recordFallen();
    this.campaign.pendingTreasureXP = 0;
    this.campaign.caches.push({
      x: this.active.x,
      z: this.active.z,
      depth: this.campaign.depth,
      coins: this.campaign.haul,
      expedition: this.campaign.expeditions,
      recovered: false,
    });
    this.campaign.memorial.push({
      names: this.party.map((h) => h.name),
      depth: this.campaign.depth,
      expedition: this.campaign.expeditions,
    });
    this.campaign.haul = 0;
    this.paths.clear();
    this.mode = "defeat";
    this.emit("change");
  }
  replace(index, draft) {
    if (!["town", "defeat"].includes(this.mode))
      throw new Error("Recruit heroes in town.");
    if ((draft.progression?.level ?? 1) !== 1)
      throw new Error(
        "New recruits start at level 1. Use development for earned levels.",
      );
    const replacement = this.createRecruit(draft);
    this.assignHero(index, replacement.heroId);
  }
}

Object.assign(Game.prototype, recoveryMethods);
Object.assign(Game.prototype, interactionMethods);
Object.assign(Game.prototype, rosterMethods, experienceMethods);
