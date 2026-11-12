import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { resolveApprovedCreatureAssets } from "../scripts/approved-creature-assets.mjs";
import {
  startCreature,
  reviseCreature,
  validateQueue,
  GATES,
} from "../scripts/creature-production.mjs";
import { CREATURE_ROSTER } from "../src/core/creature-roster.mjs";
const approved = JSON.parse(
  fs.readFileSync(
    new URL("../config/approved-creature-assets.json", import.meta.url),
  ),
);
const queue = JSON.parse(
  fs.readFileSync(
    new URL("../docs/creature-production/queue.json", import.meta.url),
  ),
);
test("reviewed equipped paths override legacy names while missing private assets retain fallbacks", async () => {
  const source = fs.readFileSync(
    new URL("../src/core/creature-roster.mjs", import.meta.url),
    "utf8",
  );
  const replacement = {
    "creature-hobgoblin-shieldguard": {
      model: "HobgoblinShieldguard",
      path: "/assets/licensed/creatures/HobgoblinShieldguard.glb",
    },
  };
  const load = (entries) =>
    import(
      `data:text/javascript;base64,${Buffer.from(
        `const __EQUIPPED_CREATURES__ = ${JSON.stringify(entries)};\n${source}`,
      ).toString("base64")}`
    );
  const approved = await load(replacement);
  assert.equal(
    approved.CREATURE_MODELS.HobgoblinShieldguard,
    replacement["creature-hobgoblin-shieldguard"].path,
  );
  const fallback = await load({});
  assert.equal(
    fallback.CREATURE_MODELS.HobgoblinShieldguard,
    "/assets/creatures/wave-05/HobgoblinShieldguard.glb",
  );
});
test("production queue covers the bestiary and permits only one active creature", () => {
  const q = structuredClone(queue);
  validateQueue(q, Object.keys(CREATURE_ROSTER), approved);
  // Queue behavior must remain testable after the real roster is complete.
  for (const row of q.creatures) {
    row.status = "queued";
    row.gates = {};
    delete row.approvedAsset;
  }
  const [first, second] = q.creatures.toSorted((a, b) => a.order - b.order);
  startCreature(q, first.id);
  assert.throws(() => startCreature(q, second.id), /Finish/);
  assert.equal(q.creatures.filter((c) => c.status === "active").length, 1);
  second.status = "active";
  assert.throws(
    () => validateQueue(q, Object.keys(CREATURE_ROSTER), approved),
    /Only one/,
  );
});
test("integration cannot skip motion/game-view evidence or register an unapproved model", () => {
  const q = structuredClone(queue);
  const row = q.creatures[0];
  row.status = "queued";
  row.gates = {};
  delete row.approvedAsset;
  row.gates.motion = "docs/wolf-pilot.md";
  assert.throws(
    () => validateQueue(q, Object.keys(CREATURE_ROSTER), approved),
    /Out-of-order/,
  );
  row.gates = Object.fromEntries(GATES.map((g) => [g, "docs/wolf-pilot.md"]));
  row.status = "integrated";
  row.approvedAsset = "Unknown";
  assert.throws(
    () => validateQueue(q, Object.keys(CREATURE_ROSTER), approved),
    /lacks evidence/,
  );
});
test("private assets fall back when absent, fail in required builds, and reject changed reviewed bytes", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fld-approved-"));
  try {
    const bytes = Buffer.from("fixture"),
      entry = {
        creatureId: "creature-fixture",
        model: "Fixture",
        path: "/assets/licensed/creatures/Fixture.glb",
        sha256: createHash("sha256").update(bytes).digest("hex"),
      },
      manifest = { assets: [entry] };
    assert.deepEqual(resolveApprovedCreatureAssets(root, manifest), {
      models: {},
      missing: ["Fixture"],
    });
    assert.throws(
      () => resolveApprovedCreatureAssets(root, manifest, { required: true }),
      /Missing/,
    );
    const file = path.join(root, "public", entry.path);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, bytes);
    assert.equal(
      resolveApprovedCreatureAssets(root, manifest).models.Fixture,
      entry.path,
    );
    fs.writeFileSync(file, "different candidate");
    assert.throws(
      () => resolveApprovedCreatureAssets(root, manifest),
      /hash mismatch/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("reopening an integrated creature preserves its prior evidence and requires a fresh visual review", () => {
  const q = structuredClone(queue);
  for (const r of q.creatures) if (r.status === "active") r.status = "queued";
  const r = q.creatures.find((r) => r.status === "integrated"),
    old = { ...r.gates };
  reviseCreature(q, r.id);
  assert.equal(r.status, "active");
  assert.deepEqual(r.gates, { brief: old.brief });
  assert.deepEqual(r.revisions.at(-1).gates, old);
  assert.throws(
    () =>
      reviseCreature(q, q.creatures.find((c) => c.status === "integrated").id),
    /Finish/,
  );
  validateQueue(q, Object.keys(CREATURE_ROSTER), approved);
});
