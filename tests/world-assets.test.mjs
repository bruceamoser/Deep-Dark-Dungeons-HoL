import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  WORLD_MODELS,
  roomArt,
  roomDressing,
} from "../src/view/world-assets.mjs";
const root = path.resolve(import.meta.dirname, "../public");
test("world models have all runtime dependencies and recorded source hashes", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, "assets/world/manifest.json")),
  );
  const recorded = new Map(manifest.files.map((f) => [f.file, f]));
  for (const url of Object.values(WORLD_MODELS)) {
    const file = path.join(root, url),
      j = JSON.parse(fs.readFileSync(file));
    for (const entry of [
      file,
      ...["buffers", "images"].flatMap((k) =>
        (j[k] ?? [])
          .filter((o) => o.uri && !o.uri.startsWith("data:"))
          .map((o) => path.resolve(path.dirname(file), o.uri)),
      ),
    ]) {
      // Manifest keys are URL-style paths on every platform.
      const relative = path
        .relative(path.join(root, "assets/world"), entry)
        .split(path.sep)
        .join("/");
      assert.ok(recorded.has(relative), relative);
      assert.equal(
        crypto
          .createHash("sha256")
          .update(fs.readFileSync(entry))
          .digest("hex"),
        recorded.get(relative).sha256,
        relative,
      );
    }
  }
});
test("room dressing only occupies blocked cells and uses all four coherent styles", () => {
  const room = { x: 3, z: 7, w: 9, h: 8, cx: 7, cz: 11 };
  const obstacles = { "3,11": true, "11,8": true, "10,8": true },
    styles = new Set();
  for (let seed = 0; seed < 8; seed++) {
    const map = { seed, depth: 1, obstacles };
    styles.add(roomArt(map, room).name);
    assert.deepEqual(roomArt(map, room), roomArt(map, room));
    for (const p of roomDressing(map, room)) {
      assert.ok(obstacles[`${p.x},${p.z}`]);
      assert.ok(WORLD_MODELS[p.name]);
    }
    assert.deepEqual(roomDressing({ ...map, obstacles: {} }, room), []);
  }
  assert.equal(styles.size, 4);
});
