import { R, C as source, drafts as examples } from "./game-fixture.mjs";
import {
  forgeCatalog,
  forgeOwned,
  forgeRequirements,
} from "../src/core/forge.mjs";
import { FORGE_NODE, FORGE_NODES } from "../src/core/forge-catalog.mjs";
import { forgeStartingDrafts } from "../src/core/forge-presets.mjs";
import { Game } from "../src/core/game.mjs";
import { key } from "../src/core/dungeon.mjs";
export const C = forgeCatalog(source),
  drafts = forgeStartingDrafts(examples, C);
export { R };
export function learn(draft, id) {
  if (forgeOwned(draft, C).has(id)) return;
  const node = FORGE_NODE[id];
  if (!node) throw new Error(id);
  for (const prerequisite of node.requires) learn(draft, prerequisite);
  if (node.minimumRank > 1)
    learn(draft, `${node.discipline}:rank${node.minimumRank}`);
  if (node.investment) {
    while (
      draft.forge.nodes.filter(
        (id) =>
          FORGE_NODE[id].discipline === node.discipline &&
          !["rank", "origin"].includes(FORGE_NODE[id].kind),
      ).length < node.investment
    ) {
      const next = FORGE_NODES.find(
        (n) =>
          n.discipline === node.discipline &&
          !["rank", "origin"].includes(n.kind) &&
          !forgeRequirements(n, draft, C).length,
      );
      if (!next) throw new Error("Cannot reach investment for " + id);
      draft.forge.nodes.push(next.id);
    }
  }
  const why = forgeRequirements(node, draft, C);
  if (why.length) throw new Error(id + ": " + why.join(" "));
  draft.forge.nodes.push(id);
}
export function fresh() {
  const g = new Game(R, C);
  g.fresh(drafts);
  g.pause();
  return g;
}
export function arena(draft = drafts[0]) {
  const g = fresh();
  g.party[0] = g.hero(draft, 0);
  g.selected = 0;
  g.suspended = false;
  g.advance = () => {};
  g.map = {
    ...g.map,
    tiles: {},
    obstacles: {},
    lights: [{ x: 6, z: 6, radius: 20 }],
    rooms: [],
    chests: [],
    zones: [],
    entrance: { x: 0, z: 0 },
    exit: { x: 14, z: 14 },
  };
  for (let x = 0; x < 16; x++)
    for (let z = 0; z < 16; z++) g.map.tiles[key(x, z)] = { x, z };
  g.party.forEach((h, i) =>
    Object.assign(h, { x: 5 + (i % 2), z: 5 + Math.floor(i / 2) }),
  );
  g.enemies = [
    {
      id: "target",
      name: "Sentry",
      x: 4,
      z: 5,
      hp: 200,
      maxHp: 200,
      conditions: [],
      reactionUsed: true,
    },
  ];
  g.mode = "combat";
  g.encounter = R.startEncounter(
    [
      ...g.party.map((h) => ({ id: h.id, side: "players" })),
      { id: "target", side: "opposition" },
    ],
    [6, 6, 6],
  );
  g.dice = (n = 3) => Array(n).fill(6);
  g.supplyDie = () => 6;
  return g;
}
