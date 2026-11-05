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
    ...coverage(c.id),
    source: c.source.path,
  }));
const counts = abilities.reduce(
  (n, a) => ({ ...n, [a.status]: (n[a.status] ?? 0) + 1 }),
  {},
);
await fs.writeFile(
  new URL("../docs/ability-coverage.json", import.meta.url),
  JSON.stringify(
    { sourceCommit: input.sourceCommit, counts, abilities },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ total: abilities.length, ...counts }));
