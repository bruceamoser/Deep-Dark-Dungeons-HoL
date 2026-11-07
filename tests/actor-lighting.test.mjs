import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { lightActor } from "../src/view/actor-lighting.mjs";

test("actor light owns its materials without changing another actor or source shader", () => {
  const source = new T.MeshStandardMaterial();
  source.onBeforeCompile = () => {};
  source.customProgramCacheKey = () => "hero-palette";
  const texture = new T.Texture();
  const first = new T.Mesh(new T.BoxGeometry(), source);
  const second = first.clone();
  const a = lightActor(first, texture);
  const b = lightActor(second, texture);
  assert.notEqual(first.material, source);
  assert.notEqual(first.material, second.material);
  assert.equal(first.material.onBeforeCompile, source.onBeforeCompile);
  assert.equal(
    first.material.customProgramCacheKey,
    source.customProgramCacheKey,
  );
  a.setIlluminated(false);
  assert.equal(first.material.envMapIntensity, 0.12);
  assert.equal(second.material.envMapIntensity, 0.38);
  assert.equal(source.envMap, null);
  let disposed = 0,
    textureDisposed = 0;
  first.material.addEventListener("dispose", () => disposed++);
  texture.addEventListener("dispose", () => textureDisposed++);
  a.dispose();
  a.dispose();
  assert.equal(disposed, 1);
  assert.equal(textureDisposed, 0);
  b.dispose();
  first.geometry.dispose();
  source.dispose();
  texture.dispose();
});

test("shared and multi-material meshes retain sharing inside one actor", () => {
  const source = new T.MeshStandardMaterial();
  const glow = new T.MeshBasicMaterial();
  const model = new T.Group();
  const geometry = new T.BoxGeometry();
  model.add(new T.Mesh(geometry, [source, glow]), new T.Mesh(geometry, source));
  const lighting = lightActor(model, new T.Texture());
  assert.equal(model.children[0].material[0], model.children[1].material);
  assert.equal(model.children[0].material[1], glow);
  lighting.dispose();
  geometry.dispose();
  source.dispose();
  glow.dispose();
});
