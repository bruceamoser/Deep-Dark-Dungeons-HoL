import { distance, key, pathfind } from "./dungeon.mjs";
export const FORMATIONS = Object.freeze({
  square: {
    name: "Two by two",
    offsets: [
      [0, 0],
      [1, 0],
      [0, -1],
      [1, -1],
    ],
  },
  column: {
    name: "Single file",
    offsets: [
      [0, 0],
      [0, -1],
      [0, -2],
      [0, -3],
    ],
  },
  wedge: {
    name: "Wedge",
    offsets: [
      [0, 0],
      [-1, -1],
      [1, -1],
      [0, -2],
    ],
  },
  line: {
    name: "Line abreast",
    offsets: [
      [0, 0],
      [-1, 0],
      [1, 0],
      [2, 0],
    ],
  },
});
export function validateFormation(name, order, party) {
  if (
    !FORMATIONS[name] ||
    !Array.isArray(order) ||
    order.length !== party.length ||
    new Set(order).size !== party.length ||
    order.some((id) => !party.some((h) => h.id === id))
  )
    throw new Error(
      "Choose a formation and place every hero once in the marching order.",
    );
}
export function formationRoutes(map, party, enemies, name, order, to) {
  validateFormation(name, order, party);
  const members = order
    .map((id) => party.find((h) => h.id === id))
    .filter((h) => h.survival.status === "active");
  if (!members.length) return new Map();
  const leader = members[0],
    dx = to.x - leader.x,
    dz = to.z - leader.z;
  const forward =
    Math.abs(dx) > Math.abs(dz)
      ? { x: Math.sign(dx), z: 0 }
      : { x: 0, z: Math.sign(dz) || 1 };
  const blocked = new Set(
    enemies.filter((e) => e.hp > 0).map((e) => key(e.x, e.z)),
  );
  const reserved = new Set(),
    routes = new Map();
  members.forEach((h, i) => {
    const [side, back] = FORMATIONS[name].offsets[i];
    const ideal = {
      x: to.x + forward.z * side + forward.x * back,
      z: to.z - forward.x * side + forward.z * back,
    };
    const candidates = Object.values(map.tiles)
      .filter(
        (p) =>
          !map.obstacles?.[key(p.x, p.z)] &&
          !blocked.has(key(p.x, p.z)) &&
          !reserved.has(key(p.x, p.z)) &&
          distance(p, ideal) <= 4,
      )
      .sort(
        (a, b) =>
          distance(a, ideal) - distance(b, ideal) ||
          distance(a, to) - distance(b, to),
      );
    for (const dest of candidates) {
      const route = pathfind(map, h, dest, blocked);
      if (route.length || distance(h, dest) === 0) {
        routes.set(h.id, route);
        reserved.add(key(dest.x, dest.z));
        break;
      }
    }
  });
  return routes;
}
