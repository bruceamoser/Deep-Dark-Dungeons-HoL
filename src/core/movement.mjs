import { surfaceAt, wallAt } from "./battlefield.mjs";
import { key, neighbors } from "./dungeon.mjs";
const prone = (actor) => actor.conditions?.some((c) => c.key === "prone");
export function traversalCost(map, actors, point) {
  return surfaceAt(map, point, "difficult") ||
    map.tiles[key(point.x, point.z)]?.difficult ||
    actors.some((a) => a.x === point.x && a.z === point.z && prone(a))
    ? 2
    : 1;
}
// Computer-game adaptation: capable companions yield while another hero passes.
// Standing opponents still block; prone occupants cost two and cannot be endpoints.
export function movementBlockers(party, enemies, mover, canYield) {
  return new Set(
    [
      ...party.filter(
        (h) =>
          h.id !== mover.id &&
          h.survival.status !== "dead" &&
          !canYield(h) &&
          !prone(h),
      ),
      ...enemies.filter((e) => e.hp > 0 && !prone(e)),
    ].map((p) => key(p.x, p.z)),
  );
}
export function leastCostPath(map, start, end, blocked, cost) {
  const endKey = key(end.x, end.z);
  if (!map.tiles[endKey] || map.obstacles?.[endKey] || blocked.has(endKey))
    return [];
  const open = [{ ...start, cost: 0 }],
    costs = new Map([[key(start.x, start.z), 0]]),
    previous = new Map();
  while (open.length) {
    open.sort((a, b) => a.cost - b.cost);
    const current = open.shift(),
      currentKey = key(current.x, current.z);
    if (current.cost !== costs.get(currentKey)) continue;
    if (currentKey === endKey) {
      const path = [];
      let at = { x: current.x, z: current.z };
      while (key(at.x, at.z) !== key(start.x, start.z)) {
        path.unshift(at);
        at = previous.get(key(at.x, at.z));
      }
      return path;
    }
    for (const p of neighbors(map, current, blocked)) {
      const k = key(p.x, p.z),
        nextCost = current.cost + cost(p);
      if (nextCost < (costs.get(k) ?? Infinity)) {
        costs.set(k, nextCost);
        previous.set(k, { x: current.x, z: current.z });
        open.push({ ...p, cost: nextCost });
      }
    }
  }
  return [];
}

// Commit coordinated endpoints atomically. Intermediate occupied squares are
// presentation waypoints, never a saved position or a place to stop a turn.
export function companyStep(marching, paths, occupants, blockedFor) {
  const intents = new Map(),
    claimed = new Set();
  const at = (p) => occupants.find((h) => h.x === p.x && h.z === p.z);
  for (const h of marching) {
    const path = paths.get(h.id);
    if (!path?.length) continue;
    const blocked = blockedFor(h);
    let index = 0;
    while (
      index < path.length - 1 &&
      at(path[index]) &&
      !blocked.has(key(path[index].x, path[index].z))
    )
      index++;
    const points = path.slice(0, index + 1),
      destination = points.at(-1),
      cell = key(destination.x, destination.z);
    if (points.some((p) => blocked.has(key(p.x, p.z))) || claimed.has(cell))
      continue;
    intents.set(h.id, { hero: h, points, destination });
    claimed.add(cell);
  }
  // A destination can be occupied only by a companion who is vacating it in
  // this same atomic step. Cycles (including two heroes trading places) are legal.
  let changed;
  do {
    changed = false;
    for (const [id, intent] of intents) {
      const occupant = at(intent.destination);
      if (occupant && occupant.id !== id && !intents.has(occupant.id)) {
        intents.delete(id);
        changed = true;
      }
    }
  } while (changed);
  const steps = [...intents.values()];
  for (const { hero, points, destination } of steps) {
    Object.assign(hero, destination);
    paths.get(hero.id).splice(0, points.length);
  }
  return steps;
}

// A single weighted flood computes the actual movement budget, including ally
// passage. Occupied cells can be crossed but are never valid destinations.
export function reachableCells(
  map,
  start,
  budget,
  blocked,
  cost,
  occupied = new Set(),
) {
  const costs = new Map([[key(start.x, start.z), 0]]),
    open = [{ ...start, cost: 0 }],
    result = [];
  while (open.length) {
    open.sort((a, b) => a.cost - b.cost);
    const p = open.shift(),
      k = key(p.x, p.z);
    if (p.cost !== costs.get(k)) continue;
    result.push({ x: p.x, z: p.z, cost: p.cost, canEnd: !occupied.has(k) });
    for (const n of neighbors(map, p, blocked)) {
      const nk = key(n.x, n.z),
        next = p.cost + cost(n);
      if (next <= budget && next < (costs.get(nk) ?? Infinity)) {
        costs.set(nk, next);
        open.push({ ...n, cost: next });
      }
    }
  }
  return result;
}

// Minimize exposure within a real movement budget. Keeping states by both
// square and cost preserves safer detours without granting extra movement.
export function safestReachableCells(map, start, budget, blocked, cost, risk) {
  const origin = key(start.x, start.z),
    stateKey = (p, spent) => `${key(p.x, p.z)}:${spent}`,
    first = { x: start.x, z: start.z, cost: 0, risk: 0, previous: null },
    open = [first],
    states = new Map([[stateKey(start, 0), first]]),
    result = new Map();
  while (open.length) {
    open.sort((a, b) => a.risk - b.risk || a.cost - b.cost);
    const p = open.shift(),
      k = key(p.x, p.z);
    if (states.get(stateKey(p, p.cost)) !== p) continue;
    if (!result.has(k)) {
      const points = [];
      for (let at = p; at.previous; at = at.previous)
        points.unshift({ x: at.x, z: at.z });
      result.set(k, { x: p.x, z: p.z, cost: p.cost, risk: p.risk, points });
    }
    for (const n of neighbors(map, p, blocked)) {
      const spent = p.cost + cost(n);
      if (spent > budget || key(n.x, n.z) === origin) continue;
      const id = stateKey(n, spent),
        danger = p.risk + risk(n);
      if (danger >= (states.get(id)?.risk ?? Infinity)) continue;
      const next = { ...n, cost: spent, risk: danger, previous: p };
      states.set(id, next);
      open.push(next);
    }
  }
  return [...result.values()];
}
