import * as T from "three";
import { equipmentAppearance } from "./appearance.mjs";
// One reusable offscreen renderer; portraits follow the actual equipped hero.
export class HudArt {
  constructor(assets, buildings) {
    this.assets = assets;
    this.buildings = buildings;
    this.cache = new Map();
    this.renderer = new T.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(160, 160);
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.scene = new T.Scene();
    this.scene.add(new T.HemisphereLight(0xe4efff, 0x53402b, 3));
    const sun = new T.DirectionalLight(0xffdfab, 4);
    sun.position.set(3, 5, 6);
    this.scene.add(sun);
  }
  capture(model, portrait = false) {
    this.scene.add(model);
    model.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(model),
      center = box.getCenter(new T.Vector3());
    const size = box.getSize(new T.Vector3());
    const extent = Math.max(size.x, size.y, size.z, 0.1);
    const camera = new T.PerspectiveCamera(32, 1, 0.01, 500);
    if (portrait) {
      const height = model.userData.height ?? size.y;
      let head;
      model.traverse((o) => {
        if (!head && o.isBone && /^head$/i.test(o.name)) head = o;
      });
      if (head) {
        head.getWorldPosition(center);
        center.y -= height * 0.12;
      } else
        center.set(
          model.position.x,
          model.position.y + height * 0.74,
          model.position.z,
        );
      camera.position.set(
        center.x + height * 0.12,
        center.y + height * 0.03,
        center.z + height * 0.95,
      );
    } else
      camera.position
        .copy(center)
        .add(new T.Vector3(extent * 1.7, extent * 1.25, extent * 2));
    camera.lookAt(center);
    this.renderer.render(this.scene, camera);
    const url = this.renderer.domElement.toDataURL("image/png");
    this.scene.remove(model);
    return url;
  }
  building(service) {
    const key = "building:" + service.model;
    if (!this.cache.has(key))
      this.cache.set(
        key,
        this.capture(this.buildings.get(service.model).clone(true)),
      );
    return this.cache.get(key);
  }
  portrait(hero) {
    const key = JSON.stringify([
      hero.heroId,
      hero.model,
      hero.draft.appearance,
      hero.preview.inventory.items.map((i) => [
        i.catalogId,
        i.held,
        i.worn,
        i.carried,
      ]),
      hero.treasure,
    ]);
    if (!this.cache.has(key)) {
      const out = equipmentAppearance(this.assets, hero);
      const mixer = new T.AnimationMixer(out.model);
      const idle = out.clips.find((clip) => clip.name === "Idle");
      if (idle) {
        mixer.clipAction(idle).play();
        mixer.update(0.1);
      }
      try {
        this.cache.set(key, this.capture(out.model, true));
      } finally {
        mixer.stopAllAction();
        mixer.uncacheRoot(out.model);
        out.model.userData.dispose?.();
        out.model.traverse((o) => {
          if (o.isSkinnedMesh) o.skeleton.dispose();
        });
      }
      if (this.cache.size > 80)
        this.cache.delete(this.cache.keys().next().value);
    }
    return this.cache.get(key);
  }
}
