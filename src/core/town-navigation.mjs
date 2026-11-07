// Town travel is presentation state, separate from saved dungeon coordinates.
export const TOWN_SERVICES = [
  {
    id: "roster",
    label: "The company register",
    place: "Lantern Inn",
    detail: "Heroes & party",
    hotkey: "r",
    node: "n",
    x: 0,
    z: -10,
    model: "building_tavern_blue",
    width: 5.2,
  },
  {
    id: "shop",
    label: "The market quarter",
    place: "Market Square",
    detail: "Equipment & supplies",
    hotkey: "m",
    node: "nw",
    x: -9,
    z: -8,
    model: "building_market_blue",
    width: 4.5,
  },
  {
    id: "training",
    label: "The discipline forge",
    place: "Guildhall",
    detail: "Training & development",
    hotkey: "t",
    node: "w",
    x: -10,
    z: 0,
    model: "building_townhall_blue",
    width: 5,
  },
  {
    id: "workshop",
    label: "The workshop",
    place: "The Ember Smithy",
    detail: "Downtime crafting",
    hotkey: "w",
    node: "sw",
    x: -8,
    z: 9,
    model: "building_blacksmith_blue",
    width: 5,
  },
  {
    id: "camp",
    label: "Camp & supplies",
    place: "Wayfarer Lodge",
    detail: "Rest & provisions",
    hotkey: "p",
    node: "s",
    x: 0,
    z: 10,
    model: "building_home_A_blue",
    width: 4.7,
  },
  {
    id: "infirmary",
    label: "The infirmary",
    place: "Healer’s House",
    detail: "Wounds & recovery",
    hotkey: "v",
    node: "se",
    x: 9,
    z: 8,
    model: "building_home_B_blue",
    width: 4.8,
  },
  {
    id: "fallen",
    label: "Hall of Fallen Heroes",
    place: "The Lantern Shrine",
    detail: "Remember their names",
    hotkey: "h",
    node: "e",
    x: 10,
    z: 0,
    model: "building_shrine_blue",
    width: 4.6,
  },
  {
    id: "descend",
    label: "Enter the depths",
    place: "The Old Gate",
    detail: "Begin expedition",
    hotkey: "d",
    node: "ne",
    x: 8,
    z: -9,
    model: "wall_straight_gate",
    width: 6,
  },
];
export const TOWN_NODES = {
  center: { x: 0, z: 0 },
  n: { x: 0, z: -6 },
  nw: { x: -6, z: -6 },
  w: { x: -6, z: 0 },
  sw: { x: -6, z: 6 },
  s: { x: 0, z: 6 },
  se: { x: 6, z: 6 },
  e: { x: 6, z: 0 },
  ne: { x: 6, z: -6 },
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
export class TownNavigator {
  constructor() {
    this.position = { x: 0, z: 3 };
    this.path = [];
    this.destination = null;
  }
  navigate(id) {
    const service = TOWN_SERVICES.find((s) => s.id === id);
    if (!service) throw new Error("Unknown Greyhaven destination.");
    const start = Object.keys(TOWN_NODES).sort(
      (a, b) =>
        distance(this.position, TOWN_NODES[a]) -
        distance(this.position, TOWN_NODES[b]),
    )[0];
    const queue = [[start]],
      seen = new Set([start]);
    let route;
    while (queue.length) {
      const path = queue.shift(),
        last = path.at(-1);
      if (last === service.node) {
        route = path;
        break;
      }
      for (const edge of TOWN_EDGES)
        if (edge.includes(last)) {
          const next = edge.find((n) => n !== last);
          if (!seen.has(next)) {
            seen.add(next);
            queue.push([...path, next]);
          }
        }
    }
    this.path = route.map((n) => ({ ...TOWN_NODES[n] }));
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
