import { key, distance, lineOfSight } from "./dungeon.mjs";
import { surfacesAt } from "./battlefield.mjs";
import { formationRoutes } from "./formations.mjs";

export function routeHazards(map, party, routes) {
  const found = new Map();
  for (const [id, points] of routes) {
    const hero = party.find((h) => h.id === id);
    if (!hero) continue;
    for (const p of points)
      for (const zone of surfacesAt(map, p)) {
        if (!["fire", "trap"].includes(zone.kind)) continue;
        const token = `${id}:${zone.id}:${key(p.x, p.z)}`;
        found.set(token, {
          token,
          hero: id,
          name: hero.name,
          kind: zone.kind,
          x: p.x,
          z: p.z,
        });
      }
  }
  return [...found.values()];
}

export const movementSafetyMethods = {
  movementPreview(to) {
    const plan = this.movementPlan(to);
    if (!plan) return null;
    const hazards = routeHazards(this.map, this.party, plan.routes);
    const opportunities = [];
    if (this.mode === "combat" && !this.budgets[this.active.id]?.disengaged && !this.tacticValue(this.active, "disengage")) {
      const points = plan.routes.get(this.active.id) ?? [];
      for (const foe of this.enemies) {
        if (!this.canOpportunity(foe) || !this.encounter.roster.some(r => r.id === foe.id && !r.withdrawn)) continue;
        [this.active, ...points.slice(0,-1)].forEach((from,i) => {
          if (distance(from,foe)<=1 && distance(points[i],foe)>1 && lineOfSight(this.map,from,foe))
            opportunities.push({ x: points[i].x, z: points[i].z, enemy: foe.id, name: foe.name });
        });
      }
    }
    return { ...plan, hazards, opportunities };
  },
  movementPlan(to) {
    if (!this.route(to).length) return null;
    let cost = 0,
      routes;
    if (this.mode === "combat") {
      if (this.encounter.nextSide !== "players" || !this.canAct(this.active))
        throw new Error("Wait for this hero's turn.");
      if (this.encounter.current && this.encounter.current !== this.active.id)
        throw new Error("Choose a hero whose turn is available.");
      const route = this.route(to);
      cost = route.reduce((n, p) => n + this.moveCost(p), 0);
      if (cost > this.movementLeft())
        throw new Error(
          `This route costs ${cost} movement; only ${this.movementLeft()} remains.`,
        );
      routes = new Map([[this.active.id, route]]);
    } else {
      routes = formationRoutes(
        this.map,
        this.party,
        this.enemies,
        this.campaign.formation,
        this.campaign.order,
        to,
      );
    }
    return this.movementCheckpoint(routes, { cost, paid: false });
  },
  movementCheckpoint(routes, extra = {}) {
    return {
      routes: new Map(
        [...routes].map(([id, points]) => [id, structuredClone(points)]),
      ),
      map: this.map,
      mode: this.mode,
      hero: this.active.id,
      turn: this.encounter?.serial,
      origins: this.party.map((h) => `${h.id}:${key(h.x, h.z)}`).join("|"),
      interaction: this.pendingInteraction,
      ...extra,
    };
  },
  requestMovement(plan, accepted = new Set()) {
    const hazards = routeHazards(this.map, this.party, plan.routes);
    if (hazards.some((h) => !accepted.has(h.token))) {
      this.paths.clear();
      this.pendingInteraction = null;
      this.pendingMovement = { ...plan, hazards, accepted };
      this.emit("movement-warning");
      this.emit("change");
      return false;
    }
    if (this.mode === "combat" && !plan.paid) {
      if (!this.encounter.current) this.beginHero();
      this.budgets[this.active.id] = this.R.spendMovement(this.budget, {
        operationId: `move-${crypto.randomUUID()}`,
        amount: plan.cost,
        conditions: this.restrictions(this.active),
      });
    }
    this.movementConsent = accepted;
    this.paths = plan.routes;
    this.pendingInteraction = plan.interaction;
    this.emit("change");
    return true;
  },
  confirmMovement() {
    const plan = this.pendingMovement;
    this.pendingMovement = null;
    if (!plan) return false;
    if (
      this.busy ||
      this.pendingDefense ||
      this.pendingProvocation ||
      plan.map !== this.map ||
      plan.mode !== this.mode ||
      plan.turn !== this.encounter?.serial ||
      (this.mode === "combat" && plan.hero !== this.active.id) ||
      plan.origins !==
        this.party.map((h) => `${h.id}:${key(h.x, h.z)}`).join("|")
    )
      throw new Error("The route changed. Choose a destination again.");
    if (plan.power) {
      this.useAbility(plan.power.id, plan.power.target, {
        ...plan.power.options,
        approvedMovementHazards: [
          ...new Set([...plan.accepted, ...plan.hazards.map((h) => h.token)]),
        ],
      });
      return !this.pendingMovement;
    }
    return this.requestMovement(
      plan,
      new Set([...plan.accepted, ...plan.hazards.map((h) => h.token)]),
    );
  },
  checkPowerMovement(id, target, { spec, point, route }, options) {
    const routes = new Map();
    for (const effect of spec.effects) {
      if (effect.kind === "move")
        routes.set(this.active.id, effect.mode === "route" ? route : [point]);
      if (effect.kind === "swap") {
        routes.set(this.active.id, [point]);
        routes.set(point.id, [{ x: this.active.x, z: this.active.z }]);
      }
    }
    const accepted = new Set(options.approvedMovementHazards ?? []);
    if (
      !routeHazards(this.map, this.party, routes).some(
        (h) => !accepted.has(h.token),
      )
    )
      return false;
    this.requestMovement(
      this.movementCheckpoint(routes, {
        paid: !!this.continuingProvocation,
        power: { id, target, options },
      }),
      accepted,
    );
    return true;
  },
  cancelMovement() {
    this.pendingMovement = null;
    this.pendingInteraction = null;
    this.paths.clear();
    this.movementConsent = new Set();
    this.emit("change");
  },
  checkMovementHazards() {
    if (this.pendingMovement) return true;
    const accepted = this.movementConsent ?? new Set();
    if (
      !routeHazards(this.map, this.party, this.paths).some(
        (h) => !accepted.has(h.token),
      )
    )
      return false;
    this.requestMovement(
      this.movementCheckpoint(this.paths, { paid: true }),
      accepted,
    );
    return true;
  },
};
