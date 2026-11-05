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
      this.R.validateSurvival(h.survival);
    }
    this.campaign = c;
    this.newFloor(c.floor);
    this.mode = c.mode ?? "town";
    if (this.mode === "combat") {
      this.encounter = c.encounter;
      this.budgets = c.budgets ?? {};
    }
    this.emit("change");
    if (this.mode === "combat" && !this.encounter?.current) this.advance();
  }
  snapshot() {
    return {
      ...this.campaign,
      mode: this.mode,
      encounter: this.encounter,
      budgets: this.budgets,
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
    const h = this.active;
    if (h.survival.status !== "active" && h.survival.status !== "lastWords")
      return [];
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
      const remaining = this.R.movementRemaining(this.budget);
      if (route.length > remaining)
        throw new Error(`Only ${remaining} squares remain.`);
      this.budgets[this.active.id] = this.R.spendMovement(this.budget, {
        operationId: `move-${Date.now()}`,
        amount: route.length,
      });
      this.paths.set(this.active.id, route);
    } else {
      this.paths.set(this.active.id, route);
      const reserved = new Set([key(to.x, to.z)]);
      for (const h of this.party) {
        if (h === this.active || h.survival.status !== "active") continue;
        const destinations = Object.values(this.map.tiles)
          .filter(
            (p) =>
              distance(p, to) < 3 &&
              !reserved.has(key(p.x, p.z)) &&
              !this.occupied(h.id).has(key(p.x, p.z)),
          )
          .sort((a, b) => distance(a, to) - distance(b, to));
        for (const dest of destinations) {
          const p = pathfind(this.map, h, dest, this.occupied(h.id));
          if (p.length) {
            this.paths.set(h.id, p);
            reserved.add(key(dest.x, dest.z));
            break;
          }
        }
      }
    }
    this.emit("change");
  }
  step() {
    if (this.busy || !["exploration", "combat"].includes(this.mode)) return;
    let moved = false;
    for (const h of this.party) {
      const path = this.paths.get(h.id);
      if (!path?.length) continue;
      const next = path[0];
      if (this.occupied(h.id).has(key(next.x, next.z))) {
        this.paths.delete(h.id);
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
    this.budgets[h.id] = this.R.startTurn({
      turnId: `turn-${this.encounter.serial}`,
      speed: h.preview.summary.speed,
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
      setTimeout(() => {
        try {
          this.enemyTurn();
        } catch (e) {
          this.notify(e.message);
          this.note("Encounter paused: " + e.message);
        } finally {
          this.busy = false;
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
    if (!["active", "lastWords"].includes(this.active.survival.status))
      throw new Error("This hero cannot act.");
    if (!this.budget.remaining[category])
      throw new Error(`No ${category} action remains.`);
    this.budgets[this.active.id] = this.R.declareAction(this.budget, {
      operationId: `action-${Date.now()}`,
      sourceId: id,
      category,
    });
  }
  attack(enemyId, kind = "melee") {
    if (this.mode !== "combat" || this.busy) return;
    const h = this.active,
      e = this.enemies.find((e) => e.id === enemyId && e.hp > 0);
    if (!e) return;
    if (!this.encounter.roster.some((p) => p.id === enemyId && !p.withdrawn))
      throw new Error("That creature is outside this encounter.");
    if (distance(h, e) > 1 || !lineOfSight(this.map, h, e))
      throw new Error("Move adjacent to the sentry first.");
    const melee = h.preview.inventory.items.some(
      (i) =>
        i.carried && i.held && i.catalogId === "item-ordinary-melee-weapon",
    );
    if (kind === "melee" && !melee) kind = "unarmed";
    this.spend("main", "ability-basic-" + kind);
    const result = this.roll(h.draft.attributes.brawn);
    const raw = (
      kind === "melee"
        ? { weak: 2, standard: 3, strong: 5 }
        : { weak: 1, standard: 2, strong: 4 }
    )[result.tier];
    const damage = this.R.damageEvent({
      components: [{ type: "physical", amount: raw }],
      resistances: [{ type: "physical", value: 1 }],
    });
    e.hp = Math.max(0, e.hp - damage.total);
    this.note(
      `${h.name}: ${kind} ${result.retained.join(" + ")} → ${result.total} ${result.tier}; ${damage.total} damage${e.hp === 0 ? " · sentry destroyed" : ""}.`,
    );
    if (e.hp === 0)
      this.encounter = this.R.changeRoster(this.encounter, {
        id: e.id,
        side: "opposition",
        mode: "withdraw",
        reason: "defeated",
      });
    this.emit("attack", { attacker: h.id, target: e.id, damage: damage.total });
    this.advance();
    this.emit("change");
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
        if (path?.length) Object.assign(e, path[Math.min(5, path.length) - 1]);
      }
      if (distance(e, h) <= 1 && lineOfSight(this.map, e, h)) {
        const result = this.roll(h.draft.attributes.agility);
        const raw = { weak: 5, standard: 3, strong: 2 }[result.tier],
          damage = this.R.damageEvent({
            components: [{ type: "physical", amount: raw }],
            resistances: Object.entries(h.preview.resistances).map(
              ([type, value]) => ({ type, value }),
            ),
          });
        const before = h.survival.wounds;
        const applied = this.R.sufferDamage(h.survival, damage.total);
        h.survival = applied.state;
        this.note(
          `${h.name} defends: ${result.total} ${result.tier}; suffers ${damage.total} damage.`,
        );
        this.emit("attack", {
          attacker: e.id,
          target: h.id,
          damage: damage.total,
        });
        if (applied.wound) {
          const roll = this.R.woundRoll(
            before,
            this.dice(Math.min(5, 3 + before)),
          );
          const wound = this.R.woundResult(this.C.wounds, "physical", roll.key);
          h.wounds.push(wound);
          if (wound.effects.some((e) => e.kind === "lastWords"))
            h.survival = this.R.enterLastWords(h.survival);
          this.note(`Wound ${roll.key}: ${wound.record.injury}.`);
          this.mode = "wound-review";
          this.emit("wound", { hero: h, wound });
        }
      }
    }
    this.encounter = this.R.finishTurn(this.encounter);
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
  convert() {
    if (this.mode !== "combat" || this.busy) return;
    if (!this.encounter.current) this.beginHero();
    this.budgets[this.active.id] = this.R.convertAction(this.budget, {
      operationId: `convert-${Date.now()}`,
      from: "maneuver",
      to: "movement",
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
