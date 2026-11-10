import {
  campSnapshot,
  newCampReport,
  finishCampReport,
  validateCampReport,
} from "./camp-report.mjs";
import {
  locationFierceness,
  campProbability,
  campEncounterRandom,
} from "./fierceness.mjs";
import { Random, distance, key, lineOfSight } from "./dungeon.mjs";
import { BASIC_SUPPLIES } from "./supply-stock.mjs";
import { CREATURE_ROSTER } from "./creature-roster.mjs";

export const CAMP_DUTIES = Object.freeze([
  {
    id: "dressings",
    name: "Prepare dressings",
    detail:
      "Use shared medicinal herbs to improve carried dressings. Requires recipe knowledge.",
  },
  {
    id: "heal",
    name: "Healing care",
    detail: "Use dressings to restore a companion’s health.",
  },
  {
    id: "treat",
    name: "Treat a wound",
    detail:
      "Treat each wound once per day. Severe injuries need restoration care.",
  },
  {
    id: "guard",
    name: "Stand guard",
    detail: "Watch for approaching enemies.",
  },
  {
    id: "arrows",
    name: "Prepare arrows",
    detail:
      "Use shared crafting materials and tools to improve carried arrows.",
  },
  {
    id: "cook",
    name: "Prepare food",
    detail: "Cook shared food ingredients into carried provisions.",
  },
  {
    id: "water",
    name: "Gather water",
    detail: "A nearby water source and carried flasks; replenish water.",
  },
  {
    id: "torches",
    name: "Prepare torches",
    detail:
      "Use shared crafting materials and tools to improve carried lighting supplies.",
  },
  {
    id: "forage",
    name: "Forage",
    detail:
      "Search for water, wood, food ingredients, fletching materials or medicinal supplies. Training helps you find useful resources.",
  },
]);
const dutyIds = new Set([
  ...CAMP_DUTIES.map((d) => d.id),
  "forage-food",
  "forage-arrows",
  "forage-torches",
]);
export function campPeriod(
  party,
  assignments,
  period,
  order = party.map((h) => h.heroId),
) {
  // Each of four party slots works once in each half of the eight-hour rota.
  const slot = period % 4,
    hero = party.find((h) => h.heroId === order[slot]);
  const worker = hero?.survival.status === "active" ? hero : null;
  return {
    worker,
    duty: worker
      ? (assignments[worker.heroId]?.[Math.floor(period / 4) % 2] ?? "guard")
      : null,
    sleepers: party.filter(
      (h) => h !== worker && h.survival.status === "active",
    ),
  };
}
export function validateCamp(campaign) {
  const c = campaign.camp;
  if (!c) return;
  validateCampReport(c.report);
  const whole = (n) => Number.isSafeInteger(n) && n >= 0;
  if (
    !c ||
    !whole(c.elapsed) ||
    !whole(c.total) ||
    c.total < 8 ||
    c.total > 96 ||
    c.elapsed > c.total ||
    !whole(c.seed) ||
    (c.fierceness !== undefined &&
      (!Number.isInteger(c.fierceness) ||
        c.fierceness < 0 ||
        c.fierceness > 6)) ||
    !whole(c.depth) ||
    !Number.isFinite(c.x) ||
    !Number.isFinite(c.z) ||
    !["paused", "interrupted", "complete", "abandoned"].includes(c.status) ||
    !Array.isArray(c.partyIds) ||
    c.partyIds.length > 4 ||
    new Set(c.partyIds).size !== c.partyIds.length ||
    c.partyIds.some((id) => typeof id !== "string" || id.length > 80) ||
    (c.order !== undefined &&
      (!Array.isArray(c.order) ||
        c.order.length !== c.partyIds.length ||
        new Set(c.order).size !== c.order.length ||
        c.order.some((id) => !c.partyIds.includes(id)))) ||
    !c.assignments ||
    c.partyIds.some((id) => !Array.isArray(c.assignments[id])) ||
    Object.values(c.assignments).some(
      (ds) =>
        !Array.isArray(ds) ||
        ds.length !== 2 ||
        ds.some((d) => !dutyIds.has(d)),
    ) ||
    (c.targets &&
      (typeof c.targets !== "object" ||
        Object.values(c.targets).some(
          (ts) =>
            !Array.isArray(ts) ||
            ts.length !== 2 ||
            ts.some(
              (t) =>
                t !== null &&
                (typeof t !== "object" ||
                  !c.partyIds.includes(t.heroId) ||
                  (t.woundId !== undefined && typeof t.woundId !== "string") ||
                  (t.supplyId !== undefined &&
                    (typeof t.supplyId !== "string" ||
                      t.supplyId.length > 160))),
            ),
        ))) ||
    !c.sleepHours ||
    Object.values(c.sleepHours).some((n) => !whole(n) || n > c.elapsed) ||
    !Array.isArray(c.events) ||
    c.events.length > 100 ||
    c.events.some((e) => typeof e !== "string")
  )
    throw new Error("Invalid saved camp schedule.");
}
export const campMethods = {
  locationFierceness(point = this.active) {
    return locationFierceness(this.map, point);
  },
  campDanger(hours = 8, point = this.active) {
    const danger = this.locationFierceness(point);
    const warning = this.party.some(
      (h) =>
        h.survival.status === "active" &&
        this.traits(h).some((t) => t.campWarning),
    );
    return {
      ...danger,
      ...campProbability(danger.tier, hours, warning),
      warning,
    };
  },
  campCanResume() {
    const c = this.campaign.camp;
    return (
      c &&
      ["paused", "interrupted"].includes(c.status) &&
      c.elapsed < c.total &&
      c.depth === this.campaign.depth &&
      distance(c, this.active) < 2 &&
      c.partyIds.join() === this.party.map((h) => h.heroId).join()
    );
  },
  campRecoveryHours(assignments, order) {
    const need = new Map(
      this.party
        .filter((h) => h.survival.status === "active")
        .map((h) => [
          h.heroId,
          Math.ceil(Math.max(0, this.healingMaximum(h) - h.survival.hp) / 2),
        ]),
    );
    for (let hour = 0; hour < 96; hour++) {
      for (const h of campPeriod(this.party, assignments, hour, order).sleepers)
        need.set(h.heroId, Math.max(0, need.get(h.heroId) - 1));
      if (hour >= 7 && [...need.values()].every((n) => n === 0))
        return hour + 1;
    }
    return 96;
  },
  campWaterSource() {
    return (
      this.map.waterSources?.some(
        (p) =>
          distance(p, this.active) <= 3 &&
          lineOfSight(this.map, p, this.active),
      ) ||
      (this.map.tiles &&
        Object.values(this.map.tiles).some(
          (p) =>
            /water|well|spring/.test(p.type ?? "") &&
            distance(p, this.active) <= 3 &&
            lineOfSight(this.map, p, this.active),
        ))
    );
  },
  campDutyReason(h, duty, target) {
    if (["heal", "treat"].includes(duty))
      return this.campMedicalReason(h, duty, target);
    if (duty === "forage" || duty === "guard") return "";
    return this.campRestockPlan(h, duty, target)?.reason ?? "";
  },
  campEvent(text) {
    this.campaign.camp.report?.events.push(text);
    this.campaign.camp.events.push(text);
    this.campaign.camp.events = this.campaign.camp.events.slice(-100);
    this.note(text);
  },
  campDuty(h, duty, rng, medicalTarget) {
    if (["heal", "treat"].includes(duty))
      return this.campMedicalDuty(h, duty, medicalTarget);
    if (duty === "guard") {
      this.campEvent(`${h.name} keeps a dedicated watch.`);
      return;
    }
    if (duty === "forage") return this.campForage(h, rng);
    if (BASIC_SUPPLIES.some((s) => s.duty === duty))
      return this.performCampRestock(h, duty, rng, medicalTarget);
  },
  startCamp(
    assignments,
    total = 8,
    targets = {},
    order = this.party.map((h) => h.heroId),
  ) {
    const reason = this.sleepReason();
    if (this.mode !== "exploration" || reason)
      throw new Error(reason || "Make camp in the dungeon.");
    if (!Number.isSafeInteger(total) || total < 8 || total > 96)
      throw new Error("Choose 8–96 camp hours.");
    if (
      !Array.isArray(order) ||
      order.length !== this.party.length ||
      new Set(order).size !== order.length ||
      order.some((id) => !this.party.some((h) => h.heroId === id))
    )
      throw new Error("Choose each companion once in camp order.");
    const plan = {};
    for (const h of this.party) {
      const duties = assignments[h.heroId];
      if (
        !Array.isArray(duties) ||
        duties.length !== 2 ||
        duties.some((d) => !CAMP_DUTIES.some((v) => v.id === d))
      )
        throw new Error("Choose two camp duties for every hero.");
      plan[h.heroId] = [...duties];
    }
    this.paths.clear();
    const serial = (this.map.campSerial ?? 0) + 1;
    this.map.campSerial = serial;
    this.campaign.camp = {
      depth: this.campaign.depth,
      x: this.active.x,
      z: this.active.z,
      fierceness: this.locationFierceness().tier,
      partyIds: this.party.map((h) => h.heroId),
      assignments: plan,
      order: [...order],
      targets: structuredClone(targets),
      total,
      elapsed: 0,
      seed:
        (this.campaign.seed + serial * 7919 + this.campaign.depth * 173) >>> 0,
      sleepHours: {},
      fireLit: this.party.some(
        (h) => h.lantern || this.supplyItem(h, "item-lighting-bundle"),
      ),
      status: "paused",
      events: [],
      report: newCampReport(this),
    };
    this.campLight();
    this.campEvent(
      `The company makes camp for at least ${total} hours and settles in to rest.`,
    );
    this.emit("change");
  },
  updateCampDuties(assignments, targets) {
    if (!this.campCanResume())
      throw new Error("No paused camp plan to change.");
    if (
      Object.values(assignments).some((ds) =>
        ds.some((id) => !CAMP_DUTIES.some((d) => d.id === id)),
      )
    )
      throw new Error("Choose valid camp duties.");
    const next = {
      ...this.campaign.camp,
      assignments: structuredClone(assignments),
      targets: structuredClone(targets),
    };
    validateCamp({ ...this.campaign, camp: next });
    this.campaign.camp = next;
    this.campEvent(
      "Duties revised for the remaining hours. Completed camp periods are unchanged.",
    );
    this.emit("change");
  },
  campLight() {
    this.map.lights ??= [];
    this.map.lights = this.map.lights.filter((l) => l.id !== "camp-fire");
    const c = this.campaign.camp;
    this.map.lights.push({
      id: "camp-fire",
      x: c.x,
      z: c.z,
      radius: c.fireLit === false ? 1 : 8,
    });
    for (const h of this.party) h.torch.lit = false;
  },
  breakCamp() {
    const c = this.campaign.camp;
    if (c && c.status !== "complete") c.status = "abandoned";
    finishCampReport(this);
    this.map.lights =
      this.map.lights?.filter((l) => l.id !== "camp-fire") ?? [];
    this.syncTorches();
    this.emit("change");
  },
  campWanderers(rng) {
    const c = this.campaign.camp;
    const cells = Object.values(this.map.tiles).filter(
      (p) =>
        distance(p, c) >= 3 &&
        distance(p, c) <= 5 &&
        !this.map.obstacles[key(p.x, p.z)] &&
        !this.occupied().has(key(p.x, p.z)) &&
        lineOfSight(this.map, p, c),
    );
    const pool = this.C.creatures.creatures.filter(
      (r) =>
        CREATURE_ROSTER[r.id]?.depth <= this.campaign.depth &&
        !r.id.includes("boss") &&
        r.cv <= 30,
    );
    if (!cells.length || !pool.length) return [];
    return cells.slice(0, Math.min(2, cells.length)).map((p, i) => {
      const r = pool[rng.int(0, pool.length - 1)];
      return {
        ...p,
        id: `camp-${this.map.campSerial}-${c.elapsed}-${i}`,
        group: 10000 + this.map.campSerial,
        type: r.id,
        name: r.name,
        hp: r.hp.max,
        maxHp: r.hp.max,
        cv: r.cv,
        stability: r.defenses.stability,
        conditions: [],
        ammunition: 6,
      };
    });
  },
  campHour() {
    if (!this.campCanResume())
      throw new Error("No camp at this location to continue.");
    const reason = this.sleepReason();
    if (reason) throw new Error(reason);
    const before = campSnapshot(this);
    const c = this.campaign.camp,
      period = campPeriod(this.party, c.assignments, c.elapsed, c.order),
      rng = new Random((c.seed + c.elapsed * 32452843) >>> 0);
    c.status = "paused";
    this.campLight();
    this.advanceTime(3600, {
      sleepingHeroes: period.sleepers.map((h) => h.heroId),
      provisions: true,
    });
    for (const h of period.sleepers) {
      const before = h.survival.hp;
      h.survival = this.R.receiveHealing(h.survival, 2);
      h.survival.hp = Math.max(
        before,
        Math.min(h.survival.hp, this.healingMaximum(h)),
      );
      c.sleepHours[h.heroId] = (c.sleepHours[h.heroId] ?? 0) + 1;
    }
    if (period.worker)
      this.campDuty(
        period.worker,
        period.duty,
        rng,
        c.targets?.[period.worker.heroId]?.[Math.floor(c.elapsed / 4) % 2],
      );
    if (c.report)
      for (const h of this.party) {
        const hp = before.find((p) => p.id === h.heroId)?.hp ?? h.survival.hp;
        c.report.healed[h.heroId] =
          (c.report.healed[h.heroId] ?? 0) + Math.max(0, h.survival.hp - hp);
      }
    c.elapsed++;
    const encounterRng = campEncounterRandom(c.seed, c.elapsed - 1);
    if (encounterRng.next() < this.campDanger(1, c).hourly) {
      const enemies = this.campWanderers(encounterRng);
      if (enemies.length) {
        const roll = period.worker
          ? this.heroRoll(period.worker, "reason", "attribute", {
              sources: [
                ...(period.duty === "guard"
                  ? [{ kind: "boon", amount: 1 }]
                  : []),
                ...(c.fireLit === false ? [{ kind: "bane", amount: 1 }] : []),
              ],
            })
          : null;
        const reverie = period.sleepers.some((h) =>
          this.traits(h).some((t) => t.reverie),
        );
        const detected = reverie || (roll && roll.tier !== "weak");
        this.enemies.push(...enemies);
        c.status = "interrupted";
        this.campEvent(
          `${period.worker?.name ?? "Nobody"} is on watch${reverie ? "; wakeful reverie warns the camp" : ""}. ${detected ? "The approaching creatures are spotted; the company takes the opening." : "Ambush! The creatures take the opening."}`,
        );
        this.campOpening = detected ? "players" : "opposition";
        this.emit("party");
        this.detect(enemies);
        return {
          interrupted: true,
          detected: !!detected,
          watch: period.worker?.heroId,
        };
      }
    }
    if (c.elapsed >= c.total) {
      c.status = "complete";
      this.breakCamp();
      this.campEvent("Camp complete. The company packs up.");
    }
    this.emit("change");
    return { interrupted: false, complete: c.status === "complete" };
  },
};
