import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createSaveStorage } from "../desktop/save-storage.cjs";
import { SaveLibrary } from "../src/core/save-library.mjs";
import { serialize, deserialize } from "../src/core/save.mjs";
function fixture(depth = 1) {
  return serialize({
    seed: 123,
    depth,
    bank: depth * 10,
    memorial: [],
    caches: [],
    mode: "exploration",
    party: Array.from({ length: 4 }, (_, i) => ({
      id: `hero-${i}`,
      name: `Hero ${i}`,
      draft: {},
      x: 1,
      z: 1,
      wounds: [],
      survival: { hp: 10 },
    })),
    floor: {
      map: { tiles: { "1,1": { x: 1, z: 1 } }, rooms: [] },
      enemies: [],
    },
  });
}
async function disk(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hol-slots-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return { dir, storage: createSaveStorage(dir) };
}
test("legacy campaign is copied once, retained byte-for-byte, and inactive library survives restart", async (t) => {
  const { dir, storage } = await disk(t);
  const original = fixture(3);
  await fs.writeFile(path.join(dir, "campaign.json"), original);
  const lib = new SaveLibrary(storage);
  const id = await lib.initialize();
  assert.equal(await lib.read(id), original);
  await lib.write(id, fixture(4));
  assert.equal(
    await fs.readFile(path.join(dir, "campaign.json"), "utf8"),
    original,
  );
  await lib.activate(null);
  const reopened = new SaveLibrary(storage);
  assert.equal(await reopened.initialize(), null);
  assert.equal((await reopened.list()).length, 1);
  assert.equal(deserialize(await reopened.read(id)).depth, 4);
});
test("independent run slots and copies survive concurrent writes and restart", async (t) => {
  const { storage } = await disk(t);
  const lib = new SaveLibrary(storage);
  await lib.initialize();
  const a = await lib.create("Ember company", fixture(1));
  const b = await lib.create("Before the guardian", fixture(5), false);
  assert.equal(lib.active, a);
  await Promise.all([
    lib.write(a, fixture(2)),
    lib.rename(a, "Cinder company"),
    lib.write(a, fixture(3)),
  ]);
  assert.equal(deserialize(await lib.read(b)).depth, 5);
  assert.equal(deserialize(await lib.read(a)).depth, 3);
  assert.equal(
    (await lib.list()).find((s) => s.id === a).name,
    "Cinder company",
  );
  await lib.activate(b);
  const reopened = new SaveLibrary(storage);
  assert.equal(await reopened.initialize(), b);
  assert.equal((await reopened.list()).length, 2);
  await assert.rejects(lib.remove(b), /Exit this run/);
  await lib.activate(null);
  await lib.remove(b);
  assert.equal((await lib.list()).length, 1);
});
test("invalid paths, broken saves and failed writes cannot replace another valid slot", async (t) => {
  const { storage, dir } = await disk(t);
  const lib = new SaveLibrary(storage);
  const a = await lib.create("Safe", fixture(2));
  assert.throws(() => lib.write(a, "{}"), /supported/);
  await assert.rejects(storage.set("../campaign", "{}"), /Invalid save key/);
  await assert.rejects(storage.set("legacy", "{}"), /Invalid save/);
  await assert.rejects(storage.get("../../secret"), /Invalid save key/);
  await fs.writeFile(
    path.join(dir, "runs", `run-${crypto.randomUUID()}.json`),
    "bad",
  );
  assert.equal((await lib.list()).filter((s) => s.invalid).length, 1);
  assert.equal(deserialize(await lib.read(a)).depth, 2);
  await lib.write(a, fixture(4));
  assert.equal(deserialize(await lib.read(a)).depth, 4);
});
test("confirmed active-run deletion clears selection, preserves other runs, and survives restart", async (t) => {
  const { storage } = await disk(t),
    lib = new SaveLibrary(storage);
  const a = await lib.create("Delete me", fixture(2)),
    b = await lib.create("Keep me", fixture(5), false);
  await lib.remove(a, { allowActive: true });
  assert.equal(lib.active, null);
  assert.equal((await lib.list()).length, 1);
  assert.equal(deserialize(await lib.read(b)).depth, 5);
  const reopened = new SaveLibrary(storage);
  assert.equal(await reopened.initialize(), null);
  assert.equal((await reopened.list())[0].id, b);
});
test("a failed deletion restores active-run selection", async (t) => {
  const { storage } = await disk(t),
    lib = new SaveLibrary(storage);
  const id = await lib.create("Retain", fixture());
  const remove = storage.remove;
  storage.remove = async () => {
    throw new Error("disk failure");
  };
  await assert.rejects(lib.remove(id, { allowActive: true }), /disk failure/);
  assert.equal(lib.active, id);
  assert.equal(JSON.parse(await storage.get("index")).active, id);
  storage.remove = remove;
});

test("deleting the last migrated run leaves an empty library on restart", async (t) => {
  const { storage, dir } = await disk(t);
  await fs.writeFile(path.join(dir, "campaign.json"), fixture(9));
  const lib = new SaveLibrary(storage);
  const id = await lib.initialize();
  await lib.remove(id, { allowActive: true });
  const reopened = new SaveLibrary(storage);
  assert.equal(await reopened.initialize(), null);
  assert.deepEqual(await reopened.list(), []);
  assert.equal(reopened.firstLaunch, false);
});

test("earlier-edition slots remain byte-for-byte intact while a fresh forge journey is created", async (t) => {
  const { storage } = await disk(t),
    id = `run-${crypto.randomUUID()}`;
  const old = JSON.parse(fixture(5));
  old.version = 1;
  const raw = JSON.stringify({
    id,
    name: "Old company",
    updatedAt: "2026-11-05T12:00:00Z",
    text: JSON.stringify(old),
  });
  await storage.set(id, raw);
  await storage.set("index", JSON.stringify({ active: id }));
  const lib = new SaveLibrary(storage);
  assert.equal(await lib.initialize(), null);
  assert.deepEqual((await lib.list())[0], {
    id,
    name: "Old company",
    updatedAt: "2026-11-05T12:00:00Z",
    invalid: true,
    incompatible: true,
  });
  await assert.rejects(lib.read(id), /supported/);
  await assert.rejects(lib.write(id, fixture()), /preserved/);
  const freshId = await lib.create("Forge company", fixture());
  assert.notEqual(freshId, id);
  assert.equal(await storage.get(id), raw);
  assert.equal((await lib.list()).length, 2);
});
test("an incompatible legacy campaign file is never imported over or deleted", async (t) => {
  const { dir, storage } = await disk(t),
    old = JSON.parse(fixture());
  old.version = 1;
  const raw = JSON.stringify(old);
  await fs.writeFile(path.join(dir, "campaign.json"), raw);
  const lib = new SaveLibrary(storage);
  assert.equal(await lib.initialize(), null);
  assert.equal(lib.incompatibleLegacy, true);
  await lib.create("First forge company", fixture());
  assert.equal(await fs.readFile(path.join(dir, "campaign.json"), "utf8"), raw);
});
