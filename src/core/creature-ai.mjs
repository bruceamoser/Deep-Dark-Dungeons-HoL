import { distance, key, lineOfSight } from "./dungeon.mjs";
import { leastCostPath, traversalCost } from "./movement.mjs";
import { illuminated } from "./lighting.mjs";
import { surfaceAt, wallAt } from "./battlefield.mjs";

const groups = {
  pack: [
    "wolf",
    "dire-wolf",
    "hell-hound",
    "werewolf",
    "giant-rat",
    "goblin-scrapper",
    "goblin-spearhand",
    "orc-outrider",
  ],
  duelist: ["masked-duelist", "death-knight", "skeleton-champion"],
  guardian: [
    "bone-sentry",
    "animated-armor",
    "animated-statue",
    "barrow-guard",
    "shield-soldier",
    "hobgoblin-shieldguard",
    "stone-knuckle",
    "icebound-warden",
    "glass-sentinel",
  ],
  hunter: [
    "giant-spider",
    "crypt-ghoul",
    "ghast",
    "shadow",
    "wraith",
    "horned-devil",
  ],
  skirmisher: [
    "road-bandit",
    "goblin-boss",
    "hobgoblin-marshal",
    "cave-bat",
    "cinder-imp",
    "clockwork-scout",
    "wererat",
    "emberling",
  ],
  support: ["orc-warcaller", "goblin-rattlechanter"],
  controller: [
    "winter-wolf",
    "goblin-smoke-slinger",
    "kobold-trapkeeper",
    "grave-cultist",
    "tomb-sage",
  ],
};
export function creaturePersonality(e, actions = []) {
  const slug = e.type?.replace("creature-", "");
  for (const [style, ids] of Object.entries(groups))
    if (ids.includes(slug)) return style;
  if (actions.some((a) => a.range >= 4)) return "ranged";
  return "bruiser";
}
export const CREATURE_GOALS = {
  pack: "Surrounds a shared quarry and supports packmates.",
  duelist: "Seeks a personal opponent and maintains the duel.",
  guardian: "Screens vulnerable allies and holds nearby ground.",
  hunter: "Hunts isolated or wounded foes and uses disabling attacks.",
  skirmisher: "Picks exposed opponents and avoids being surrounded.",
  support: "Relieves afflicted allies while applying pressure from range.",
  controller: "Disrupts vulnerable opponents and controls approach routes.",
  ranged:
    "Seeks exposed foes, keeps firing distance and looks for a clear shot.",
  bruiser: "Closes with a reachable foe and uses its strongest useful attack.",
};
const conscious = (h) =>
  h.survival ? h.survival.status === "active" : h.hp > 0;
const status = (h, name) =>
  (h.conditions ?? []).some((c) => c.key === name && c.rating !== 0);
const temporaryStatus = (h, name) =>
  (h.conditions ?? []).some(
    (c) => c.key === name && c.persistence === "temporary" && c.rating > 0,
  );
