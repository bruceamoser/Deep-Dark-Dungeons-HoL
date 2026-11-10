import * as T from "three";

// A suspended brazier follows the hand's position while gravity keeps its cup
// upright. The authored node uses local +Y up and its origin at the top grip.
export function hangingItemStabilizer(model, name = "HangingBrazier") {
  const item = model.getObjectByName(name);
  if (!item?.parent) return null;
  const parent = new T.Quaternion(),
    heading = new T.Quaternion();
  const rest = item.position.clone(),
    floor = new T.Vector3(),
    offset = new T.Vector3();
  const bounds = new T.Box3();
  return () => {
    item.position.copy(rest);
    model.getWorldQuaternion(heading);
    item.parent.getWorldQuaternion(parent);
    item.quaternion.copy(parent.invert()).multiply(heading);
    item.updateWorldMatrix(false, true);
    // When a hit/death pose lowers the hand to the ground, the rigid cup rests
    // on that ground rather than following the wrist through the floor.
    model.getWorldPosition(floor);
    bounds.setFromObject(item);
    if (bounds.min.y < floor.y + 0.025) {
      item.getWorldPosition(offset);
      offset.y += floor.y + 0.025 - bounds.min.y;
      item.parent.worldToLocal(offset);
      item.position.copy(offset);
      item.updateWorldMatrix(false, true);
    }
  };
}
