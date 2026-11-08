import { provisionMethods, prepareProvisions } from "./provisions.mjs";
import { migrateCombinedSupplies } from "./supply-dice.mjs";
import { campMedicalMethods } from "./camp-medical.mjs";
import { campMethods } from "./camp.mjs";
import { bulkCatalog } from "./bulk.mjs";
import { forgeCharacter } from "./forge.mjs";
import { forgeGameMethods } from "./forge-game.mjs";
import { validateGameState } from "./game-state.mjs";
import { buildMethods } from "./builds.mjs";
import { normalizeAppearance, identityMethods } from "./identity.mjs";
import { recipeMethods } from "./recipes.mjs";
import { gameCareMethods } from "./game-care.mjs";
import { POWERS, mappedPower, isTrainable } from "./powers.mjs";
import { powerMethods } from "./power-engine.mjs";
import { battlefieldMethods } from "./battlefield.mjs";
import { respecMethods } from "./respec.mjs";
import { retrainingMethods } from "./retraining.mjs";
import { tacticMethods } from "./tactics.mjs";
import { ancestryGameMethods, traitsOf, traitIds } from "./ancestry-game.mjs";
import { opportunityMethods } from "./opportunities.mjs";
import { craftingMethods } from "./crafting.mjs";
import {
  expeditionMethods,
  prepareExpedition,
  EXPEDITION_TIME,
} from "./expedition.mjs";
import { prepareLighting } from "./lighting.mjs";
import { combatFeedback } from "./feedback.mjs";
import { marketMethods } from "./market.mjs";
import {
  gearPreview,
  treasureMethods,
  magicItem,
  recallScroll,
  slotOf,
  activeItemEffects,
} from "./treasure.mjs";
import { populateEncounters, bestiaryMethods } from "./bestiary.mjs";
import {
  movementBlockers,
  reachableCells,
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
    this.R = catalogs.forge
      ? { ...rules, workshopCharacter: forgeCharacter }
      : rules;
    this.C = bulkCatalog(catalogs);
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
    if (this.campaign)
      for (const h of [...this.party, ...(this.enemies ?? [])])
        h.concealed = !!this.powerStat(h, "hidden");
    const feedback = combatFeedback(
      type === "floor" ? null : this.feedbackState,
      [...this.party, ...(this.enemies ?? [])],
      this.R,
    );
    this.feedbackState = feedback.next;
    for (const event of feedback.events)
      for (const f of this.listeners) f("feedback", event);
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
    const hero = {
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
    hero.draft.appearance = normalizeAppearance(
      draft.appearance,
      draft.ancestryId,
      draft.name,
    );
    hero.preview = gearPreview(this.R, this.C, hero);
    if (this.C.gamePowers)
      hero.favorites = [
        ...new Set(hero.favorites.map((id) => mappedPower(id, this.C))),
      ]
        .filter((id) => this.availableActions(hero).some((c) => c.id === id))
        .slice(0, 8);
    if (this.C.forge) hero.favorites = this.forgeFavorites(hero);
    return hero;
  }
  fresh(drafts) {
    this.pause();
    this.pendingDefense = null;
    this.pendingProvocation = null;
    this.busy = false;
    this.selected = 0;
    this.log = [];
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
    prepareExpedition(this.campaign);
    prepareProvisions(this.campaign);
    this.mode = "town";
    this.newFloor();
    this.note("Four names in the register. One road beneath the earth.");
    this.resume();
  }
  load(c, { resume = true } = {}) {
    validateGameState(c);
    prepareProvisions(c);
    migrateCombinedSupplies(c, this.C);
    this.pause();
    prepareRoster(c);
    c.woundNotices ??= [];
    if (c.mode === "wound-review" && c.encounter) c.mode = "combat";
    for (const h of [
      ...c.party,
      ...c.reserve,
      ...c.fallenHeroes.map((e) => e.hero),
    ]) {
      h.draft.appearance = normalizeAppearance(
        h.draft.appearance,
        h.draft.ancestryId,
        h.name,
      );
      const p = gearPreview(this.R, this.C, h);
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
          )
            .map((id) => (this.C.gamePowers ? mappedPower(id, this.C) : id))
            .filter((id) => this.availableActions(h).some((c) => c.id === id)),
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
    prepareExpedition(c);
    this.campaign = c;
    this.selected =
      Number.isInteger(c.selected) && c.selected >= 0 && c.selected < 4
        ? c.selected
        : 0;
    this.busy = false;
    this.pendingDefense = null;
    this.woundNotices = c.woundNotices ?? [];
    this.newFloor(c.floor, { silent: true });
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
    this.pendingProvocation = c.pendingProvocation ?? null;
    if (this.pendingProvocation) {
      const p = this.pendingProvocation;
      if (
        this.mode !== "combat" ||
        p.actor !== this.encounter.current ||
        !Array.isArray(p.attackers) ||
        !Number.isInteger(p.cursor) ||
        p.cursor < 0 ||
        p.cursor > p.attackers.length ||
        ![
          "move",
          "ability",
          "recovery",
          "potion",
          "equip",
          "stand",
          "torch",
          "lantern",
          "enemy",
          "enemy-move",
          "enemy-stand",
        ].includes(p.operation?.kind)
      )
        throw new Error("Invalid saved opportunity sequence.");
      this.busy = true;
    }
    if (c.pendingDefense && this.mode === "combat") {
      if (
        !this.party.some((h) => h.id === c.pendingDefense.target) ||
        !this.enemies.some((e) => e.id === c.pendingDefense.attacker) ||
        (this.encounter.current !== c.pendingDefense.attacker &&
          !(
            c.pendingDefense.opportunity &&
            this.pendingProvocation?.actor === c.pendingDefense.target
          ))
      )
        throw new Error("Saved reaction is invalid.");
      this.pendingDefense = c.pendingDefense;
      this.busy = true;
    }
    this.paths = new Map(c.paths ?? []);
    for (const [id, route] of this.paths) {
      if (
        !this.party.some((h) => h.id === id) ||
        !Array.isArray(route) ||
        route.some((p) => !this.map.tiles[key(p.x, p.z)])
      )
        throw new Error("Saved movement is invalid.");
    }
    this.log = c.log ?? [];
    this.pendingInteraction = c.pendingInteraction ?? null;
    this.emit("floor");
    this.emit("change");
    if (resume) this.resume();
  }
  pause() {
    this.suspended = true;
    clearTimeout(this.enemyTimer);
    this.enemyTimer = null;
  }
  resume() {
    this.suspended = false;
    if (this.woundNotices?.length) {
      const n = this.woundNotices[0],
        h = this.party.find((h) => h.id === n.heroId);
      this.emit("wound", {
        hero: h,
        wound: h.wounds.find((w) => w.id === n.woundId),
      });
    } else if (this.pendingDefense) {
      this.emit("reaction", {
        hero: this.party.find((h) => h.id === this.pendingDefense.target),
        enemy: this.enemies.find((e) => e.id === this.pendingDefense.attacker),
      });
    } else if (this.pendingProvocation) {
      this.continueProvocation();
    } else if (
      this.mode === "combat" &&
      this.encounter.current &&
      this.active.survival.status === "dying" &&
      this.active.survival.due === this.active.survival.ownTurn &&
      !this.active.survival.choice?.resolved
    ) {
      this.emit("dying", { hero: this.active });
    } else if (this.mode === "combat" && !this.encounter.current)
      this.advance();
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
      paths: [...this.paths],
      pendingInteraction: this.pendingInteraction,
      log: this.log,
      selected: this.selected,
      encounter: this.encounter,
      budgets: this.budgets,
      pendingDefense: this.pendingDefense,
      pendingProvocation: this.pendingProvocation,
      woundNotices: this.woundNotices ?? [],
      floor: { map: this.map, seen: this.seen, enemies: this.enemies },
    };
  }
  newFloor(saved, { silent = false } = {}) {
    this.campaign.deepest = Math.max(
      this.campaign.deepest ?? 1,
      this.campaign.depth,
    );
    this.pendingInteraction = null;
    this.map = saved?.map ?? generate(this.campaign.seed, this.campaign.depth);
    prepareLighting(this.map);
    if (!this.map.waterSources) {
      const room = this.map.rooms[1] ?? this.map.rooms[0] ?? this.map.start;
      const tiles = Object.values(this.map.tiles).filter(
        (p) =>
          !this.map.obstacles[key(p.x, p.z)] &&
          distance(p, this.map.start) > 3 &&
          distance(p, this.map.exit) > 2,
      );
      tiles.sort(
        (a, b) =>
          distance(a, { x: room.cx ?? room.x, z: room.cz ?? room.z }) -
          distance(b, { x: room.cx ?? room.x, z: room.cz ?? room.z }),
      );
      this.map.waterSources = tiles[0]
        ? [{ x: tiles[0].x, z: tiles[0].z }]
        : [];
    }
    if (!saved)
      this.campaign.lootGeneration = (this.campaign.lootGeneration ?? 0) + 1;
    const treasureSeed =
      this.campaign.seed + (this.campaign.lootGeneration ?? 0) * 32452843;
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
      populateEncounters(
        this.map,
        this.C.creatures,
        this.party
          .filter((h) => h.survival.status !== "dead")
          .map((h) => h.preview.state.level),
      );
    if (
      !saved ||
      this.map.chests.some((c) => !c.opened && c.items === undefined)
    )
      this.map.chests.forEach((c, i) => {
        if (saved && (c.opened || c.items !== undefined)) return;
        c.items = [
          this.uniqueMagic(
            (treasureSeed + this.campaign.depth * 98317 + i * 131) >>> 0,
            this.campaign.depth,
          ),
        ].filter(Boolean);
      });
    if (!saved && this.map.chests[0])
      this.map.chests[0].items.push(
        recallScroll((treasureSeed + this.campaign.depth * 31) >>> 0),
      );
    if (!saved && this.map.bossId) {
      const coffer = this.map.chests.at(-1);
      coffer.guardBossId = this.map.bossId;
      coffer.items = [
        this.uniqueMagic(
          (treasureSeed + this.campaign.depth * 65129) >>> 0,
          this.campaign.depth,
          { power: 2, boss: true },
        ),
      ].filter(Boolean);
    }
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
    if (!saved) for (const h of this.party) h.lantern = false;
    this.syncTorches({ silent });
    if (!silent) this.emit("floor");
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
      : this.R.movementRemaining(
          {
            ...this.R.startTurn({
              turnId: "movement-preview",
              speed: this.speed(this.active),
            }),
            bonusMovement: this.tacticValue(this.active, "movement"),
          },
          this.restrictions(this.active),
        );
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
        ABILITIES[c.id].category !== "passive" &&
        (c.universal || this.powerIds(h).includes(c.id)),
    );
  }
  useAbility(id, targetId, options = {}) {
    if (POWERS[id]) return this.usePower(id, targetId);
    if (ABILITIES[id]?.tactic) return this.useTactic(id, targetId);
    if (id === "ability-lantern-in-the-palm")
      return this.toggleLantern(this.selected);
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
      card = this.C.choices.find(
        (c) =>
          c.id === id &&
          (c.universal || this.active.preview.state.abilities.includes(id)),
      ),
      h = this.active;
    if (!spec || !card)
      throw new Error("This hero has not learned that dungeon action.");
    if (!this.canAct(h)) throw new Error("This hero cannot act.");
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
    if (spec.target === "enemy" && !this.heroCanSee(h, target))
      throw new Error("That target is hidden in darkness.");
    if (
      spec.range &&
      (distance(h, target) >
        (spec.target === "ally" && spec.range === 1
          ? this.touchRange(h)
          : spec.range) ||
        !lineOfSight(this.map, h, target))
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
    if (
      spec.requiredItem &&
      !h.preview.inventory.items.some(
        (i) => i.carried && i.catalogId === spec.requiredItem,
      )
    )
      throw new Error("Carry the ability’s required equipment first.");
    if (
      spec.cloth &&
      !h.preview.inventory.items.some(
        (i) => i.carried && /clothes/.test(i.catalogId),
      )
    )
      throw new Error("Bandaging requires cloth.");
    if (spec.healing || spec.reduce) return this.recoveryAbility(id, targetId);
    if (spec.target === "enemy" && !this.heroCanSee(h, target))
      throw new Error(
        "This attack needs a visible target; resolve Blinded first.",
      );
    let drawWeapon = null;
    if (spec.weapon && !this.held(h, `item-ordinary-${spec.weapon}-weapon`)) {
      const freeHands =
        2 -
        Number(!!h.torch?.held) -
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
    if (
      !this.continuingProvocation &&
      spec.once &&
      h.signatureUses?.includes(id)
    )
      throw new Error("Already used this encounter.");
    if (spec.selfCost && h.survival.hp <= spec.selfCost)
      throw new Error("The cost must leave you above 0 HP.");
    this.spend(spec.category, id);
    if (
      spec.spell &&
      this.provoke(h, {
        kind: "ability",
        id,
        target: targetId,
        options,
        label: "casting",
      })
    )
      return;
    if (spec.once) (h.signatureUses ??= []).push(id);
    if (spec.selfCost) h.survival.hp -= spec.selfCost;
    if (drawWeapon) {
      const relic = h.treasure?.find(
        (i) => i.instanceId === drawWeapon.instanceId,
      );
      if (relic) relic.held = true;
      h.draft.loadout ??= {};
      h.draft.loadout[drawWeapon.instanceId] = {
        ...h.draft.loadout[drawWeapon.instanceId],
        held: true,
        carried: true,
      };
      this.refreshHero(h);
      this.emit("party");
    }
    if (id === "ability-disengage") {
      this.budget.disengaged = true;
      if (
        h.preview.state.abilities.includes("ability-quick-exit") &&
        !this.budget.quickExitUsed
      ) {
        this.budget.bonusMovement = (this.budget.bonusMovement ?? 0) + 1;
        this.budget.quickExitUsed = true;
      }
      this.note(`${h.name} disengages: movement does not provoke this turn.`);
    } else if (id === "ability-defend") {
      h.buffs.defend = true;
      this.note(`${h.name} defends: +1 defense Boon until their next turn.`);
    } else if (id === "ability-stabilize") {
      target.survival = this.R.stabilize(target.survival);
      this.note(
        `${h.name} stabilizes ${target.name} at 0 HP; death marks cleared.`,
      );
    } else {
      const defense = this.creatureDefense(target, h, spec);
      const sources = [
        {
          kind: "boon",
          amount:
            defense.boons +
            (spec.boonCondition &&
            target.conditions?.some((c) => c.key === spec.boonCondition[0])
              ? spec.boonCondition[1]
              : 0),
        },
        { kind: "bane", amount: defense.banes },
        ...this.woundRollSources(h, spec.attribute),
        ...this.fatigueSources(h),
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
      const result = this.rollFor(h, spec.attribute, boons, banes, {
          mode: "attack",
          target,
          spec,
        }),
        tier = ["weak", "standard", "strong"].indexOf(result.tier);
      const weapon = spec.weapon
        ? this.held(h, `item-ordinary-${spec.weapon}-weapon`)
        : null;
      const enchantments = weapon
        ? activeItemEffects(h, weapon).filter((e) => e.effect === "damage")
        : [];
      const damage = this.R.damageEvent({
        components: [
          {
            type: spec.type,
            amount: Math.max(
              0,
              spec.damage[tier] +
                this.consumeDamageBonus(h) +
                this.buildDamage(
                  h,
                  target,
                  spec,
                  spec.type,
                  tier,
                  !!this.powerStat(h, "hidden"),
                ),
            ),
          },
          ...enchantments.map((e) => ({
            type: e.type,
            amount: this.enchantmentDamage(h, e, spec.type),
          })),
        ],
        resistances: defense.resistances,
        weaknesses: this.creatureWeaknesses(target),
      });
      this.breakConcealment(h);
      damage.total = this.absorbPowerDamage(target, damage.total, spec.type);
      target.hp = Math.max(0, target.hp - damage.total);
      target.conditions ??= [];
      for (const [condition, rating] of [
        ...(spec.conditions?.[tier] ?? []),
        ...(tier === 2
          ? enchantments.map((e) => [
              e.condition,
              1 + this.buildStat(h, e.condition),
            ])
          : []),
      ].filter(
        ([k]) =>
          !this.creature(target)?.immunities.some((i) => i.toLowerCase() === k),
      ))
        target.conditions.push({
          id: `effect-${crypto.randomUUID()}`,
          key: condition,
          rating,
          source: h.id,
          order: this.encounter.serial,
          persistence: condition === "prone" ? "binary" : "temporary",
        });
      this.note(
        `${h.name} · ${card.name} (${spec.attribute}): ${result.retained.join(" + ")} ${this.attribute(h, spec.attribute) >= 0 ? "+" : ""}${this.attribute(h, spec.attribute)} → ${result.total} ${result.tier}; ${damage.total} ${spec.type} damage${result.natural ? ` · natural ${result.natural}` : ""}${target.hp === 0 ? ` · ${target.name} defeated` : ""}.`,
      );
      if (spec.conditions?.[tier]?.length)
        this.note(
          `${target.name}: ${spec.conditions[tier].map(([k, r]) => `${k} ${r}`).join(", ")}.`,
        );
      if (defense.collapse && target.hp > 0)
        target.conditions.push({
          id: `collapse-${crypto.randomUUID()}`,
          key: "prone",
          rating: 1,
          persistence: "binary",
          source: target.id,
        });
      if (ammunition) {
        this.checkSupply(h, ammunition, "ammunition after shot");
      }
      if (spec.push?.[tier] && target.hp > 0)
        this.forceMove(
          target,
          { x: Math.sign(target.x - h.x), z: Math.sign(target.z - h.z) },
          spec.push[tier],
        );
      if (spec.pull?.[tier] && target.hp > 0)
        this.forceMove(
          target,
          { x: Math.sign(h.x - target.x), z: Math.sign(h.z - target.z) },
          spec.pull[tier],
        );
      if (spec.mark)
        target.companyMark = Math.max(target.companyMark ?? 0, spec.mark);
      if (spec.after) this.addTactic(h, h, spec.after, id);
      this.creatureAfterHit(target, h, spec, damage.total);
      this.buildAfterHit(h, target, spec, spec.type, enchantments);
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
      (this.creature(e)?.speed.ordinary ?? 5) -
        summary.slowed.rating -
        (summary.prone.active ? 2 : 0),
    );
  }
  finishEnemyConditions(e) {
    // Sentries stand before acting when prone; this spends two movement squares.
    if (
      (this.creature(e)?.speed.ordinary ?? 5) -
        this.R.conditionSummary(e.conditions ?? []).slowed.rating >=
      2
    )
      e.conditions = (e.conditions ?? []).filter((c) => c.key !== "prone");
    const plan = this.R.conditionEndPlan(e.conditions, {
      turnId: `npc-${this.encounter.serial}`,
      resistances: this.creatureResistances(e),
      durationPolicies: {
        blinded: "independent",
        deafened: "independent",
        paralyzed: "independent",
        asleep: "independent",
      },
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
      (!h.draft.forge ||
        h.preview.state.abilities.includes("ability-shield-block")) &&
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
    const opportunity = this.pendingDefense.opportunity;
    this.pendingDefense = null;
    this.resolveEnemyHit(e, h, opportunity);
    if (opportunity) {
      this.continueProvocation();
      this.emit("change");
      return;
    }
    this.finishEnemyConditions(e);
    this.finishCombatTurn();
    this.defeatEnemy(e);
    this.busy = false;
    this.advance();
    this.emit("change");
  }
  resolveEnemyHit(e, h, opportunity = false) {
    const action = opportunity
        ? {
            name: "Opportunity · Basic Melee",
            attribute: "agility",
            type: "physical",
            range: 1,
            outcomes: {
              weak: "5 damage",
              standard: "3 damage",
              strong: "2 damage",
            },
          }
        : this.creatureAction(e),
      card = this.creature(e);
    const sources = [
      ...this.R.conditionRollSources(h.conditions ?? [], {
        mode: "defense",
        perceivedSources: this.perceivedSources(h),
      }),
      ...this.R.passiveAncestryDefenseSources(traitIds(h)),
      ...this.woundRollSources(h, action.attribute),
      ...this.fatigueSources(h),
      ...this.creatureAttackModifiers(e, h),
      { kind: "boon", amount: card?.defenses.threat.boons ?? 0 },
      {
        kind: "bane",
        amount: (card?.defenses.threat.banes ?? 0) + Number(!!e.study),
      },
    ];
    const boons =
        Math.max(0, -this.powerStat(e, "attack")) +
        Number(!!h.buffs.defend) +
        Number(!!h.buffs.shield && action.type === "physical") +
        sources
          .filter((s) => s.kind === "boon")
          .reduce((n, s) => n + s.amount, 0),
      banes = sources
        .filter((s) => s.kind === "bane")
        .reduce((n, s) => n + s.amount, 0);
    const defenseAttribute =
      action.type === "physical" &&
      ["brawn", "agility"].includes(action.attribute) &&
      h.preview.state.abilities.includes(
        "ability-signature-intellect-predict-the-motion",
      ) &&
      this.attribute(h, "knowledge") > this.attribute(h, action.attribute)
        ? "knowledge"
        : action.attribute;
    const result = this.rollFor(h, defenseAttribute, boons, banes, {
      mode: "defense",
      target: e,
      type: action.type,
      projectile: !!action.ammunition,
    });
    const outcome = action.outcomes[result.tier];
    const damage = this.R.damageEvent({
      components: [
        {
          type: action.type,
          amount: Number(outcome.match(/^\d+/)[0]),
        },
      ],
      resistances: this.powerResistances(
        h,
        Object.entries(h.preview.resistances).map(([type, value]) => ({
          type,
          value,
        })),
      ),
    });
    this.suffer(h, damage.total, action.type, e);
    for (const m of outcome.matchAll(
      /(Burning|Freezing|Bleeding|Poisoned|Slowed|Dazed|Paralyzed|Frightened|Blinded|Deafened) (\d+)/gi,
    ))
      this.addCreatureCondition(h, m[1].toLowerCase(), Number(m[2]), e);
    if (/Prone/i.test(outcome)) this.addCreatureCondition(h, "prone", 1, e);
    const push = Number(outcome.match(/(?:Push|Pull) (\d+)/i)?.[1] ?? 0),
      direction = /Pull/i.test(outcome) ? -1 : 1;
    if (push)
      this.forceMove(
        h,
        {
          x: direction * Math.sign(h.x - e.x),
          z: direction * Math.sign(h.z - e.z),
        },
        push,
      );
    if (action.ammunition) {
      const die = e.ammunition ?? 6;
      const check = this.R.inventoryCheck({
        die,
        retained: 1 + Math.floor(Math.random() * die),
      });
      e.ammunition = check.after;
    }
    if (action.type === "physical") this.riposte(h, e);
    e.study = false;
    e.chilled = false;
    this.note(
      `${e.name} · ${action.name}: ${h.name} defends (${defenseAttribute}, ${boons} Boon / ${banes} Bane): ${result.retained.join(" + ")} → ${result.total} ${result.tier}; suffers ${damage.total} damage.`,
    );
    this.emit("attack", {
      attacker: e.id,
      target: h.id,
      damage: damage.total,
      ranged: action.ammunition,
      spell: action.spell || (action.range > 1 && action.type !== "physical"),
      element: action.type,
    });
  }
  stand() {
    if (this.mode !== "combat" || this.busy || !this.canAct(this.active))
      throw new Error("Wait for an active hero’s turn.");
    if (!this.encounter.current) this.beginHero();
    if (!(this.active.conditions ?? []).some((c) => c.key === "prone"))
      throw new Error("This hero is already standing.");
    if (!this.continuingProvocation && this.movementLeft() < 2)
      throw new Error("Standing requires 2 movement.");
    if (!this.continuingProvocation)
      this.budgets[this.active.id] = this.R.spendMovement(this.budget, {
        operationId: `stand-${crypto.randomUUID()}`,
        amount: 2,
        conditions: this.restrictions(this.active),
      });
    if (this.provoke(this.active, { kind: "stand", label: "standing up" }))
      return;
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
  gearPlan(index, instanceId, operation = "ready", targetSlot = null) {
    const items = this.party[index].preview.inventory.items,
      item = items.find((i) => i.instanceId === instanceId),
      held = items.filter((i) => i.held && i !== item);
    if (!item) return { stow: [], cost: 0 };
    const stow = [];
    const freeStow =
      operation === "stow" &&
      traitsOf(this.party[index]).some((t) => t.quickStow) &&
      !this.budgets?.[this.party[index].id]?.quickStowUsed;
    if (operation === "wear") {
      const slot =
        item.slot === "ring"
          ? (targetSlot ??
            ["ring-left", "ring-right"].find(
              (slot) => !items.some((i) => i.worn && slotOf(i) === slot),
            ) ??
            "ring-left")
          : slotOf(item);
      return {
        stow: items
          .filter(
            (i) =>
              i !== item &&
              i.worn &&
              slotOf(i) === slot &&
              i.catalogId !== "item-travel-clothes",
          )
          .map((i) => i.instanceId),
        cost: 0,
        slot,
      };
    }
    let occupied =
      held.reduce((n, i) => n + i.hands, 0) +
      Number(!!this.party[index].torch?.held);
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
    if (
      operation === "ready" &&
      occupied + item.hands > 2 &&
      this.party[index].torch?.held
    )
      stow.push("held-torch");
    return {
      stow,
      cost:
        freeStow || ["wear", "remove"].includes(operation)
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
      if (this.mode === "combat")
        return "Change worn equipment outside combat.";
      const tier = item.catalogId.match(
        /item-ordinary-(light|medium|heavy)-armor/,
      )?.[1];
      if (!tier && (!item.slot || item.hands))
        return "Choose wearable equipment.";
      if (
        operation === "wear" &&
        tier &&
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
        !this.continuingProvocation &&
        (this.encounter.current === h.id
          ? (this.budgets[h.id]?.remaining.maneuver ?? 0)
          : 1) < this.gearPlan(index, instanceId, operation).cost
      )
        return `Requires ${this.gearPlan(index, instanceId, operation).cost} Maneuver${this.gearPlan(index, instanceId, operation).cost === 1 ? "" : "s"}; convert Main if needed.`;
      if (!this.canAct(h)) return "This hero cannot act.";
    }
    return "";
  }
  equip(index, instanceId, operation = "ready", targetSlot = null) {
    const reason = this.gearReason(index, instanceId, operation);
    if (reason) throw new Error(reason);
    const h = this.party[index],
      items = h.preview.inventory.items,
      item = items.find((i) => i.instanceId === instanceId);
    const plan = this.gearPlan(index, instanceId, operation, targetSlot);
    if (
      targetSlot &&
      item.slot === "ring" &&
      !["ring-left", "ring-right"].includes(targetSlot)
    )
      throw new Error("Choose a ring slot.");
    const treasure = structuredClone(h.treasure ?? []);
    const draft = structuredClone(h.draft);
    draft.loadout ??= {};
    const set = (i, values) => {
      const relic = treasure.find((t) => t.instanceId === i.instanceId);
      if (relic) Object.assign(relic, values);
      else
        draft.loadout[i.instanceId] = {
          ...draft.loadout[i.instanceId],
          ...values,
        };
    };
    if (operation === "wear") {
      for (const i of items.filter((i) => plan.stow.includes(i.instanceId)))
        set(i, { worn: false });
      set(item, { worn: true, equippedSlot: plan.slot });
    } else if (operation === "remove") set(item, { worn: false });
    else if (operation === "stow") set(item, { held: false });
    else {
      for (const i of items)
        set(i, {
          held: i === item || (!plan.stow.includes(i.instanceId) && i.held),
        });
    }
    const preview = gearPreview(this.R, this.C, { ...h, treasure }, draft);
    if (!preview.valid)
      throw new Error(preview.errors.map((e) => e.text).join("; "));
    if (this.mode === "combat" && !this.encounter.current) this.beginHero();
    if (this.mode === "combat")
      for (let n = 0; n < plan.cost; n++)
        this.spend("maneuver", "ability-handle-an-item");
    if (
      this.provoke(h, {
        kind: "equip",
        index,
        item: instanceId,
        operation,
        slot: targetSlot,
        label: "handling equipment",
      })
    )
      return;
    if (
      operation === "ready" &&
      h.torch?.held &&
      preview.inventory.items
        .filter((i) => i.held)
        .reduce((n, i) => n + i.hands, 0) > 1
    ) {
      h.torch.held = false;
      h.torch.lit = false;
      this.note(`${h.name} douses and stows the torch to free a hand.`);
    }
    if (operation === "stow" && this.mode === "combat" && plan.cost === 0)
      this.budget.quickStowUsed = true;
    h.draft = draft;
    h.treasure = treasure;
    h.preview = preview;
    this.syncTorches();
    this.note(
      `${h.name} ${{ ready: "readies", stow: "stows", wear: "puts on", remove: "removes" }[operation]} ${item.definition.name}${this.mode === "combat" ? ` · ${plan.cost} Maneuver${plan.cost === 1 ? "" : "s"} spent` : ""}.`,
    );
    this.emit("party");
    this.emit("change");
  }
  actionReason(id, h = this.active) {
    if (POWERS[id]) return this.powerReason(id, h);
    const spec = ABILITIES[id];
    if (spec?.supply && !this.supplyItem(h, spec.supply))
      return "Craft or carry a usable smoke supply first.";
    if (spec?.explorationOnly && this.mode !== "exploration")
      return "Use while exploring the dungeon.";
    if (spec?.tactic?.gather && this.map.foraged)
      return "This floor’s edible patch has been harvested.";
    if (this.pendingProvocation || this.pendingDefense)
      return "Resolve the pending reaction first.";
    if (
      spec &&
      !this.availableActions(h).some((c) => c.id === id) &&
      !(this.continuingProvocation && h.preview.state.abilities.includes(id))
    )
      return "Not learned.";
    if (
      spec?.exploration &&
      this.mode === "exploration" &&
      this.canAct(h) &&
      !this.busy
    )
      return spec.tactic?.gather ? this.sleepReason() : "";
    if (
      !this.continuingProvocation &&
      spec?.once &&
      h.signatureUses?.includes(id)
    )
      return "Already used this encounter.";
    if (id === "ability-lantern-in-the-palm")
      return this.lanternReason(this.party.indexOf(h));
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
    if (
      a?.requiredItem &&
      !h.preview.inventory.items.some(
        (i) => i.carried && i.catalogId === a.requiredItem,
      )
    )
      return "Carry the required equipment first.";
    if (!a || !this.availableActions(h).some((c) => c.id === id))
      return "Not learned.";
    if (
      !this.continuingProvocation &&
      this.encounter.current === h.id &&
      !this.budget?.remaining[a.category]
    )
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
      if (this.freeHands(h) < 1) return "Free a hand to use a potion.";
    }
    if (a.hpCost && h.survival.hp <= a.hpCost)
      return "Life magic must leave the caster above 0 HP.";
    if (a.shield && !this.held(h, "item-ordinary-shield"))
      return "Ready a shield first.";
    if (a.freeHand && this.freeHands(h) < 1) return "Free a hand first.";
    if (
      a.target === "enemy" &&
      this.R.conditionSummary(h.conditions).blinded.active &&
      !this.traits(h).some((t) => t.seismic)
    )
      return "This attack needs a visible target.";
    if (a.weapon && !this.held(h, `item-ordinary-${a.weapon}-weapon`)) {
      const hands =
        2 -
        Number(!!h.torch?.held) -
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
    if (this.C.forge) return this.forgeCommit(index, proposed);
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
    const alreadyKnown = new Set(this.powerIds(h));
    for (const [level, entry] of Object.entries(progression.levels ?? {})) {
      if (+level > progression.level)
        throw new Error(
          "Future development choices cannot be committed early.",
        );
      for (const purchase of entry.purchases.slice(
        prior[level]?.purchases?.length ?? 0,
      )) {
        const choice = this.C.choices.find((c) => c.id === purchase.id);
        if (this.C.gamePowers && POWERS[purchase.id]) {
          if (alreadyKnown.has(purchase.id))
            throw new Error(
              "This game power is already known through existing training.",
            );
          alreadyKnown.add(purchase.id);
        }
        if (
          choice?.kind === "ability" &&
          (coverage(choice.id).status !== "included" ||
            !isTrainable(choice, this.C))
        )
          throw new Error(
            `${choice.name} is not in the playable dungeon roster.`,
          );
      }
    }
    next.progression = progression;
    const preview = gearPreview(this.R, this.C, h, next);
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
    if (h.respecGritSpent !== undefined) {
      // A lower-Grit rebuild can hide already-spent grants. New training must
      // cover that debt before any Grit becomes available again.
      h.respecGritSpent = Math.max(
        h.respecGritSpent,
        preview.summary.gritGranted - h.survival.gritAvailable,
      );
      h.survival.gritAvailable = Math.max(
        0,
        preview.summary.gritGranted - h.respecGritSpent,
      );
    }
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
    if (this.mode === "town" && this.campaign.returnPassage)
      return this.returnThroughPassage();
    if (this.mode !== "town")
      throw new Error("Return to town before beginning an expedition.");
    if (
      this.party.some(
        (h) =>
          h.survival.status !== "active" || h.wounds.some((w) => !w.applied),
      )
    )
      throw new Error("Replace or resolve injured heroes before descending.");
    if (this.campaign.expeditions === 0) this.newFloor();
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
  movementRange() {
    if (
      this.mode !== "combat" ||
      this.busy ||
      this.encounter.nextSide !== "players" ||
      !this.canAct(this.active) ||
      this.paths.get(this.active.id)?.length ||
      this.pendingDefense ||
      this.pendingProvocation
    )
      return [];
    if (this.encounter.current && this.encounter.current !== this.active.id)
      return [];
    if (
      !this.encounter.current &&
      !this.R.availableParticipants(this.encounter).some(
        (p) => p.id === this.active.id,
      )
    )
      return [];
    const blocked = movementBlockers(
      this.party,
      this.enemies,
      this.active,
      (h) => this.canAct(h),
    );
    return reachableCells(
      this.map,
      this.active,
      this.movementLeft(),
      blocked,
      (p) => this.moveCost(p),
      this.occupied(this.active.id),
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
  moveCost(point, h = this.active) {
    const traits = traitsOf(h),
      tile = this.map.tiles[key(point.x, point.z)];
    const occupant = [...this.party, ...this.enemies].some(
      (a) =>
        a.x === point.x &&
        a.z === point.z &&
        a.conditions?.some((c) => c.key === "prone"),
    );
    if (!occupant && tile?.low && traits.some((t) => t.terrain === "low"))
      return 1;
    if (!occupant && !tile?.low && traits.some((t) => t.terrain === "rubble"))
      return 1;
    if (tile?.low) return 2;
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
    if (
      this.suspended ||
      this.busy ||
      !["exploration", "combat"].includes(this.mode)
    )
      return;
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
    if (this.mode === "combat" && !this.continuingProvocation) {
      const copies = new Map(occupants.map((a) => [a.id, { ...a }]));
      const planned = companyStep(
        marching.map((h) => copies.get(h.id)),
        new Map([...this.paths].map(([id, r]) => [id, [...r]])),
        [...copies.values()],
        (h) =>
          movementBlockers(this.party, this.enemies, h, (other) =>
            this.canAct(other),
          ),
      );
      const points = planned.find((s) => s.hero.id === this.active.id)?.points;
      if (
        points &&
        this.provoke(
          this.active,
          { kind: "move", label: "leaving melee reach" },
          points,
        )
      )
        return;
    }
    const steps = companyStep(marching, this.paths, occupants, (h) =>
      movementBlockers(this.party, this.enemies, h, (other) =>
        this.canAct(other),
      ),
    );
    if (steps.length) {
      if (this.mode === "exploration")
        this.advanceTime(EXPEDITION_TIME.explorationStep, { provisions: true });
      for (const step of steps) {
        const { hero, points } = step;
        const traversed = [];
        const end = { x: hero.x, z: hero.z };
        for (const p of points) {
          Object.assign(hero, p);
          traversed.push(p);
          this.surfaceContact(hero, { entry: true });
          if (!this.canAct(hero)) {
            this.paths.delete(hero.id);
            // A yielding ally is a waypoint, never a legal final position.
            if (this.occupied(hero.id).has(key(hero.x, hero.z))) {
              Object.assign(hero, end);
              traversed.push(end);
            }
            step.points = traversed;
            break;
          }
        }
        if (this.canAct(hero)) Object.assign(hero, end);
      }
      this.movementSupplies(Math.max(...steps.map((s) => s.points.length)));
      this.syncTorches();
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
  detect(forcedEnemies = null) {
    const visible =
      forcedEnemies ??
      this.enemies.filter(
        (e) =>
          e.hp > 0 &&
          this.canSee(e) &&
          this.party.some(
            (h) => h.survival.status === "active" && distance(h, e) <= 7,
          ),
      );
    if (!visible.length) return false;
    const groups = new Set(visible.map((e) => e.group)),
      opposition = this.enemies.filter((e) => e.hp > 0 && groups.has(e.group));
    this.paths.clear();
    this.budgets = {};
    this.party.forEach((h) => {
      h.buffs = {};
      h.grudgeTaken = false;
      h.tactics = [];
      h.signatureUses = [];
      h.powerEffects = [];
      h.powerUses = {};
      h.powerResourceUsed = [];
      h.powerPendingManeuver = false;
      h.powerTurn = 0;
    });
    this.mode = "combat";
    this.encounter = this.R.startEncounter(
      [
        ...this.party
          .filter((h) => h.survival.status !== "dead")
          .map((h) => ({ id: h.id, side: "players" })),
        ...opposition.map((e) => ({ id: e.id, side: "opposition" })),
      ],
      this.campOpening === "players"
        ? [6, 6, 6]
        : this.campOpening === "opposition"
          ? [1, 1, 1]
          : this.reverieOpening
            ? [6, 6, 6]
            : this.dice(),
    );
    this.reverieOpening = false;
    this.campOpening = null;
    this.note(
      `Encounter · opening ${this.encounter.opening.total}. ${this.encounter.startingSide === "players" ? "Your party" : "The creatures"} acts first.`,
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
    h.powerTurn = (h.powerTurn ?? 0) + 1;
    this.surfaceContact(h);
    this.budgets[h.id] = this.R.startTurn({
      turnId: `turn-${this.encounter.serial}`,
      retained,
      speed: this.speed(h),
      conditions: this.restrictions(h),
    });
    this.budgets[h.id].bonusMovement = this.tacticValue(h, "movement");
    if (h.powerPendingManeuver && retained.includes("maneuver")) {
      this.budgets[h.id].remaining.maneuver++;
      h.powerPendingManeuver = false;
    }
    if (h.survival.status === "dying") this.emit("dying", { hero: h });
    this.emit("change");
  }
  advance() {
    if (
      this.suspended ||
      this.pendingDefense ||
      this.pendingProvocation ||
      this.mode !== "combat" ||
      this.woundNotices?.length
    )
      return;
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
        "The chamber falls silent. Make camp when the company needs sleep and recovery.",
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
      clearTimeout(this.enemyTimer);
      this.enemyTimer = setTimeout(() => {
        this.enemyTimer = null;
        if (this.suspended || this.encounter !== expectedEncounter) return;
        try {
          this.enemyTurn();
        } catch (e) {
          this.notify(e.message);
          this.note("Encounter paused: " + e.message);
        } finally {
          this.busy =
            !!this.pendingDefense ||
            !!this.pendingProvocation ||
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
    if (this.continuingProvocation) return;
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
    if (this.C.forge) {
      const id =
        kind === "ranged"
          ? "power-forge-shot"
          : melee && this.powerIds(this.active).includes("power-forge-strike")
            ? "power-forge-strike"
            : "power-forge-unarmed";
      return this.useAbility(id, enemyId);
    }
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
    e.powerTurn = (e.powerTurn ?? 0) + 1;
    this.surfaceContact(e);
    const taunt = (e.powerEffects ?? []).find(
      (t) =>
        t.stats.taunt &&
        t.expiresAt > this.clock().seconds &&
        t.expiresTurn >= e.powerTurn,
    );
    const targets = this.party
      .filter((h) =>
        ["active", "lastWords", "dying"].includes(h.survival.status),
      )
      .filter((h) => this.powerTargetable(h, e))
      .sort(
        (a, b) =>
          Number(b.id === taunt?.source) - Number(a.id === taunt?.source) ||
          distance(e, a) - distance(e, b),
      );
    const h = targets[0];
    this.enemyManeuver(e);
    if (h && this.enemyCapable(e) && e.retained.includes("main")) {
      const points = this.moveCreatureIntoRange(
        e,
        h,
        this.creatureAction(e).range,
        true,
      );
      if (
        e.conditions?.some((c) => c.key === "prone") &&
        this.provoke(e, {
          kind: "enemy-stand",
          target: h.id,
          points,
          label: "standing up",
        })
      )
        return;
      e.conditions = (e.conditions ?? []).filter((c) => c.key !== "prone");
      this.enemyTravel(e, h, points);
    } else this.finishEnemyTurn(e);
  }
  enemyTravel(e, h, points) {
    for (let i = 0; i < points.length; i++) {
      if (
        this.provoke(
          e,
          {
            kind: "enemy-move",
            target: h.id,
            points: points.slice(i),
            label: "leaving melee reach",
          },
          [points[i]],
        )
      )
        return;
      Object.assign(e, points[i]);
      this.surfaceContact(e, { entry: true });
      if (e.hp <= 0) {
        this.finishEnemyTurn(e);
        return;
      }
    }
    this.enemyAttack(e, h);
  }

  enemyAttack(e, h) {
    const action = this.creatureAction(e);
    if (
      h &&
      this.enemyCapable(e) &&
      e.hp > 0 &&
      !this.R.conditionSummary(e.conditions ?? []).blinded.active &&
      distance(e, h) <= action.range &&
      lineOfSight(this.map, e, h) &&
      !(action.hearing && this.R.conditionSummary(h.conditions).deafened.active)
    ) {
      if (
        action.spell &&
        this.provoke(e, { kind: "enemy", target: h.id, label: "casting" })
      )
        return;
      if (action.type === "physical" && this.canBlock(h)) {
        this.pendingDefense = { attacker: e.id, target: h.id };
        this.emit("reaction", { hero: h, enemy: e });
        return;
      }
      this.resolveEnemyHit(e, h);
    }
    this.finishEnemyTurn(e);
  }
  finishEnemyTurn(e) {
    if (e.hp > 0) this.finishEnemyConditions(e);
    this.finishCombatTurn();
    this.defeatEnemy(e);
    this.busy = false;
    this.advance();
    this.emit("change");
  }

  survivalChoice(kind) {
    const h = this.active;
    const result =
      kind === "roll" ? this.heroRoll(h, "fortitude", "death") : null;
    h.survival = this.R.resolveSurvival(
      this.R.chooseSurvival(h.survival, kind),
      { retained: result?.retained, fortitude: this.attribute(h, "fortitude") },
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
    this.finishCombatTurn();
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
    throw new Error(
      "Safe Breath has been removed. Make camp to recover HP through sleep.",
    );
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
    if (this.enemies.some((e) => e.boss && e.hp > 0))
      throw new Error("Defeat this floor’s guardian before descending.");
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
    this.campaign.returnPassage = null;
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

Object.assign(Game.prototype, campMethods, campMedicalMethods, recoveryMethods);
Object.assign(Game.prototype, interactionMethods);
Object.assign(Game.prototype, rosterMethods, experienceMethods);

Object.assign(Game.prototype, treasureMethods, bestiaryMethods);

Object.assign(
  Game.prototype,
  marketMethods,
  expeditionMethods,
  provisionMethods,
  craftingMethods,
  opportunityMethods,
);

Object.assign(Game.prototype, ancestryGameMethods);

Object.assign(Game.prototype, tacticMethods);

Object.assign(Game.prototype, retrainingMethods, respecMethods);

Object.assign(Game.prototype, powerMethods, battlefieldMethods);
Object.assign(Game.prototype, buildMethods, forgeGameMethods);

Object.assign(Game.prototype, recipeMethods, gameCareMethods, identityMethods);
