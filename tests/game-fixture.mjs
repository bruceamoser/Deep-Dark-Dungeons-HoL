import fs from "node:fs";
import { Game } from "../src/core/game.mjs";
const R = {};
for (const name of [
  "workshop-character",
  "creation",
  "portable-character",
  "roll",
  "damage",
  "survival",
  "wounds",
  "encounter",
  "actions",
  "conditions",
  "inventory",
  "passive-defenses",
  "potions",
  "treatment",
])
  Object.assign(R, await import(`../public/vendor/hol/rules/${name}.mjs`));
const data = (n) =>
  JSON.parse(
    fs.readFileSync(
      new URL(`../public/vendor/hol/data/${n}.json`, import.meta.url),
    ),
  );
const C = {
  choices: data("choices").records,
  inventory: data("inventory"),
  creatures: data("creatures"),
  wounds: data("wounds"),
  commit: data("choices").sourceCommit,
};
const drafts = [
  "borin-bridgekeeper",
  "lira-ashbow",
  "pip-copperwink",
  "vaelis-emberglass",
].map((id) => data("party").find((p) => p.id === id).draft);
const fresh = () => {
  const g = new Game(R, C);
  g.fresh(drafts);
  return g;
};

export { R, C, data, drafts, fresh };
