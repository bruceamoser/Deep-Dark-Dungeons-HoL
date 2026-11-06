import { POWERS, mappedPower } from "../src/core/powers.mjs";
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
      revision: 2,
      policy:
        "Game-owned powers replace new tabletop ability training. Historical source choices and acquisitions remain immutable; mapping provides their current playable benefits without stacking duplicate mappings.",
      counts: {
        powers: Object.keys(POWERS).length,
        disciplinePowers: Object.values(POWERS).filter((p) => p.discipline)
          .length,
        signatures: Object.values(POWERS).filter((p) => p.classId).length,
        generalPowers: Object.values(POWERS).filter(
          (p) => !p.discipline && !p.classId && !p.universal,
        ).length,
        starterPowersPerDiscipline: Object.fromEntries(
          input.records
            .filter((r) => r.kind === "discipline")
            .map((r) => [
              r.id,
              Object.values(POWERS).filter(
                (p) => p.discipline === r.id && p.rank === 1,
              ).length,
            ]),
        ),
        consumableActions: Object.values(POWERS).filter((p) => p.universal)
          .length,
        recipes: RECIPES.length,
      },
      powers: Object.values(POWERS),
      legacyMappings: input.records
        .filter((c) => c.kind === "ability")
        .map((c) => ({
          id: c.id,
          current: mappedPower(c.id, { choices: input.records }),
        })),
      recipes: RECIPES,
    },
    null,
    2,
  ) + "\n",
);