export function coneCells(origin, toward, rows = 3) {
  const dx = toward.x - origin.x,
    dz = toward.z - origin.z;
  const forward =
    Math.abs(dx) >= Math.abs(dz)
      ? { x: Math.sign(dx) || 1, z: 0 }
      : { x: 0, z: Math.sign(dz) || 1 };
  const cells = [];
  for (let row = 1; row <= rows; row++)
    for (let side = 1 - row; side < row; side++)
      cells.push({
        x: origin.x + forward.x * row - forward.z * side,
        z: origin.z + forward.z * row + forward.x * side,
      });
  return cells;
}
export const creatureAiMethods = {
  enemyPersonality(e) {
    return creaturePersonality(e, this.creatureActions(e));
  },
  enemyVisibleTargets(e) {
    if (this.R.conditionSummary(e.conditions ?? []).blinded.active) return [];
    return this.party.filter(
      (h) =>
        ["active", "lastWords"].includes(h.survival.status) &&
        this.powerTargetable(h, e) &&
        lineOfSight(this.map, e, h),
    );
  },
  enemyTarget(e) {
    const targets = this.enemyVisibleTargets(e);
    const taunt = (e.powerEffects ?? []).find(
      (t) =>
        t.stats.taunt &&
        t.expiresAt > this.clock().seconds &&
        t.expiresTurn >= e.powerTurn,
    );
    const forced = targets.find((h) => h.id === taunt?.source);
    if (forced) return forced;
    const style = this.enemyPersonality(e),
      allies = this.enemies.filter(
        (a) =>
          a !== e && a.group === e.group && a.hp > 0 && this.enemyCapable(a),
      );
    const score = (h) => {
      const d = distance(e, h),
        adjacent = allies.filter((a) => distance(a, h) <= 1).length;
      const claimed = allies.filter((a) => a.aiState?.target === h.id).length;
      const isolation = this.party.filter(
        (p) => p !== h && conscious(p) && distance(p, h) <= 2,
      ).length;
      let n = -d * 1.5;
      if (style === "ranged" && this.creatureAction(e).type === "physical") {
        const armor = h.preview.inventory.items.find(
          (i) =>
            i.carried &&
            i.worn &&
            /item-ordinary-(heavy|medium|light)-armor/.test(i.catalogId),
        );
        n += armor?.catalogId.includes("heavy")
          ? -3
          : armor?.catalogId.includes("medium")
            ? -2
            : armor
              ? -1
              : 1;
      }
      if (style === "pack")
        n += adjacent * 5 + Math.min(2, claimed) * 3 - isolation * 2;
      if (style === "duelist")
        n += (e.aiState?.target === h.id ? 8 : 0) - claimed * 7;
      if (style === "hunter" || style === "skirmisher")
        n +=
          (1 -
            h.survival.hp /
              Math.max(
                1,
                h.survival.maximumHp ?? h.preview.summary.maximumHp,
              )) *
            6 -
          isolation * 2;
      if (style === "guardian")
        n +=
          allies.filter(
            (a) =>
              this.creatureActions(a).some((x) => x.range >= 4) &&
              distance(a, h) <= 3,
          ).length * 6;
      if (style === "controller" || style === "support")
        n += status(h, "dazed") || status(h, "paralyzed") ? -5 : 2;
      return n;
    };
    return targets.sort(
      (a, b) => score(b) - score(a) || a.id.localeCompare(b.id),
    )[0];
  },
  enemyChooseAction(e, h) {
    const actions = this.creatureActions(e).filter((a) => a.available);
    const allies = this.enemies.filter(
      (a) => a !== e && a.hp > 0 && a.group === e.group,
    );
    const score = (a) => {
      const mid = a.outcomes.standard ?? "0";
      let n = Number(mid.match(/^\d+/)?.[0] ?? 0);
      const effects = [
        ...Object.values(a.outcomes)
          .join(" ")
          .matchAll(
            /(Burning|Freezing|Poisoned|Bleeding|Slowed|Dazed|Paralyzed|Grappled|Prone|Frightened|Blinded|Deafened)/gi,
          ),
      ].map((m) => m[1].toLowerCase());
      for (const effect of new Set(effects))
        n += status(h, effect)
          ? 0.2
          : ["paralyzed", "grappled", "dazed"].includes(effect)
            ? 3.5
            : 1.5;
      if (/Push|Pull/.test(mid))
        n += allies.some((x) => distance(x, h) <= 1) ? 0.2 : 1;
      if (a.range < distance(e, h))
        n -= Math.max(0, distance(e, h) - a.range - this.enemySpeed(e)) * 2;
      if (a.ammunition && distance(e, h) <= 1 && this.enemySpeed(e) === 0)
        n -= 2;
      if (a.area === "cone") {
        const cells = coneCells(e, h),
          inCone = (p) =>
            cells.some((c) => c.x === p.x && c.z === p.z) &&
            lineOfSight(this.map, e, p);
        if (!this.enemyVisibleTargets(e).some(inCone)) return -1000;
        n +=
          this.enemyVisibleTargets(e).filter(inCone).length * 3 -
          allies.filter(inCone).length * 8;
      }
      if (a.hold && allies.length === 0) n -= 2;
      return n;
    };
    return actions.sort((a, b) => score(b) - score(a) || b.index - a.index)[0];
  },
  enemyPlanMovement(e, h, action) {
    const blocked = this.occupied(e.id),
      actors = [...this.party, ...this.enemies.filter((a) => a.hp > 0)];
    const cost = (p) => traversalCost(this.map, actors, p);
    const risks = new Map();
    const cells = this.enemyMovementCells(e, this.enemySpeed(e), blocked, cost),
      danger = (p) => {
        const k = key(p.x, p.z);
        if (!risks.has(k)) risks.set(k, this.enemyDanger(e, p));
        return risks.get(k);
      },
      escaping = danger(e) > 0;
    const style = this.enemyPersonality(e),
      ranged = action.range >= 4;
    const threats = this.enemyVisibleTargets(e);
    if (
      h &&
      e.retained?.includes("maneuver") &&
      (escaping || (ranged && threats.some((t) => distance(e, t) <= 1))) &&
      this.enemyMobilityManeuver(
        e,
        h,
        this.creature(e)?.actions.maneuvers.actions.map((a) => a.name) ?? [],
      )
    )
      return [];
    let candidates = cells;
    if (escaping) {
      const safe = cells.filter((p) => !danger(p));
      if (safe.length) {
        const risk = Math.min(...safe.map((p) => p.risk));
        candidates = safe.filter((p) => p.risk === risk);
      }
    } else candidates = cells.filter((p) => !p.risk);
    const exits =
      escaping && !candidates.some((p) => !danger(p))
        ? Object.values(this.map.tiles).filter(
            (p) =>
              !danger(p) &&
              !wallAt(this.map, p.x, p.z) &&
              !this.map.obstacles?.[key(p.x, p.z)] &&
              !blocked.has(key(p.x, p.z)),
          )
        : [];
    const score = (p) => {
      const d = h ? distance(p, h) : 0,
        clear = h && lineOfSight(this.map, p, h),
        nearest = Math.min(...threats.map((t) => distance(p, t)), 99);
      let n =
        clear &&
        d <= action.range &&
        d > 0 &&
        (action.area !== "cone" ||
          coneCells(p, h).some((c) => c.x === h.x && c.z === h.z))
          ? 20
          : -d * 2;
      if (ranged) n += Math.min(nearest, 3) * 3 - (nearest <= 1 ? 12 : 0);
      if (h && style === "pack" && d <= 1)
        n += this.enemies.some(
          (a) =>
            a !== e && a.group === e.group && a.hp > 0 && distance(a, h) <= 1,
        )
          ? 4
          : 0;
      if (style === "guardian") {
        const fromPost = distance(p, e.aiState?.anchor ?? e);
        n -= fromPost * 0.8 + Math.max(0, fromPost - 4) * 8;
      }
      if (style === "skirmisher")
        n -= threats.filter((t) => distance(p, t) <= 1).length * 2;
      if (temporaryStatus(e, "burning") && surfaceAt(this.map, p, "water"))
        n += 80;
      if (exits.length) n -= Math.min(...exits.map((q) => distance(p, q))) * 30;
      n -= danger(p) * 8 + p.cost * 0.3;
      return n;
    };
    const options = candidates.sort((a, b) => score(b) - score(a));
    let best = { score: -Infinity, points: [] };
    for (const p of options.slice(0, 12)) {
      const points =
        p.points ??
        (p.cost === 0 ? [] : leastCostPath(this.map, e, p, blocked, cost));
      if (p.cost && !points.length) continue;
      // Prefer a safe line, and do not kite through a ready melee reaction for a trivial gain.
      const exposure = threats.filter(
        (t) =>
          this.canOpportunity(t) &&
          distance(e, t) <= 1 &&
          points.some((q) => distance(q, t) > 1),
      ).length;
      const value =
        score(p) -
        points.reduce((n, q) => n + danger(q) * 0.5, 0) -
        exposure * 7;
      if (value > best.score) best = { score: value, points };
    }
    return best.points;
  },
  releaseCreatureHolds() {
    const actors = [...this.party, ...(this.enemies ?? [])];
    for (const a of actors)
      a.conditions = (a.conditions ?? []).filter((c) => {
        if (!c.holder || !c.heldTarget) return true;
        const holder = actors.find((x) => x.id === c.holder),
          target = actors.find((x) => x.id === c.heldTarget);
        return (
          holder &&
          target &&
          holder.hp > 0 &&
          this.enemyCapable(holder) &&
          target.survival?.status !== "dead" &&
          distance(holder, target) <= 1 &&
          (target.conditions ?? []).some(
            (x) => x.holder === c.holder && x.heldTarget === c.heldTarget,
          )
        );
      });
  },
  creatureHold(e, h, rating) {
    // A holder maintains one quarry; paired contributions end together.
    const previous = [...this.party, ...this.enemies].filter(
      (a) => a !== h && a !== e,
    );
    for (const a of previous)
      a.conditions = (a.conditions ?? []).filter((c) => c.holder !== e.id);
    for (const a of [e, h]) {
      const old = (a.conditions ?? []).find(
        (c) => c.holder === e.id && c.heldTarget === h.id,
      );
      a.conditions = (a.conditions ?? []).filter((c) => c.holder !== e.id);
      a.conditions.push({
        id: `hold-${crypto.randomUUID()}`,
        key: "grappled",
        rating: Math.max(rating, old?.rating ?? 0),
        source: e.id,
        holder: e.id,
        heldTarget: h.id,
        persistence: "maintained",
        order: this.encounter?.serial ?? 0,
      });
    }
  },
  breakCreatureHold(h) {
    const hold = (h.conditions ?? []).find(
      (c) => c.holder && c.heldTarget === h.id,
    );
    if (!hold) throw new Error("No creature is holding this hero.");
    for (const a of [...this.party, ...this.enemies])
      a.conditions = (a.conditions ?? []).filter(
        (c) => !(c.holder === hold.holder && c.heldTarget === h.id),
      );
    this.note(`${h.name} breaks free.`);
  },
  enemyMobilityManeuver(e, h, names) {
    if (!h || this.R.conditionSummary(e.conditions ?? []).grappled.rating)
      return null;
    const visible = this.enemyVisibleTargets(e),
      nearest = visible.reduce(
        (best, p) => (!best || distance(e, p) < distance(e, best) ? p : best),
        null,
      );
    const alternatives = [
      ["Roll Away", 2, "straight", "all"],
      ["Stalking Step", 2, "cover", nearest?.id],
      ["Measured Step", 2, "any", nearest?.id],
      ["Wind Step", 3, "any", nearest?.id],
      ["Tunnel Scamper", 2, "rubble", nearest?.id],
      ["Slip Through Shadow", 2, "dark", "all"],
      ["Shambling Advance", 2, "advance", null],
      ["Circle the Prey", 2, "circle", h.id],
      ["Silken Scuttle", 3, "web", nearest?.id],
    ];
    const distanceScore = (p) => {
      const d = distance(p, h),
        reach = this.creatureAction(e).range,
        ranged = reach >= 4;
      const safety =
        -this.enemyDanger(e, p) * 50 +
        (temporaryStatus(e, "burning") && surfaceAt(this.map, p, "water")
          ? 80
          : 0);
      if (ranged)
        return (
          safety +
          Math.min(d, 3) * 3 +
          (lineOfSight(this.map, p, h) && d <= this.creatureAction(e).range
            ? 5
            : 0)
        );
      if (reach > 1)
        return (
          safety +
          Math.min(d, reach) * 3 +
          (d <= reach ? 5 : 0) -
          visible.filter((t) => distance(p, t) <= 1).length * 2
        );
      return safety - d * 2 - visible.filter((t) => distance(p, t) <= 1).length;
    };
    for (const [name, budget, kind, ignore] of alternatives) {
      if (!names.includes(name)) continue;
      if (
        kind === "circle" &&
        !(
          distance(e, h) <= 1 &&
          this.enemies.some(
            (a) =>
              a !== e &&
              a.group === e.group &&
              a.hp > 0 &&
              this.enemyCapable(a) &&
              distance(a, h) <= 1,
          )
        )
      )
        continue;
      const blocked = this.occupied(e.id),
        actors = [...this.party, ...this.enemies];
      const cost = (p) =>
        kind === "advance"
          ? 1
          : kind === "rubble" && this.map.tiles[key(p.x, p.z)]?.difficult
            ? 1
            : traversalCost(this.map, actors, p);
      let choices = this.enemyMovementCells(e, budget, blocked, cost).filter(
        (p) =>
          p.cost > 0 &&
          !p.risk &&
          !surfaceAt(this.map, p, "fire") &&
          !surfaceAt(this.map, p, "trap"),
      );
      if (kind === "cover")
        choices = choices.filter(
          (p) =>
            surfaceAt(this.map, p, "smoke") ||
            surfaceAt(this.map, p, "darkness") ||
            Object.keys(this.map.obstacles).some(
              (k) => distance(p, this.map.tiles[k] ?? { x: 1e6, z: 1e6 }) <= 1,
            ),
        );
      if (kind === "advance")
        choices = choices.filter((p) => distance(p, h) < distance(e, h));
      if (kind === "circle")
        choices = choices.filter((p) => distance(p, h) === 1);
      choices.sort(
        (a, b) => distanceScore(b) - distanceScore(a) || a.cost - b.cost,
      );
      for (const dest of choices) {
        const points =
          dest.points ?? leastCostPath(this.map, e, dest, blocked, cost);
        if (!points.length) continue;
        if (
          kind === "dark" &&
          [e, ...points].some((p) => illuminated(this.map, this.party, p))
        )
          continue;
        if (
          kind === "web" &&
          [e, ...points].some((p) => !this.map.tiles[key(p.x, p.z)]?.web)
        )
          continue;
        if (kind === "straight") {
          const dx = points[0].x - e.x,
            dz = points[0].z - e.z;
          if (
            points.some(
              (p, i) =>
                p.x !== e.x + dx * (i + 1) || p.z !== e.z + dz * (i + 1),
            )
          )
            continue;
        }
        const old = distanceScore(e),
          next = distanceScore(dest);
        const circleUseful =
          kind === "circle" &&
          this.enemies.some(
            (a) =>
              a !== e &&
              a.group === e.group &&
              distance(a, h) <= 1 &&
              (a.x - h.x) * (dest.x - h.x) + (a.z - h.z) * (dest.z - h.z) < 0,
          );
        if (next <= old + 0.5 && !circleUseful) continue;
        return { name, points, ignore };
      }
    }
    return null;
  },
  enemyMakeRoom(e, h) {
    const allies = this.enemies.filter(
      (a) =>
        a !== e &&
        a.group === e.group &&
        a.hp > 0 &&
        !a.reactionUsed &&
        this.enemyCapable(a) &&
        distance(e, a) <= 3 &&
        lineOfSight(this.map, e, a),
    );
    for (const ally of allies) {
      const blocked = this.occupied(ally.id),
        cost = (p) =>
          traversalCost(this.map, [...this.party, ...this.enemies], p),
        action = this.creatureAction(ally);
      const score = (p) =>
        action.range >= 4
          ? Math.min(
              ...this.enemyVisibleTargets(ally).map((t) => distance(p, t)),
              4,
            )
          : -distance(p, h);
      const choices = this.enemyMovementCells(ally, 2, blocked, cost)
        .filter((p) => p.cost > 0 && !p.risk)
        .sort((a, b) => score(b) - score(a));
      for (const p of choices) {
        if (score(p) <= score(ally)) continue;
        const points =
          p.points ?? leastCostPath(this.map, ally, p, blocked, cost);
        if (
          points.some(
            (q) =>
              surfaceAt(this.map, q, "fire") || surfaceAt(this.map, q, "trap"),
          )
        )
          continue;
        if (
          this.party.some(
            (t) =>
              this.canOpportunity(t) &&
              [ally, ...points.slice(0, -1)].some(
                (from, i) =>
                  distance(from, t) <= 1 &&
                  distance(points[i], t) > 1 &&
                  lineOfSight(this.map, from, t),
              ),
          )
        )
          continue;
        ally.reactionUsed = true;
        Object.assign(ally, points.at(-1));
        this.emit("move", { steps: [{ heroId: ally.id, points }] });
        this.surfaceContact(ally, { entry: true });
        return true;
      }
    }
    return false;
  },
  clearCreatureTerrain(h, point) {
    const field = (this.map.zones ?? []).find(
      (z) =>
        z.caltrops && z.cells.some((p) => p.x === point.x && p.z === point.z),
    );
    if (!field) throw new Error("Choose a caltrop patch within reach.");
    this.map.zones = this.map.zones.filter((z) => z !== field);
    this.note(`${h.name} clears the caltrops.`);
    this.emit("battlefield");
  },
  enemySearchBlood(e) {
    if (
      !this.enemyCapable(e) ||
      e.hp <= 0 ||
      !e.retained?.includes("maneuver") ||
      !this.creature(e)?.actions.maneuvers.actions.some(
        (a) => a.name === "Read the Blood Trail",
      )
    )
      return false;
    const trail = [...this.party, ...this.enemies]
      .filter(
        (p) =>
          p !== e &&
          conscious(p) &&
          status(p, "bleeding") &&
          distance(e, p) <= 6,
      )
      .sort((a, b) => distance(e, a) - distance(e, b))[0];
    if (!trail) return false;
    const dir = { x: Math.sign(trail.x - e.x), z: Math.sign(trail.z - e.z) };
    const blocked = this.occupied(e.id),
      cost = (p) =>
        traversalCost(this.map, [...this.party, ...this.enemies], p);
    const options = this.enemyMovementCells(
      e,
      this.enemySpeed(e),
      blocked,
      cost,
    ).filter(
      (p) =>
        p.cost > 0 &&
        !p.risk &&
        !surfaceAt(this.map, p, "fire") &&
        !surfaceAt(this.map, p, "trap"),
    );
    // Scent supplies a direction, not an unseen actor's exact square or a legal attack target.
    const score = (p) =>
      (p.x - e.x) * dir.x + (p.z - e.z) * dir.z - p.cost * 0.2;
    const dest = options.sort((a, b) => score(b) - score(a))[0];
    e.aiState.maneuverDone = true;
    this.enemyAnnounce(e, "Read the Blood Trail");
    const points = dest
      ? (dest.points ?? leastCostPath(this.map, e, dest, blocked, cost))
      : [];
    this.enemyTravel(e, undefined, points);
    return true;
  },
  enemyConeAttack(e, h, action) {
    const cells = coneCells(e, h),
      hit = (p) =>
        cells.some((c) => c.x === p.x && c.z === p.z) &&
        lineOfSight(this.map, e, p);
    const heroes = this.party.filter(
      (p) => p.survival.status !== "dead" && hit(p),
    );
    const allies = this.enemies.filter((p) => p !== e && p.hp > 0 && hit(p));
    if (!heroes.length) return;
    this.enemyAnnounce(e, action.name);
    e.aiState ??= {};
    (e.aiState.lastActions ??= {})[action.name] = e.powerTurn ?? 0;
    for (const target of heroes) this.resolveEnemyHit(e, target);
    for (const target of allies) {
      const card = this.creature(target),
        attribute = card?.attributes[action.attribute] ?? 0;
      const sources = [
        ...this.R.conditionRollSources(target.conditions ?? [], {
          mode: "defense",
          perceivedSources: this.perceivedSources(target),
        }),
        ...this.creatureAttackModifiers(e, target),
        { kind: "boon", amount: this.creature(e)?.defenses.threat.boons ?? 0 },
        { kind: "bane", amount: this.creature(e)?.defenses.threat.banes ?? 0 },
      ];
      const plan = this.R.rollPlan({
        attribute,
        boons: sources
          .filter((s) => s.kind === "boon")
          .reduce((n, s) => n + s.amount, 0),
        banes: sources
          .filter((s) => s.kind === "bane")
          .reduce((n, s) => n + s.amount, 0),
      });
      const faces = this.dice(plan.count)
        .sort((a, b) => (plan.net >= 0 ? b - a : a - b))
        .slice(0, 3);
      const result = this.R.classifyRoll(faces, attribute),
        outcome = action.outcomes[result.tier];
      const damage = this.R.damageEvent({
        components: [
          {
            type: action.type,
            amount: Number(outcome.match(/^\d+/)?.[0] ?? 0),
          },
        ],
        resistances: this.creatureResistances(target),
        weaknesses: this.creatureWeaknesses(target),
      });
      const actual = this.absorbPowerDamage(target, damage.total, action.type);
      target.hp = Math.max(0, target.hp - actual);
      for (const m of outcome.matchAll(
        /(Burning|Freezing|Poisoned|Bleeding|Slowed|Dazed|Paralyzed|Frightened|Blinded|Deafened) (\d+)/gi,
      ))
        this.addCreatureCondition(target, m[1].toLowerCase(), Number(m[2]), e);
      this.defeatEnemy(target);
      this.note(
        `${e.name}'s ${action.name} catches ${target.name} for ${actual} damage.`,
      );
      this.emit("attack", {
        attacker: e.id,
        target: target.id,
        damage: actual,
        spell: true,
        element: action.type,
      });
    }
  },
  enemyAnnounce(e, name) {
    this.note(`${e.name} uses ${name}.`);
    this.emit("feedback", { id: e.id, kind: "status", text: name });
  },
  enemyTacticalManeuver(e, h) {
    if (
      e.aiState?.maneuverDone ||
      !this.enemyCapable(e) ||
      e.hp <= 0 ||
      !e.retained?.includes("maneuver")
    )
      return;
    e.aiState ??= {};
    e.aiState.maneuverDone = true;
    const names =
      this.creature(e)?.actions.maneuvers.actions.map((a) => a.name) ?? [];
    const can = (name) => names.includes(name);
    const visible = (p, r) =>
      p && distance(e, p) <= r && lineOfSight(this.map, e, p);
    const hearing = (p) =>
      !this.R.conditionSummary(p.conditions ?? []).deafened.active;
    const ally = this.enemies
      .filter(
        (a) =>
          a !== e &&
          a.group === e.group &&
          a.hp > 0 &&
          visible(a, 3) &&
          hearing(a),
      )
      .find((a) =>
        (a.conditions ?? []).some(
          (c) =>
            c.persistence === "temporary" &&
            c.rating > 0 &&
            ["dazed", "frightened"].includes(c.key),
        ),
      );
    let chosen;
    if (names.includes("Make Room") && h && this.enemyMakeRoom(e, h)) {
      this.enemyAnnounce(e, "Make Room");
      return;
    }
    const mobility = this.enemyMobilityManeuver(e, h, names);
    if (mobility) {
      e.aiState.movingManeuver = true;
      e.aiState.evade = mobility.ignore;
      if (mobility.name === "Shambling Advance") e.aiState.nextAttackBane = 1;
      this.enemyAnnounce(e, mobility.name);
      this.enemyTravel(e, h, mobility.points);
      return true;
    }

    if (can("Keep the Rhythm") && ally) {
      const k = ally.conditions.some(
        (c) =>
          c.key === "dazed" && c.persistence === "temporary" && c.rating > 0,
      )
        ? "dazed"
        : "frightened";
      ally.conditions = this.R.reduceTemporary(ally.conditions, k, 1);
      chosen = "Keep the Rhythm";
    } else if (can("Stoke the Core") && h) {
      e.aiState.fireBonus = 1;
      chosen = "Stoke the Core";
    } else if (can("Scatter Embers") && visible(h, 1)) {
      this.addCreatureCondition(h, "burning", 1, e);
      chosen = "Scatter Embers";
    } else if (
      can("Grave Stench") &&
      visible(h, 1) &&
      !this.traits(h).some((t) => t.noBreathing)
    ) {
      this.addCreatureCondition(h, "poisoned", 1, e);
      chosen = "Grave Stench";
    } else if (
      can("Rattle of the Grave") &&
      visible(h, 2) &&
      hearing(h) &&
      !status(h, "frightened")
    ) {
      this.addCreatureCondition(h, "frightened", 1, e);
      chosen = "Rattle of the Grave";
    } else if (can("Shoulder Through") && visible(h, 1)) {
      this.forceMove(
        h,
        { x: Math.sign(h.x - e.x), z: Math.sign(h.z - e.z) },
        1,
      );
      chosen = "Shoulder Through";
    } else if (
      can("Shed the Grasp") &&
      this.R.conditionSummary(e.conditions ?? []).grappled.rating > 0 &&
      this.R.conditionSummary(e.conditions ?? []).grappled.rating < 3
    ) {
      const hold = e.conditions.find((c) => c.key === "grappled");
      if (hold)
        for (const actor of [...this.party, ...this.enemies])
          actor.conditions = (actor.conditions ?? [])
            .map((c) =>
              c === hold ||
              (hold.holder &&
                c.holder === hold.holder &&
                c.heldTarget === hold.heldTarget)
                ? { ...c, rating: c.rating - 1 }
                : c,
            )
            .filter((c) => c.rating > 0);
      chosen = "Shed the Grasp";
    } else {
      if (
        can("Guide the Light") &&
        h &&
        visible(h, 3) &&
        !illuminated(this.map, this.party, h)
      ) {
        const cells = [{ x: h.x, z: h.z }];
        for (const p of Object.values(this.map.tiles))
          if (
            cells.length < 3 &&
            distance(p, e) <= 3 &&
            cells.some((c) => distance(p, c) === 1) &&
            !this.map.obstacles[key(p.x, p.z)] &&
            lineOfSight(this.map, e, p) &&
            !cells.some((c) => c.x === p.x && c.z === p.z)
          )
            cells.push(p);
        this.createSurface("light", cells, e, 10);
        const zone = this.map.zones.find(
          (z) => z.source === e.id && z.kind === "light",
        );
        zone.expires = null;
        zone.npcUntilTurn = (e.powerTurn ?? 0) + 1;
        this.enemyAnnounce(e, "Guide the Light");
        return;
      }
      const terrain = can("Scatter caltrops")
        ? ["Scatter caltrops", "difficult", 2, 2, true]
        : can("Smoke pots")
          ? ["Smoke pots", "smoke", 3, 3, true]
          : can("Lay the Rime")
            ? ["Lay the Rime", "difficult", 3, 3, false]
            : can("Mark the Boundary")
              ? ["Mark the Boundary", "difficult", 3, 3, false]
              : null;
      if (
        terrain &&
        h &&
        (!terrain[4] || !e.aiState.sceneUsed?.includes(terrain[0]))
      ) {
        const [name, kind, count, range, once] = terrain,
          occupied = this.occupied();
        const available = Object.values(this.map.tiles)
          .filter(
            (p) =>
              distance(p, e) <= range &&
              distance(p, e) > 0 &&
              !this.map.obstacles[key(p.x, p.z)] &&
              !occupied.has(key(p.x, p.z)) &&
              lineOfSight(this.map, e, p) &&
              !surfaceAt(this.map, p, kind),
          )
          .sort((a, b) => distance(a, h) - distance(b, h));
        const cells = [];
        for (const p of available)
          if (!cells.length || cells.some((q) => distance(p, q) === 1)) {
            cells.push(p);
            if (cells.length >= count) break;
          }
        if (cells.length) {
          this.createSurface(kind, cells, e, 10);
          const zone = this.map.zones.find(
            (z) => z.source === e.id && z.kind === kind,
          );
          zone.expires = null;
          if (!once || kind === "smoke")
            zone.npcUntilTurn = (e.powerTurn ?? 0) + 1;
          if (name === "Scatter caltrops") zone.caltrops = true;
          if (once) (e.aiState.sceneUsed ??= []).push(name);
          chosen = name;
        }
      }
      if (
        !chosen &&
        can("Study the Opening") &&
        h &&
        distance(e, h) <= this.creatureAction(e).range
      ) {
        e.study = true;
        chosen = "Study the Opening";
      }
      if (!chosen && can("Plant the Shield")) {
        e.aiState.baseStability ??= e.stability ?? 0;
        e.stability = Math.max(e.stability ?? 0, 2);
        chosen = "Plant the Shield";
      }
      if (!chosen && can("Plant the Weight")) {
        e.aiState.baseStability ??= e.stability ?? 0;
        e.stability = Math.max(e.stability ?? 0, 3);
        chosen = "Plant the Weight";
      }
      if (!chosen && can("Defend")) {
        e.defending = true;
        chosen = "Defend";
      }
    }
    if (chosen) this.enemyAnnounce(e, chosen);
  },
};
