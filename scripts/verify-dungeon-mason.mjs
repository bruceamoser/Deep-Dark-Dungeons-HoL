import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {
  MASON_OPTIONS,
  MELEE_VARIANTS,
} from "../src/core/mason-appearance.mjs";
const folder = path.resolve(
  import.meta.dirname,
  "../public/assets/licensed/dungeon-mason",
);
const file = path.join(folder, "hero.glb");
if (!fs.existsSync(file))
  throw new Error(
    "Licensed Dungeon Mason assets have not been staged. Run npm run assets:characters with your purchased source files.",
  );
const data = fs.readFileSync(file);
assert.equal(data.toString("ascii", 0, 4), "glTF");
const json = JSON.parse(
  data.subarray(20, 20 + data.readUInt32LE(12)).toString(),
);
const names = new Set(json.nodes.map((n) => n.name));
const options = Object.entries(MASON_OPTIONS)
  .filter(([key]) => !key.endsWith("Type"))
  .flatMap(([, values]) => values);
for (const name of new Set([
  ...options,
  ...Object.values(MELEE_VARIANTS).flatMap((v) => Object.values(v).flat()),
]))
  if (!["auto", "none", "class"].includes(name))
    assert.ok(names.has(name), `Missing character part: ${name}`);
for (const name of [
  "Idle",
  "Walking_A",
  "1H_Melee_Attack_Slice_Diagonal",
  "TwoHandIdle",
  "TwoHandAttack",
  "2H_Ranged_Shoot",
  "Spellcast_Shoot",
])
  assert.ok(
    json.animations.some((a) => a.name === name),
    `Missing animation: ${name}`,
  );
assert.equal(
  json.skins.length,
  1,
  "All character parts must share the same skeleton",
);
const drawMeshes = json.meshes.filter((mesh) =>
  mesh.extras?.targetNames?.includes("Draw"),
);
assert.ok(
  drawMeshes.length >= 5,
  "All five bow variants must preserve authored draw deformation",
);
const coverage = JSON.parse(
  fs.readFileSync(path.join(folder, "tint-coverage.json")),
);
assert.ok(coverage.Head01_Male["9"] > 0, "Male head has skin-mask coverage");
assert.ok(
  coverage.Head02_Female["9"] > 0,
  "Female head has skin-mask coverage",
);
const alignment = JSON.parse(
  fs.readFileSync(path.join(folder, "weapon-alignment.json")),
);
for (const [name, pose] of Object.entries(alignment))
  assert.ok(pose.idleMinimumZ > -0.05, `${name} intersects the floor`);
console.log(
  `Verified ${names.size} named nodes, ${json.animations.length} animations, one shared skin, skin masks and ${Object.keys(alignment).length} weapon grips.`,
);
