import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { addMasonBeard } from "../src/view/mason-beards.mjs";
test("fitted beards extend below the chin, follow the scaled head bone and own their disposable resources", () => {
  for (const style of ["BeardShort", "BeardLong"]) {
    const model = new T.Group(),
      head = new T.Mesh(
        new T.BoxGeometry(0.7, 0.63, 0.6),
        new T.MeshStandardMaterial(),
      ),
      bone = new T.Bone(),
      owned = [];
    head.name = "Head01_Male";
    head.position.set(0, 0.99, 0.025);
    bone.name = "head";
    bone.position.set(0, 0.914, 0.013);
    bone.scale.setScalar(0.01);
    bone.rotation.z = Math.PI / 2;
    model.add(head, bone);
    const beard = addMasonBeard(model, head.name, style, "#442211", owned);
    model.updateMatrixWorld(true);
    const bounds = new T.Box3().setFromObject(beard),
      chin = new T.Box3().setFromObject(head).min.y;
    assert.ok(bounds.min.y < chin - 0.04);
    assert.ok(bounds.max.y < 0.95);
    assert.equal(beard.parent, bone);
    const vertex = new T.Vector3().fromBufferAttribute(
        beard.geometry.attributes.position,
        0,
      ),
      before = beard.localToWorld(vertex.clone());
    bone.rotateY(0.25);
    model.updateMatrixWorld(true);
    assert.ok(beard.localToWorld(vertex.clone()).distanceTo(before) > 0.01);
    let disposed = 0;
    for (const resource of owned)
      resource.addEventListener("dispose", () => disposed++);
    owned.forEach((r) => r.dispose());
    assert.equal(disposed, 2);
    assert.equal(head.material.color.getHex(), 0xffffff);
  }
});
