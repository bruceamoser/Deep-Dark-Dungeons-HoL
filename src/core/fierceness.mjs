import { Random } from "./dungeon.mjs";
export const FIERCENESS = Object.freeze([
  { label: "Very low", risk: 0.02, color: "#73c593" },
  { label: "Low", risk: 0.05, color: "#9bc881" },
  { label: "Medium low", risk: 0.1, color: "#c3ca79" },
  { label: "Medium", risk: 0.18, color: "#d9bd70" },
  { label: "Medium high", risk: 0.28, color: "#e5a16c" },
  { label: "High", risk: 0.38, color: "#e0806b" },
  { label: "Very high", risk: 0.5, color: "#dc626a" },
]);
const valid = (t) => Number.isInteger(t) && t >= 0 && t < FIERCENESS.length;
export function locationFierceness(map, point) {
  const rooms = map.rooms ?? [];
  rooms.forEach((r, i) => {
    if (!valid(r.fierceness))
      r.fierceness =
        i === 0
          ? 0
          : new Random(
              ((map.seed ?? 0) ^
                Math.imul(i + 1, 0x85ebca6b) ^
                Math.imul(map.depth ?? 1, 7919)) >>>
                0,
            ).int(0, 6);
  });
  let room = rooms.find(
    (r) =>
      point.x >= r.x &&
      point.x < r.x + r.w &&
      point.z >= r.z &&
      point.z < r.z + r.h,
  );
  const corridor = !room;
  if (!room)
    room = [...rooms].sort(
      (a, b) =>
        (point.x - a.cx) ** 2 +
        (point.z - a.cz) ** 2 -
        ((point.x - b.cx) ** 2 + (point.z - b.cz) ** 2),
    )[0];
  const tier = valid(point.fierceness)
    ? point.fierceness
    : room
      ? Math.max(corridor ? 1 : 0, room.fierceness)
      : 3;
  return { tier, ...FIERCENESS[tier] };
}
export function campProbability(tier, hours, warning = false) {
  const base = FIERCENESS[valid(tier) ? tier : 3].risk;
  const hourly = (1 - Math.pow(1 - base, 1 / 8)) * (warning ? 0.5 : 1);
  return { hourly, total: 1 - Math.pow(1 - hourly, Math.max(0, hours)) };
}
export function campEncounterRandom(seed, hour) {
  // Independent of the duty RNG: foraging, crafting and guard choices cannot
  // shift the encounter roll to a different draw or reroll a saved camp hour.
  return new Random(
    (seed ^ Math.imul(hour + 1, 0x9e3779b1) ^ 0x6a09e667) >>> 0,
  );
}
