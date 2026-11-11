import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { animationPreviewBounds } from "../src/view/preview-bounds.mjs";

test("preview framing includes a fast detached prop excursion and ignores hidden helpers", () => {
  const model = new T.Group();
  const shield = new T.Mesh(
    new T.BoxGeometry(1, 1, 1),
    new T.MeshBasicMaterial(),
  );
  shield.name = "shield";
  model.add(shield);
  const helper = shield.clone();
  helper.name = "hidden-helper";
  helper.position.x = 100;
  helper.visible = false;
  model.add(helper);
  const clip = new T.AnimationClip("fall", 1, [
    new T.VectorKeyframeTrack(
      "shield.position",
      [0, 11 / 61, 12 / 61, 1],
      [0, 0, 0, 6, 0, 0, 0, 0, 0, 2, 0, 0],
    ),
  ]);
  const bounds = animationPreviewBounds(
    model,
    new T.AnimationMixer(model),
    clip,
  );
  assert.ok(Math.abs(bounds.max.x - 6.5) < 1e-6);
  assert.equal(bounds.min.x, -0.5);
  assert.equal(bounds.max.y, 0.5);
  shield.geometry.dispose();
  shield.material.dispose();
});
