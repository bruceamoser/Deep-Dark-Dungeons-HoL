import { traitsOf } from "./ancestry-game.mjs";
import { distance, lineOfSight } from "./dungeon.mjs";

// Computer-game adaptation: entrance and occasional inhabited chambers are lit.
// Saved maps keep their lighting layout; old maps receive this deterministic one.
export function prepareLighting(map) {
  map.lights ??= map.rooms.flatMap((r, i) =>
    i === 0 || i % 3 === 0
      ? [{ x: r.cx, z: r.cz, radius: Math.ceil(Math.max(r.w, r.h) / 2) }]
      : [],
  );
  if (
    !Array.isArray(map.lights) ||
    map.lights.some(
      (l) =>
        !map.tiles[`${l.x},${l.z}`] ||
        !Number.isFinite(l.radius) ||
        l.radius < 0 ||
        l.radius > 12,
    )
  )
    throw new Error("Invalid dungeon lighting.");
}
export function naturallyLit(map, p) {
  return (map.lights ?? []).some(
    (l) => distance(l, p) <= l.radius && lineOfSight(map, l, p),
  );
}
export function illuminated(map, party, p) {
  return (
    naturallyLit(map, p) ||
    magicallyLit(map, party, p) ||
    party.some(
      (h) =>
        h.survival.status === "active" &&
        h.torch?.lit &&
        distance(h, p) <= 5 &&
        lineOfSight(map, h, p),
    )
  );
}
export function magicallyLit(map, party, p) {
  return party.some(
    (h) =>
      h.lantern &&
      h.survival.status === "active" &&
      distance(h, p) <= 3 &&
      lineOfSight(map, h, p),
  );
}
export function lightBanes(map, party, p) {
  if (naturallyLit(map, p) || magicallyLit(map, party, p)) return 0;
  const ranges = party
    .filter(
      (h) =>
        h.survival.status === "active" &&
        h.torch?.lit &&
        lineOfSight(map, h, p),
    )
    .map((h) => distance(h, p));
  const d = Math.min(Infinity, ...ranges);
  return d <= 2 ? 0 : d === 3 ? 1 : d === 4 ? 2 : d === 5 ? 3 : Infinity;
}
export function heroCanSee(map, party, h, p) {
  if (
    h.survival.status !== "active" ||
    h.conditions?.some((c) =>
      ["asleep", "unconscious", "petrified"].includes(c.key),
    )
  )
    return false;
  const seismic = traitsOf(h).some((t) => t.seismic >= distance(h, p));
  // All generated dungeon floors are connected stone. Hovering/flying creatures
  // cannot be detected by seismic sense. Objects and floor layout are not creatures.
  if (seismic && p.hp > 0 && !p.flying) return true;
  return (
    !h.conditions?.some((c) => c.key === "blinded") &&
    distance(h, p) <= 9 &&
    Number.isFinite(lightBanes(map, party, p)) &&
    lineOfSight(map, h, p)
  );
}
export function partyCanSee(map, party, p) {
  return party.some((h) => heroCanSee(map, party, h, p));
}
export function terrainVisible(map, party, p) {
  return (
    partyCanSee(map, party, p) ||
    party.some(
      (h) =>
        h.survival.status === "active" &&
        distance(h, p) <= 1 &&
        lineOfSight(map, h, p),
    )
  );
}
export function visionPenalty(map, party, h, p) {
  if (
    p.hp > 0 &&
    !p.flying &&
    traitsOf(h).some((t) => t.seismic >= distance(h, p))
  )
    return 0;
  const rating = lightBanes(map, party, p),
    low = Math.max(0, ...traitsOf(h).map((t) => t.lowLight ?? 0));
  return Number.isFinite(rating) ? Math.max(0, rating - low) : 3;
}
