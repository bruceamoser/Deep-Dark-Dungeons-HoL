import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { HERO_AVATARS, avatarFor } from "../src/core/hero-avatars.mjs";
import { normalizeAppearance } from "../src/core/identity.mjs";
const root = path.resolve(import.meta.dirname, "..");
test("authored avatar selection validates IDs and preserves legacy identity", () => {
  const legacy = { sex: "female", hair: "braid", skin: "#abcdef" };
  assert.equal(normalizeAppearance(legacy).avatar, "auto");
  assert.equal(
    normalizeAppearance({ ...legacy, avatar: "Cleric" }).hair,
    "braid",
  );
  assert.equal(normalizeAppearance({ avatar: "../../bad" }).avatar, "auto");
  assert.equal(
    avatarFor({ model: "Mage", draft: { appearance: { avatar: "auto" } } }),
    "Mage",
  );
  assert.equal(
    avatarFor({ model: "Mage", draft: { appearance: { avatar: "Cleric" } } }),
    "Cleric",
  );
  for (const a of HERO_AVATARS.filter((a) => a.url))
    assert.ok(existsSync(path.join(root, "public", a.url)), a.url);
});
test("curated held gear dependencies exist and match provenance hashes", () => {
  const base = path.join(root, "public/assets/gear");
  const { files } = JSON.parse(readFileSync(path.join(base, "manifest.json")));
  for (const [file, source] of Object.entries(files)) {
    const data = readFileSync(path.join(base, file));
    assert.equal(
      createHash("sha256").update(data).digest("hex"),
      source.sha256,
      file,
    );
    if (file.endsWith(".gltf"))
      for (const o of [...JSON.parse(data).buffers, ...JSON.parse(data).images])
        if (o.uri && !o.uri.startsWith("data:"))
          assert.ok(
            existsSync(path.resolve(base, path.dirname(file), o.uri)),
            o.uri,
          );
  }
});
