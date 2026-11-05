import { Random, key, distance, lineOfSight, pathfind } from "./dungeon.mjs";
import { CREATURE_ROSTER, BOSSES } from "./creature-roster.mjs";
export { CREATURE_ROSTER };
export function encounterBudget(levels, depth, difficulty = 1) {
  const party = levels.reduce((n, l) => n + (32 + 8 * Math.max(1, l)) / 4, 0);
  // Depth pressure is deliberately separate from the book's provisional party budget.
  const pressure = Math.min(1.75, 0.75 + 0.1 * (Math.max(1, depth) - 1));
  return {
    party,
    pressure,
    difficulty,
    target: Math.round(party * pressure * difficulty),
  };
}
export function populateEncounters(map, catalog, levels) {
  const rng = new Random(map.seed + map.depth * 4373),
    records = catalog.creatures;
  const encounters = [],
    enemies = [];
  for (let i = 1; i < map.rooms.length; i++) {
    const room = map.rooms[i];
    const bossRoom = map.depth % 5 === 0 && i === map.rooms.length - 1;
    const themes = [
      ...new Set(
        Object.values(CREATURE_ROSTER)
          .filter((c) => c.depth <= map.depth)
          .map((c) => c.theme),
      ),
    ];
    const theme = themes[rng.int(0, themes.length - 1)];
    const budget = encounterBudget(
      levels,
      map.depth,
      bossRoom ? 1.5 : i === map.rooms.length - 1 ? 1.25 : 1,
    );
    const unlock =
      map.depth +
      Math.floor(
        (levels.reduce((n, l) => n + l, 0) / Math.max(1, levels.length) - 1) /
          3,
      );
    const pool = records.filter(
      (c) =>
        CREATURE_ROSTER[c.id]?.theme === theme &&
        CREATURE_ROSTER[c.id].depth <= unlock,
    );
    const boss = bossRoom
      ? records.find(
          (c) =>
            c.id ===
            BOSSES[Math.min(BOSSES.length - 1, Math.floor(map.depth / 5) - 1)],
        )
      : null;
    const chosen = boss ? [boss] : [];
    let total = boss?.cv ?? 0;
    while (chosen.length < 5) {
      const choices = pool.filter(
        (c) =>
          c.cv + total <= budget.target &&
          chosen.filter((x) => x.id === c.id).length < 2 &&
          !(
            chosen.some((x) =>
              /Dazed|Paralyzed/.test(x.actions.main.actions[1].damageSource),
            ) && /Dazed|Paralyzed/.test(c.actions.main.actions[1].damageSource)
          ),
      );
      if (!choices.length) break;
      // Prefer higher-CV cards at larger budgets without changing their printed stats.
      const top = choices.sort((a, b) => a.cv - b.cv),
        pick = top[rng.int(0, top.length - 1)];
      chosen.push(pick);
      total += pick.cv;
    }
    const cells = Object.values(map.tiles)
      .filter(
        (p) =>
          p.x >= room.x &&
          p.x < room.x + room.w &&
          p.z >= room.z &&
          p.z < room.z + room.h &&
          !map.obstacles[key(p.x, p.z)] &&
          distance(p, map.exit) > 0,
      )
      .sort(
        (a, b) =>
          distance(a, { x: room.cx, z: room.cz }) -
          distance(b, { x: room.cx, z: room.cz }),
      );
    chosen.forEach((c, j) => {
      if (cells[j])
        enemies.push({
          ...cells[j],
          id: `e${i - 1}-${j}`,
          group: i - 1,
          type: c.id,
          name: c.name,
          hp: c.hp.max,
          maxHp: c.hp.max,
          cv: c.cv,
          boss: !!boss && j === 0,
          stability: c.defenses.stability,
          conditions: [],
          ammunition: 6,
        });
    });
    encounters.push({
      group: i - 1,
      theme,
      ...budget,
      actual: total,
      creatures: chosen.map((c) => c.id),
      levels: [...levels],
    });
  }
  map.bossId = enemies.find((e) => e.boss)?.id ?? null;
  map.encounters = encounters;
  map.enemies = enemies;
  return enemies;
}
export const bestiaryMethods = {
  creature(e) {
    return e?.type
      ? this.C.creatures?.creatures.find((c) => c.id === e.type)
      : null;
  },
  creatureResistances(e) {
    return (
      this.creature(e)?.resistances.numeric.map((r) => ({
        type: r.type.toLowerCase(),
        value: r.value,
      })) ?? [{ type: "physical", value: 1 }]
    );
  },
  creatureWeaknesses(e) {
    return (
      this.creature(e)?.weaknesses.numeric.map((r) => ({
        type: r.type.toLowerCase(),
        value: r.value,
      })) ?? []
    );
  },
  creatureAction(e, basic = false) {
    const c = this.creature(e);
    if (!c)
      return {
        name: "Basic Melee",
        attribute: "agility",
        type: "physical",
        range: 1,
        outcomes: { weak: "5", standard: "3", strong: "2" },
      };
    const a =
        c.actions.main.actions[
          basic ||
          (e.ammunition === 0 &&
            /arrow|dart|stone/i.test(c.actions.main.actions[1].name))
            ? 0
            : 1
        ],
      details = c.reference.specialtyDetails.find((d) => d.title === a.name);
    const fields = details?.fields ?? [],
      target = fields.find((f) => f.label === "Target")?.text ?? "";
    return {
      name: a.name,
      attribute: a.defense.attribute,
      type: (fields.find((f) => f.label === "Damage type")?.text ?? "physical")
        .replace(".", "")
        .toLowerCase(),
      range: Number(target.match(/within (\d+) squares/)?.[1] ?? 1),
      ammunition:
        fields.some((f) => f.label === "Ammunition") ||
        /Ammunition.*inventory d6/i.test(details?.markdown ?? ""),
      spell: fields.some((f) => f.label === "Spell"),
      hearing: /can hear/.test(target),
      outcomes: a.outcomes,
    };
  },
  creatureDefense(e, h, spec) {
    const c = this.creature(e),
      resistances = this.creatureResistances(e);
    let boons = c?.defenses.evasion.boons ?? 0,
      banes = (c?.defenses.evasion.banes ?? 0) + Number(!!e.defending),
      collapse = false;
    if (c && !e.reactionUsed && this.enemyCapable(e)) {
      const reactions = c.actions.reactions.actions.map((a) => a.name);
      if (reactions.includes("Fall to Pieces") && spec.type === "physical") {
        e.reactionUsed = true;
        resistances.push({ type: "physical", value: 3 });
        collapse = true;
        this.note(`${e.name} uses Fall to Pieces.`);
      } else if (
        reactions.includes("Shield Hunker") &&
        spec.type === "physical"
      ) {
        e.reactionUsed = true;
        e.hunker = true;
        this.note(`${e.name} uses Shield Hunker.`);
      }
    }
    const reactions = c?.actions.reactions.actions.map((a) => a.name) ?? [];
    if (
      !e.reactionUsed &&
      this.enemyCapable(e) &&
      ((reactions.includes("Turn the Blade") &&
        spec.weapon === "melee" &&
        distance(e, h) <= 1) ||
        (reactions.includes("Spell Screen") && spec.spell))
    ) {
      e.reactionUsed = true;
      banes++;
    }
    if (e.hunker && spec.type === "physical") banes++;
    // Cover is an alternative Reaction: one guardian may interpose, no movement or damage transfer.
    const guardian = this.enemies.find(
      (g) =>
        g !== e &&
        g.hp > 0 &&
        !g.reactionUsed &&
        this.enemyCapable(g) &&
        distance(g, e) <= 1 &&
        lineOfSight(this.map, g, h) &&
        this.creature(g)?.actions.reactions.actions.some(
          (a) => a.name === "Cover a Companion",
        ) &&
        (distance(g, h) <= 1 || CREATURE_ROSTER[g.type]?.shield),
    );
    if (guardian && spec.type === "physical") {
      guardian.reactionUsed = true;
      banes++;
      this.note(`${guardian.name} covers ${e.name}.`);
    }
    return { boons, banes, resistances, collapse };
  },
  enemyCapable(e) {
    return !["asleep", "paralyzed", "unconscious", "petrified"].some(
      (k) => this.R.conditionSummary(e.conditions ?? [])[k]?.active,
    );
  },
  enemyManeuver(e) {
    e.defending = false;
    e.hunker = false;
    e.reactionUsed = false;
    e.study = false;
    const restrictions = this.R.conditionActionRestrictions(e.conditions ?? []),
      count =
        3 - Math.min(3, Math.max(restrictions.dazed, restrictions.grappled));
    e.retained = ["main", "maneuver", "reaction"].slice(0, count);
    if (!e.retained.includes("reaction")) e.reactionUsed = true;
    if (!this.enemyCapable(e) || !e.retained.includes("maneuver")) return;
    const maneuvers =
      this.creature(e)?.actions.maneuvers.actions.map((a) => a.name) ?? [];
    if (maneuvers.includes("Study the Opening")) e.study = true;
    else if (maneuvers.includes("Defend")) e.defending = true;
    // Selecting Defend is the AI policy; it does not grant unprinted Stalking Step or shield effects.
  },
  moveCreatureIntoRange(e, h, range) {
    if (distance(e, h) <= range && lineOfSight(this.map, e, h)) return;
    const blocked = this.occupied(e.id),
      candidates = Object.values(this.map.tiles).filter(
        (p) =>
          distance(p, h) <= range &&
          distance(p, h) > 0 &&
          !this.map.obstacles[key(p.x, p.z)] &&
          !blocked.has(key(p.x, p.z)) &&
          lineOfSight(this.map, p, h),
      );
    const routes = candidates
      .map((p) => pathfind(this.map, e, p, blocked))
      .filter((p) => p.length)
      .sort((a, b) => a.length - b.length);
    const route = routes[0],
      speed = this.enemySpeed(e);
    if (route?.length && speed > 0)
      Object.assign(e, route[Math.min(speed, route.length) - 1]);
  },
  creatureAfterHit(e, h, spec, damage) {
    if (e.type === "creature-emberling" && spec.type === "cold")
      e.chilled = true;
    if (!this.enemyCapable(e) || e.hp <= 0 || e.reactionUsed || damage <= 0)
      return;
    const reactions =
      this.creature(e)?.actions.reactions.actions.map((a) => a.name) ?? [];
    const rider =
      distance(e, h) <= 1
        ? reactions.includes("Heated Hide")
          ? ["burning", 1]
          : reactions.includes("Splintering Rime")
            ? ["freezing", 1]
            : reactions.includes("Clinging Recoil")
              ? ["slowed", 2]
              : null
        : null;
    if (rider) {
      e.reactionUsed = true;
      this.addCreatureCondition(h, rider[0], rider[1], e);
    }
  },
  addCreatureCondition(h, key, rating, e) {
    h.conditions.push({
      id: `creature-effect-${crypto.randomUUID()}`,
      key,
      rating,
      source: e.id,
      persistence: key === "prone" ? "binary" : "temporary",
      order: this.encounter?.serial ?? 0,
    });
    this.note(`${h.name}: ${key} ${rating}.`);
  },
  creatureAttackModifiers(e, h) {
    const sources = this.R.conditionRollSources(e.conditions ?? [], {
      mode: "attack",
      perceivedSources: this.perceivedSources(e),
    });
    const pack =
      this.creature(e)?.reference.generalFields.some(
        (f) => f.label === "Pack Hunter",
      ) &&
      this.enemies.some(
        (a) =>
          a !== e && a.hp > 0 && this.enemyCapable(a) && distance(a, h) <= 1,
      );
    return [
      ...sources.map((s) => ({
        ...s,
        kind: s.kind === "boon" ? "bane" : "boon",
      })),
      { kind: "bane", amount: Number(!!pack) },
      { kind: "boon", amount: Number(!!e.chilled) },
    ];
  },
};
