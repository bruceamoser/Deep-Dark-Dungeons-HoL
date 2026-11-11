import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CREATURE_ROSTER } from "../src/core/creature-roster.mjs";
import { resolveApprovedCreatureAssets } from "./approved-creature-assets.mjs";
export const GATES = ["brief", "model", "motion", "encounter", "integration"];
export function validateQueue(queue, ids, approved) {
  const rows = queue.creatures;
  if (
    rows.length !== ids.length ||
    new Set(rows.map((c) => c.id)).size !== ids.length ||
    rows.some((c) => !ids.includes(c.id))
  )
    throw Error("Queue must cover every roster creature exactly once");
  if (new Set(rows.map((c) => c.order)).size !== rows.length)
    throw Error("Duplicate queue order");
  if (rows.filter((c) => c.status === "active").length > 1)
    throw Error("Only one creature may be active");
  for (const row of rows) {
    if (!["queued", "active", "integrated"].includes(row.status))
      throw Error(`Unknown status: ${row.id}`);
    let gap = false;
    for (const gate of GATES) {
      if (!row.gates[gate]) gap = true;
      else if (gap) throw Error(`Out-of-order gates: ${row.id}`);
    }
    if (
      row.status === "integrated" &&
      (GATES.some((g) => !row.gates[g]) ||
        !approved.assets.some(
          (a) => a.creatureId === row.id && a.model === row.approvedAsset,
        ))
    )
      throw Error(
        `Integrated entry lacks evidence or approved asset: ${row.id}`,
      );
  }
}
export function startCreature(queue, id) {
  const active = queue.creatures.find((c) => c.status === "active");
  if (active && active.id !== id)
    throw Error(`Finish ${active.id} before starting another creature`);
  const row = queue.creatures.find((c) => c.id === id);
  if (!row || row.status === "integrated")
    throw Error("Choose a queued creature");
  const next = queue.creatures
    .filter((c) => c.status === "queued")
    .sort((a, b) => a.order - b.order)[0];
  if (!active && row !== next)
    throw Error(
      `Next creature is ${next?.id}; revise the documented priority before skipping ahead`,
    );
  row.status = "active";
  return row;
}
function evidenceFile(root, report) {
  const full = path.resolve(root, report);
  if (
    path.isAbsolute(report) ||
    !full.startsWith(path.resolve(root, "docs") + path.sep) ||
    !fs.statSync(full).isFile()
  )
    throw Error(
      "Evidence must be an existing repository docs file; link private media from that report",
    );
  return report;
}
function main() {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const file = path.join(root, "docs/creature-production/queue.json");
  const queue = JSON.parse(fs.readFileSync(file));
  const approved = JSON.parse(
    fs.readFileSync(path.join(root, "config/approved-creature-assets.json")),
  );
  const [command = "status", input, gate, report] = process.argv.slice(2);
  validateQueue(queue, Object.keys(CREATURE_ROSTER), approved);
  for (const row of queue.creatures)
    for (const report of Object.values(row.gates)) evidenceFile(root, report);
  if (command === "assets") {
    console.log(
      JSON.stringify(
        resolveApprovedCreatureAssets(root, approved, { required: true }),
        null,
        2,
      ),
    );
    return;
  }
  if (["status", "next", "validate"].includes(command)) {
    const active = queue.creatures.find((c) => c.status === "active");
    const next =
      active ??
      queue.creatures
        .filter((c) => c.status === "queued")
        .sort((a, b) => a.order - b.order)[0];
    console.log(
      JSON.stringify(
        {
          total: queue.creatures.length,
          integrated: queue.creatures.filter((c) => c.status === "integrated")
            .length,
          remaining: queue.creatures.filter((c) => c.status !== "integrated")
            .length,
          active: active?.id ?? null,
          next: next ?? null,
        },
        null,
        2,
      ),
    );
    return;
  }
  const id = input?.startsWith("creature-") ? input : `creature-${input}`;
  if (command === "start") startCreature(queue, id);
  else if (command === "record") {
    const row = queue.creatures.find(
      (c) => c.id === id && c.status === "active",
    );
    if (!row) throw Error("Start this creature first");
    if (gate !== GATES.find((g) => !row.gates[g]))
      throw Error("Complete the next review gate in order");
    evidenceFile(root, report);
    if (gate === "integration") {
      const asset = approved.assets.find((a) => a.creatureId === id);
      if (!asset)
        throw Error(
          "Add the reviewed export to the approved manifest before integration",
        );
      resolveApprovedCreatureAssets(
        root,
        { assets: [asset] },
        { required: true },
      );
      row.approvedAsset = asset.model;
      row.status = "integrated";
    }
    row.gates[gate] = report;
  } else
    throw Error(
      "Usage: creature-production.mjs status|next|validate|assets|start ID|record ID GATE docs/report.md",
    );
  queue.updated = new Date().toISOString().slice(0, 10);
  validateQueue(queue, Object.keys(CREATURE_ROSTER), approved);
  fs.writeFileSync(file, JSON.stringify(queue, null, 2) + "\n");
  console.log(
    `${id}: ${command} saved. Review evidence remains an author responsibility.`,
  );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    main();
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
