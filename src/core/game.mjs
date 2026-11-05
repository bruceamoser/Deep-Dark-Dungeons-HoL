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
    this.campaign = {
      seed: Math.floor(Math.random() * 2147483647),
      depth: 1,
      bank: 0,
      haul: 0,
      expeditions: 0,
      memorial: [],
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
    for (const h of c.party) {
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
    if (this.mode === "combat" && !this.encounter?.current) this.advance();
  }
  snapshot() {
    return {
      ...this.campaign,
      mode: this.mode,
      selected: this.selected,
      encounter: this.encounter,
      budgets: this.budgets,
      pendingDefense: this.pendingDefense,
      floor: { map: this.map, seen: this.seen, enemies: this.enemies },
    };
  }
  newFloor(saved) {
    this.map = saved?.map ?? generate(this.campaign.seed, this.campaign.depth);
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
    return this.budgets[this.active.id];
  }
  restrictions(h) {
    return this.R.conditionActionRestrictions(h.conditions ?? []);
  }
  movementLeft() {
    return this.budget
      ? this.R.movementRemaining(this.budget, this.restrictions(this.active))
      : this.active.preview.summary.speed;
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
  useAbility(id, targetId) {
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
      const sources = this.R.conditionRollSources(h.conditions ?? [], {
        mode: "attack",
        targetContributions: target.conditions ?? [],
        perceivedSources: this.perceivedSources(h),
      });
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
      this.defeatEnemy(target);
      this.emit("attack", {
        attacker: h.id,
        target: target.id,
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
      h.survival.status === "active" &&
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
        speed: h.preview.summary.speed,
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
    const before = h.survival.wounds,
      applied = this.R.sufferDamage(h.survival, damage.total);
    h.survival = applied.state;
    this.note(
      `${h.name} defends (Agility, ${boons} Boon / ${banes} Bane): ${result.retained.join(" + ")} → ${result.total} ${result.tier}; suffers ${damage.total} damage.`,
    );
    this.emit("attack", { attacker: e.id, target: h.id, damage: damage.total });
    if (applied.wound) {
      const roll = this.R.woundRoll(before, this.dice(Math.min(5, 3 + before))),
        wound = this.R.woundResult(this.C.wounds, "physical", roll.key);
      h.wounds.push(wound);
      if (wound.effects.some((e) => e.kind === "lastWords"))
        h.survival = this.R.enterLastWords(h.survival);
      this.note(`Wound ${roll.key}: ${wound.record.injury}.`);
      this.mode = "wound-review";
      this.emit("wound", { hero: h, wound });
    }
  }
  stand() {
    if (
      this.mode !== "combat" ||
      this.busy ||
      this.active.survival.status !== "active"
    )
      throw new Error("Wait for an active hero’s turn.");
    if (!this.encounter.current) this.beginHero();
    if (!(this.active.conditions ?? []).some((c) => c.key === "prone"))
      throw new Error("This hero is already standing.");
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
  gearReason(index, instanceId, operation = "ready") {
    const h = this.party[index],
      item = h?.preview.inventory.items.find(
        (i) => i.instanceId === instanceId,
      );
    if (!item?.carried) return "This item must be carried.";
    if (!["town", "exploration", "combat"].includes(this.mode) || this.busy)
      return "Wait for your company’s turn.";
    if (h.survival.status !== "active")
      return "This hero cannot handle equipment.";
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
        this.encounter.current === h.id &&
        !this.budgets[h.id]?.remaining.maneuver
      )
        return "No Maneuver remains.";
      if (this.restrictions(h).helpless) return "This hero cannot act.";
    }
    return "";
  }
  equip(index, instanceId, operation = "ready") {
    const reason = this.gearReason(index, instanceId, operation);
    if (reason) throw new Error(reason);
    const h = this.party[index],
      items = h.preview.inventory.items,
      item = items.find((i) => i.instanceId === instanceId);
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
      const stow =
        items.filter((i) => i.held).reduce((n, i) => n + i.hands, 0) +
          item.hands >
        2;
      for (const i of items) set(i, { held: i === item || (!stow && i.held) });
    }
    const preview = this.R.workshopCharacter(draft, this.C);
    if (!preview.valid)
      throw new Error(preview.errors.map((e) => e.text).join("; "));
    if (this.mode === "combat")
      this.spend("maneuver", "ability-handle-an-item");
    h.draft = draft;
    h.preview = preview;
    this.note(
      `${h.name} ${{ ready: "readies", stow: "stows", wear: "puts on", remove: "removes" }[operation]} ${item.definition.name}${this.mode === "combat" ? " · Maneuver spent" : ""}.`,
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
    if (h.survival.status !== "active")
      return "Resolve survival before acting.";
    if (this.paths.get(h.id)?.length) return "Wait until movement finishes.";
    const a = ABILITIES[id];
    if (!a || !this.availableActions(h).some((c) => c.id === id))
      return "Not learned.";
    if (this.encounter.current === h.id && !this.budget?.remaining[a.category])
      return `No ${a.category} remains.`;
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
      this.party.some((h) => h.survival.status !== "active" || h.wounds.length)
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
    if (
      this.mode === "combat" &&
      this.encounter.current &&
      this.encounter.current !== this.party[i].id
    )
      throw new Error("Finish the current hero’s turn first.");
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
    return pathfind(this.map, h, to, this.occupied(h.id));
  }
  move(to) {
    if (this.busy) return;
    if (this.mode === "combat" && !this.encounter.current) this.beginHero();
    const route = this.route(to);
    if (!route.length) return;
    if (this.mode === "combat") {
      if (this.encounter.current !== this.active.id)
        throw new Error("Choose a hero whose turn is available.");
      const remaining = this.movementLeft();
      if (route.length > remaining)
        throw new Error(`Only ${remaining} squares remain.`);
      this.budgets[this.active.id] = this.R.spendMovement(this.budget, {
        operationId: `move-${crypto.randomUUID()}`,
        amount: route.length,
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
    let moved = false;
    const marching =
      this.mode === "combat"
        ? [this.active]
        : this.campaign.order.map((id) => this.party.find((h) => h.id === id));
    for (const h of marching) {
      if (this.mode === "combat" && this.encounter.current !== h.id) continue;
      const path = this.paths.get(h.id);
      if (!path?.length) continue;
      const next = path[0];
      if (this.occupied(h.id).has(key(next.x, next.z))) {
        // Companions wait for occupied cells, and take an alternative route when possible.
        const alternative = pathfind(
          this.map,
          h,
          path.at(-1),
          this.occupied(h.id),
        );
        if (alternative.length) this.paths.set(h.id, alternative);
        continue;
      }
      Object.assign(h, path.shift());
      moved = true;
      if (this.mode === "exploration" && this.detect()) break;
    }
    if (moved) {
      this.emit("move");
      this.collect();
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
  beginHero() {
    const h = this.active;
    if (this.encounter.nextSide !== "players")
      throw new Error("The opposition is acting.");
    this.encounter = this.R.chooseParticipant(this.encounter, h.id);
    h.survival = this.R.startSurvivalTurn(h.survival, h.survival.ownTurn + 1);
    h.buffs = {};
    this.budgets[h.id] = this.R.startTurn({
      turnId: `turn-${this.encounter.serial}`,
      speed: h.preview.summary.speed,
      conditions: this.restrictions(h),
    });
    if (h.survival.status === "dying") this.emit("dying", { hero: h });
    this.emit("change");
  }
  advance() {
    if (this.mode !== "combat") return;
    const ids = this.encounter.roster
      .filter((r) => r.side === "opposition" && !r.withdrawn)
      .map((r) => r.id);
    if (!this.enemies.some((e) => e.hp > 0 && ids.includes(e.id))) {
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
      if (!available.some((p) => p.id === this.active.id))
        this.selected = this.party.findIndex((h) =>
          available.some((p) => p.id === h.id),
        );
      this.party.forEach((h, i) => (h.selected = i === this.selected));
      this.emit("change");
    }
  }
  spend(category, id) {
    if (this.paths.get(this.active.id)?.length)
      throw new Error("Wait until movement finishes.");
    if (this.encounter.current !== this.active.id) this.beginHero();
    if (this.active.survival.status === "dying")
      throw new Error("Resolve Dying first.");
    if (this.active.survival.status !== "active")
      throw new Error("This hero cannot act.");
    if (!this.budget.remaining[category])
      throw new Error(`No ${category} action remains.`);
    this.budgets[this.active.id] = this.R.declareAction(this.budget, {
      operationId: `action-${crypto.randomUUID()}`,
      sourceId: id,
      category,
    });
  }
  attack(enemyId, kind = "melee") {
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
    h.survival = this.R.resolveSurvival(
      this.R.chooseSurvival(h.survival, kind),
      { retained: this.dice(), fortitude: h.draft.attributes.fortitude },
    );
    this.note(
      `${h.name}: ${h.survival.status}, ${h.survival.marks} death marks, ${h.survival.gritAvailable} Grit.`,
    );
    this.emit("change");
  }
  endTurn() {
    if (this.mode !== "combat" || this.busy) return;
    if (this.paths.get(this.active.id)?.length)
      throw new Error("Wait until movement finishes.");
    if (!this.encounter.current) this.beginHero();
    const h = this.active;
    h.survival = this.R.endSurvivalTurn(h.survival, h.survival.ownTurn);
    this.encounter = this.R.finishTurn(this.encounter);
    this.advance();
    this.emit("change");
  }
  convert(from = "maneuver") {
    if (this.mode !== "combat" || this.busy) return;
    if (!this.encounter.current) this.beginHero();
    if (this.active.survival.status !== "active")
      throw new Error("Only an active hero can convert actions.");
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
    if (this.party.some((h) => h.wounds.length))
      throw new Error("Resolve outstanding wounds before resting.");
    this.party.forEach((h) => (h.survival = this.R.safeBreath(h.survival)));
    this.note("A safe breath restores HP. Spent Grit does not return.");
    this.emit("change");
  }
  collect() {
    if (this.mode !== "exploration") return;
    for (const c of this.map.chests)
      if (!c.opened && this.party.some((h) => distance(h, c) <= 1)) {
        c.opened = true;
        this.campaign.haul += c.coins;
        this.note(`Recovered ${c.coins} coins from a forgotten coffer.`);
        this.emit("loot", { chest: c });
      }
    for (const c of this.campaign.caches)
      if (
        !c.recovered &&
        c.depth === this.campaign.depth &&
        this.party.some((h) => distance(h, c) <= 1)
      ) {
        c.recovered = true;
        this.campaign.haul += c.coins;
        this.note(
          `Recovered ${c.coins} coins from expedition ${c.expedition}.`,
        );
      }
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
    if (this.enemies.every((e) => e.hp === 0)) {
      for (const h of this.party.filter(
        (h) => h.survival.status === "active",
      )) {
        if (!h.milestones.includes(this.campaign.depth)) {
          h.milestones.push(this.campaign.depth);
          h.earnedLevel = Math.min(100, h.earnedLevel + 1);
          this.note(
            `${h.name} earned level ${h.earnedLevel}. Spend development points in town.`,
          );
        }
      }
    }
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
    const previous = this.party[index];
    const replacement = this.hero(draft, index);
    Object.assign(replacement, {
      x: previous.x,
      z: previous.z,
      selected: index === this.selected,
    });
    this.party[index] = replacement;
    this.emit("party");
    this.emit("change");
  }
}
