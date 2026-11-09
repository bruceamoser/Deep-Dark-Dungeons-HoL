// Town travel is presentation state, separate from saved dungeon coordinates.
export const TOWN_SERVICES = [
  {
    id: "roster",
    label: "Lantern Inn",
    place: "Lantern Inn",
    detail: "Character management",
    hotkey: "i",
    node: "n",
    x: 0,
    z: -10,
    model: "building_tavern_blue",
    width: 5.2,
  },
  {
    id: "shop",
    label: "Market Square",
    place: "Market Square",
    detail: "Buy Gear",
    hotkey: "m",
    node: "nw",
    x: -9,
    z: -8,
    model: "building_market_blue",
    width: 4.5,
  },
  {
    id: "training",
    label: "Guildhall",
    place: "Guildhall",
    detail: "Advance your characters",
    hotkey: "g",
    node: "w",
    x: -10,
    z: 0,
    model: "building_townhall_blue",
    width: 5,
  },
  {
    id: "workshop",
    label: "Ember Smithy",
    place: "The Ember Smithy",
    detail: "Craft Items",
    hotkey: "s",
    node: "sw",
    x: -8,
    z: 9,
    model: "building_blacksmith_blue",
    width: 5,
  },
  {
    id: "camp",
    label: "Wayfarer Lodge",
    place: "Wayfarer Lodge",
    detail: "Enter Camp",
    hotkey: "l",
    node: "s",
    x: 0,
    z: 10,
    model: "building_home_A_blue",
    width: 4.7,
  },
  {
    id: "infirmary",
    label: "Healer’s House",
    place: "Healer’s House",
    detail: "See a Priest",
    hotkey: "h",
    node: "se",
    x: 9,
    z: 8,
    model: "building_home_B_blue",
    width: 4.8,
  },
  {
    id: "fallen",
    label: "The Shrine",
    place: "The Lantern Shrine",
    detail: "See Fallen Heroes",
    hotkey: "s",
    shift: true,
    node: "e",
    x: 10,
    z: 0,
    model: "building_shrine_blue",
    width: 4.6,
  },
  {
    id: "descend",
    label: "The Depths",
    place: "The Old Gate",
    detail: "Leave through the gate",
    hotkey: "d",
    node: "ne",
    x: 8,
    z: -9,
    model: "wall_straight_gate",
    width: 6,
  },
];
export const TOWN_NODES = {
  center: { x: -0.4, z: 0.25 },
  n: { x: 0.3, z: -6.1 },
  nw: { x: -6.1, z: -5.1 },
  w: { x: -6.7, z: 0.4 },
  sw: { x: -5.2, z: 6.2 },
  s: { x: 0.8, z: 6.7 },
  se: { x: 5.7, z: 5.3 },
  e: { x: 6.3, z: -0.5 },
  ne: { x: 5.2, z: -6.3 },
};
export const TOWN_EDGES = [
  ["n", "nw"],
  ["nw", "w"],
  ["w", "sw"],
  ["sw", "s"],
  ["s", "se"],
  ["se", "e"],
  ["e", "ne"],
  ["ne", "n"],
  ["center", "n"],
  ["center", "w"],
  ["center", "s"],
  ["center", "e"],
];
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const routeLength = (points) =>
  points.slice(1).reduce((sum, p, i) => sum + distance(points[i], p), 0);
// One sampled centreline drives the visible dirt, route preview and walking.
export const TOWN_STREETS = TOWN_EDGES.map(([from, to], index) => {
  const a = TOWN_NODES[from],
    b = TOWN_NODES[to],
    dx = b.x - a.x,
    dz = b.z - a.z,
    length = distance(a, b),
    bend = (index % 2 ? -1 : 1) * (index < 8 ? 1.4 : 1.1);
  const c = {
    x: a.x + dx * 0.28 - (dz / length) * bend,
    z: a.z + dz * 0.28 + (dx / length) * bend,
  };
  const d = {
    x: a.x + dx * 0.72 - (dz / length) * bend * 0.8,
    z: a.z + dz * 0.72 + (dx / length) * bend * 0.8,
  };
  const points = Array.from({ length: 21 }, (_, i) => {
    const t = i / 20,
      u = 1 - t;
    return {
      x:
        u * u * u * a.x +
        3 * u * u * t * c.x +
        3 * u * t * t * d.x +
        t * t * t * b.x,
      z:
        u * u * u * a.z +
        3 * u * u * t * c.z +
        3 * u * t * t * d.z +
        t * t * t * b.z,
    };
  });
  return { from, to, points, length: routeLength(points) };
});
export function closestTownStreet(position) {
  let best = { distance: Infinity };
  for (const street of TOWN_STREETS)
    for (let index = 0; index < street.points.length - 1; index++) {
      const a = street.points[index],
        b = street.points[index + 1],
        dx = b.x - a.x,
        dz = b.z - a.z;
      const t = Math.max(
        0,
        Math.min(
          1,
          ((position.x - a.x) * dx + (position.z - a.z) * dz) /
            (dx * dx + dz * dz),
        ),
      );
      const point = { x: a.x + dx * t, z: a.z + dz * t },
        gap = distance(position, point);
      if (gap < best.distance) best = { street, index, point, distance: gap };
    }
  return best;
}
function shortestRoute(start, target) {
  const queue = [{ node: start, cost: 0, points: [] }],
    seen = new Set();
  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift();
    if (seen.has(current.node)) continue;
    if (current.node === target) return current;
    seen.add(current.node);
    for (const street of TOWN_STREETS)
      if (street.from === current.node || street.to === current.node) {
        const forward = street.from === current.node;
        const points = forward ? street.points : [...street.points].reverse();
        queue.push({
          node: forward ? street.to : street.from,
          cost: current.cost + street.length,
          points: [...current.points, ...points.slice(1)],
        });
      }
  }
  throw new Error("Disconnected Greyhaven street.");
}
export class TownNavigator {
  constructor() {
    this.position = {
      ...TOWN_STREETS.find((s) => s.from === "center" && s.to === "s")
        .points[10],
    };
    this.path = [];
    this.destination = null;
  }
  navigate(id) {
    const service = TOWN_SERVICES.find((s) => s.id === id);
    if (!service) throw new Error("Unknown Greyhaven destination.");
    const { street, index, point } = closestTownStreet(this.position);
    const options = [
      {
        node: street.from,
        prefix: [point, ...street.points.slice(0, index + 1).reverse()],
      },
      { node: street.to, prefix: [point, ...street.points.slice(index + 1)] },
    ]
      .map(({ node, prefix }) => {
        const rest = shortestRoute(node, service.node);
        return {
          cost: routeLength(prefix) + rest.cost,
          points: [...prefix, ...rest.points],
        };
      })
      .sort((a, b) => a.cost - b.cost);
    this.path = options[0].points.map((p) => ({ ...p }));
    this.destination = service;
    return this.path;
  }
  cancel() {
    this.path = [];
    this.destination = null;
  }
  advance(dt) {
    let movement = Math.max(0, dt) * 9;
    while (this.path.length) {
      const target = this.path[0],
        d = distance(this.position, target);
      if (d > movement) {
        this.position.x += ((target.x - this.position.x) / d) * movement;
        this.position.z += ((target.z - this.position.z) / d) * movement;
        return null;
      }
      this.position = { ...target };
      this.path.shift();
      movement -= d;
    }
    const arrived = this.destination;
    this.destination = null;
    return arrived;
  }
}
