import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  CREATURE_ROSTER,
  CREATURE_MODELS,
  HUMANOID_MODELS,
  BOSSES,
} from "../src/core/creature-roster.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");

// Built procedurally in src/view/creatures.mjs rather than loaded from a file.
const PROCEDURAL = new Set(["Rat", "Spider"]);

const modelsInUse = new Set(Object.values(CREATURE_ROSTER).map((r) => r.model));

test("every enemy model is either procedural or backed by a real file", () => {
  const missing = [];
  for (const model of modelsInUse) {
    if (PROCEDURAL.has(model)) continue;
    assert.ok(
      model in CREATURE_MODELS,
      `${model} is cast but has no file mapping`,
    );
    const p = path.join(ROOT, "public", CREATURE_MODELS[model]);
    if (!existsSync(p)) missing.push(`${model} -> ${CREATURE_MODELS[model]}`);
  }
  assert.deepEqual(missing, [], "all mapped model files must exist on disk");
});

test("every roster row uses a known model", () => {
  const unknown = Object.entries(CREATURE_ROSTER)
    .filter(
      ([, r]) => !(r.model in CREATURE_MODELS) && !PROCEDURAL.has(r.model),
    )
    .map(([id, r]) => `${id}=${r.model}`);
  assert.deepEqual(unknown, []);
});

test("KayKit humanoid models are not also routed to the procedural path", () => {
  for (const model of PROCEDURAL) {
    assert.equal(
      HUMANOID_MODELS.has(model),
      false,
      `${model} must not be humanoid`,
    );
  }
  for (const model of HUMANOID_MODELS) {
    assert.ok(model in CREATURE_MODELS, `${model} has no asset mapping`);
    assert.equal(PROCEDURAL.has(model), false);
  }
});

test("the roster casts a wide spread of models rather than reusing a few", () => {
  assert.ok(
    modelsInUse.size >= 20,
    `only ${modelsInUse.size} distinct models used`,
  );
});

test("every roster row carries the fields the renderer reads", () => {
  for (const [id, r] of Object.entries(CREATURE_ROSTER)) {
    assert.ok(typeof r.model === "string" && r.model, `${id} has no model`);
    assert.ok(typeof r.theme === "string" && r.theme, `${id} has no theme`);
    assert.ok(
      Number.isFinite(r.depth) && r.depth >= 1,
      `${id} has a bad depth`,
    );
    assert.ok(typeof r.weapon === "string" && r.weapon, `${id} has no weapon`);
    assert.equal(typeof r.shield, "boolean", `${id} shield flag`);
  }
});

test("bosses reference real roster entries", () => {
  for (const boss of BOSSES)
    assert.ok(boss in CREATURE_ROSTER, `${boss} is not a creature`);
});

test("species casting avoids costumes, robot clay servants and monster-bodied goblin/orc casters", () => {
  assert.equal(CREATURE_ROSTER["creature-plague-zombie"].model, "PlagueZombie");
  assert.equal(CREATURE_ROSTER["creature-crypt-ghoul"].model, "WerewolfMan");
  assert.equal(CREATURE_ROSTER["creature-animated-statue"].model, "AnimatedStatue");
  assert.equal(CREATURE_ROSTER["creature-clay-helper"].model, "ClayHelper");
  assert.equal(
    CREATURE_ROSTER["creature-goblin-rattlechanter"].model,
    "OrcRaider",
  );
  assert.equal(CREATURE_ROSTER["creature-orc-warcaller"].model, "OrcBrute");
});
