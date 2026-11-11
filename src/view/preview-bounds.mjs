import * as T from "three";

export function visibleModelBounds(model) {
  model.updateMatrixWorld(true);
  const bounds = new T.Box3(),
    point = new T.Vector3();
  model.traverse((object) => {
    if (!object.isMesh) return;
    for (let parent = object; parent; parent = parent.parent)
      if (!parent.visible) return;
    object.skeleton?.update();
    for (let i = 0; i < object.geometry.attributes.position.count; i++) {
      object.getVertexPosition(i, point);
      bounds.expandByPoint(point.applyMatrix4(object.matrixWorld));
    }
  });
  return bounds;
}

// Called on pose selection, never each render frame. Sample at 30 Hz and at
// exact track keys to include fast swings and detached-bone excursions.
// Caller restarts its chosen action after sampling this isolated preview model.
export function animationPreviewBounds(model, mixer, clip) {
  if (!clip) return visibleModelBounds(model);
  const bounds = new T.Box3();
  mixer.stopAllAction();
  const action = mixer.clipAction(clip);
  action.reset().setLoop(T.LoopOnce, 1).play();
  action.clampWhenFinished = true;
  const steps = Math.max(1, Math.ceil(clip.duration * 30));
  const times = new Set();
  for (let step = 0; step <= steps; step++)
    times.add((clip.duration * step) / steps);
  for (const track of clip.tracks)
    for (const time of track.times)
      if (time >= 0 && time <= clip.duration) times.add(time);
  for (const time of [...times].sort((a, b) => a - b)) {
    mixer.setTime(time);
    bounds.union(visibleModelBounds(model));
  }
  return bounds;
}
