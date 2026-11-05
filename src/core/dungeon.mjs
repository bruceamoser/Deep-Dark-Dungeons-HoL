export const key = (x, z) => `${x},${z}`;
export const distance = (a, b) =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.z - b.z));
export class Random {
  constructor(seed) {
    this.state = seed >>> 0;
  }
  next() {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(a, b) {
    return a + Math.floor(this.next() * (b - a + 1));
  }
}
export function generate(seed, depth = 1) {
  const rng = new Random(seed + depth * 7919),
    tiles = {},
    rooms = [];
  const carve = (x, z) => {
    tiles[key(x, z)] = { x, z };
  };
  for (let tries = 0; tries < 180 && rooms.length < 9; tries++) {
    const r = rooms.length
      ? {
          x: rng.int(3, 37),
          z: rng.int(3, 37),
          w: rng.int(5, 9),
          h: rng.int(5, 9),
        }
      : { x: 3, z: 3, w: 9, h: 9 };
    if (
      rooms.some(
        (o) =>
          r.x < o.x + o.w + 3 &&
          r.x + r.w + 3 > o.x &&
          r.z < o.z + o.h + 3 &&
          r.z + r.h + 3 > o.z,
      )
    )
      continue;
    r.cx = r.x + Math.floor(r.w / 2);
    r.cz = r.z + Math.floor(r.h / 2);
    for (let x = r.x; x < r.x + r.w; x++)
      for (let z = r.z; z < r.z + r.h; z++) carve(x, z);
    if (rooms.length) {
      const p = rooms.at(-1);
      let x = p.cx,
        z = p.cz;
      while (x !== r.cx) {
        carve(x, z);
        carve(x, z + 1);
        x += Math.sign(r.cx - x);
      }
      while (z !== r.cz) {
        carve(x, z);
        carve(x + 1, z);
        z += Math.sign(r.cz - z);
      }
      carve(x, z);
    }
    rooms.push(r);
  }
  const start = { x: rooms[0].cx, z: rooms[0].cz },
    last = rooms.at(-1);
  const enemies = rooms.slice(1).flatMap((r, i) =>
    Array.from(
      { length: 1 + Math.min(2, Math.floor((i + depth) / 3)) },
      (_, j) => ({
        id: `e${i}-${j}`,
        x: r.cx + j,
        z: r.cz,
        type: "creature-skeleton",
        group: i,
      }),
    ),
  );
  const map = {
    seed,
    depth,
    tiles,
    rooms,
    obstacles: Object.fromEntries(
      rooms.flatMap((r, i) => [
        [key(r.x, r.z), true],
        [key(r.x + r.w - 1, r.z), true],
        [key(r.x, r.cz), true],
        [key(r.x + r.w - 1, r.z + 1), true],
        [key(r.x + r.w - 2, r.z + 1), true],
        ...(i ? [[key(r.x + 1, r.z + 1), true]] : []),
      ]),
    ),
    start,
    exit: { x: last.cx, z: last.cz },
    enemies,
    chests: rooms.slice(1).map((r, i) => ({
      id: `chest-${i}`,
      x: r.x + 1,
      z: r.z + 1,
      coins: rng.int(8, 20) + depth * 2,
      opened: false,
    })),
  };
  // Admit scenery only if every remaining walkable cell stays connected.
  const candidates = Object.keys(map.obstacles);
  map.obstacles = {};
  for (const candidate of candidates) {
    map.obstacles[candidate] = true;
    const queue = [start],
      seen = new Set([key(start.x, start.z)]);
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i];
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const k = key(p.x + dx, p.z + dz);
        if (tiles[k] && !map.obstacles[k] && !seen.has(k)) {
          seen.add(k);
          queue.push(tiles[k]);
        }
      }
    }
    if (
      seen.size !==
      Object.keys(tiles).length - Object.keys(map.obstacles).length
    )
      delete map.obstacles[candidate];
  }
  return map;
}
export function neighbors(map, p, blocked = new Set()) {
  const result = [];
  for (const [dx, dz] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ]) {
    const x = p.x + dx,
      z = p.z + dz;
    if (
      !map.tiles[key(x, z)] ||
      map.obstacles?.[key(x, z)] ||
      blocked.has(key(x, z))
    )
      continue;
    if (
      dx &&
      dz &&
      (!map.tiles[key(p.x + dx, p.z)] ||
        !map.tiles[key(p.x, p.z + dz)] ||
        map.obstacles?.[key(p.x + dx, p.z)] ||
        map.obstacles?.[key(p.x, p.z + dz)] ||
        blocked.has(key(p.x + dx, p.z)) ||
        blocked.has(key(p.x, p.z + dz)))
    )
      continue;
    result.push({ x, z });
  }
  return result;
}
export function pathfind(map, start, end, blocked = new Set()) {
  if (
    !map.tiles[key(end.x, end.z)] ||
    map.obstacles?.[key(end.x, end.z)] ||
    blocked.has(key(end.x, end.z))
  )
    return [];
  const queue = [start],
    seen = new Map([[key(start.x, start.z), null]]);
  let cursor = 0;
  while (cursor < queue.length) {
    const p = queue[cursor++];
    if (p.x === end.x && p.z === end.z) {
      const out = [];
      let at = p;
      while (at) {
        out.unshift(at);
        at = seen.get(key(at.x, at.z));
      }
      return out.slice(1);
    }
    for (const n of neighbors(map, p, blocked)) {
      const k = key(n.x, n.z);
      if (!seen.has(k)) {
        seen.set(k, p);
        queue.push(n);
      }
    }
  }
  return [];
}
export function lineOfSight(map, a, b) {
  const steps = Math.max(Math.abs(a.x - b.x), Math.abs(a.z - b.z)) * 3;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (
      !map.tiles[
        key(
          Math.round(a.x + (b.x - a.x) * t),
          Math.round(a.z + (b.z - a.z) * t),
        )
      ]
    )
      return false;
  }
  return true;
}
