import { forgePower, forgePowerText } from "../src/core/forge.mjs";
import {
  FORGE_NODES,
  FORGE_DISCIPLINES,
  FORGE_PATHS,
} from "../src/core/forge-catalog.mjs";
import { RELICS } from "../src/core/treasure.mjs";
import { POWERS } from "../src/core/powers.mjs";
import { RECIPES } from "../src/core/recipes.mjs";
import { DUNGEON_TRAITS } from "../src/core/ancestry-game.mjs";
import fs from "node:fs/promises";
import { coverage } from "../src/core/abilities.mjs";
const input = JSON.parse(
  await fs.readFile(
    new URL("../public/vendor/hol/data/choices.json", import.meta.url),
    "utf8",
  ),
);
const abilities = input.records
  .filter((c) => c.kind === "ability")
  .map((c) => ({
    id: c.id,
    name: c.name,
    decision: coverage(c.id).decision ?? "keep",
    ...coverage(c.id),
    source: c.source.path,
    sourceHash: c.source.sha256,
  }));
const counts = abilities.reduce(
  (n, a) => ({ ...n, [a.status]: (n[a.status] ?? 0) + 1 }),
  {},
);
await fs.writeFile(
  new URL("../docs/ability-coverage.json", import.meta.url),
  JSON.stringify(
    {
      sourceCommit: input.sourceCommit,
      counts,
      abilities,
      ancestryTraits: Object.entries(DUNGEON_TRAITS).map(([id, t]) => ({
        id,
        name: input.records.find((c) => c.id === id).name,
        ...t,
        source: input.records.find((c) => c.id === id).source,
      })),
      signatureCount: abilities.filter((a) =>
        a.id.startsWith("ability-signature-"),
      ).length,
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ total: abilities.length, ...counts }));

await fs.writeFile(
  new URL("../docs/game-power-coverage.json", import.meta.url),
  JSON.stringify(
    {
      revision: 4,
      ruleset: "discipline-forge-v1",
      policy:
        "Game-owned discipline paths replace prior staged ability purchases, mastery and fixed signatures. Fresh v0.6 saves only; historical source-card coverage is retained in ability-coverage.json.",
      counts: {
        disciplines: FORGE_DISCIPLINES.length,
        paths: FORGE_PATHS.length,
        nodes: FORGE_NODES.length,
        confluences: FORGE_NODES.filter((n) => n.kind === "intersection")
          .length,
        powers: new Set(FORGE_NODES.map((n) => n.power).filter(Boolean)).size,
        recipes: RECIPES.length,
        namedRelics: Object.keys(RELICS).length,
      },
      disciplines: FORGE_DISCIPLINES,
      paths: FORGE_PATHS,
      nodes: FORGE_NODES,
      powers: [...new Set(FORGE_NODES.map((n) => n.power).filter(Boolean))].map(
        (id) => {
          const p = forgePower(POWERS[id], {
            draft: { forge: {} },
            preview: {
              forge: {
                stats: {},
                profiles: { melee: [1, 1, 2], ranged: [1, 1, 2] },
                upgrades: [],
              },
            },
          });
          return { ...p, description: forgePowerText(p) };
        },
      ),
      recipes: RECIPES,
      namedRelics: RELICS,
    },
    null,
    2,
  ) + "\n",
);
