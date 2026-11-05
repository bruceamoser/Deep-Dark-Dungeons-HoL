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
