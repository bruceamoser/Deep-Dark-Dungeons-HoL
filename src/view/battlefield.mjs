import * as T from "three";
import { SURFACE_COLORS } from "../core/battlefield.mjs";
const TILE = 2.4;
export const battlefieldViewMethods = {
  clearBattlefield() {
    for (const group of [this.battlefieldGroup, this.targetGroup])
      if (group) {
        group.traverse((o) => {
          o.geometry?.dispose();
          o.material?.dispose();
        });
        group.removeFromParent();
      }
    this.battlefieldGroup = null;
    this.targetGroup = null;
    this.battlefieldKey = null;
  },
  syncBattlefield() {
    const signature = JSON.stringify(
      (this.map?.zones ?? []).map((z) => [z.id, z.cells]),
    );
    if (signature === this.battlefieldKey) return;
    this.battlefieldKey = signature;
    if (this.battlefieldGroup) {
      this.battlefieldGroup.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
      this.battlefieldGroup.removeFromParent();
    }
    this.battlefieldGroup = new T.Group();
    this.scene.add(this.battlefieldGroup);
    for (const zone of this.map?.zones ?? [])
      for (const p of zone.cells) {
        const color = SURFACE_COLORS[zone.kind],
          g = new T.Group();
        g.position.set(p.x * TILE, 0.045, p.z * TILE);
        g.userData.cell = p;
        const floor = new T.Mesh(
          new T.PlaneGeometry(TILE * 0.96, TILE * 0.96),
          new T.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: zone.kind === "darkness" ? 0.65 : 0.23,
            depthWrite: false,
            side: T.DoubleSide,
          }),
        );
        floor.rotation.x = -Math.PI / 2;
        g.add(floor);
        const rim = new T.LineSegments(
          new T.EdgesGeometry(new T.PlaneGeometry(TILE * 0.92, TILE * 0.92)),
          new T.LineBasicMaterial({ color, transparent: true, opacity: 0.65 }),
        );
        rim.rotation.x = -Math.PI / 2;
        rim.position.y = 0.01;
        g.add(rim);
        if (zone.kind === "wall") {
          const m = new T.Mesh(
            new T.BoxGeometry(TILE * 0.88, 2.3, TILE * 0.88),
            new T.MeshPhysicalMaterial({
              color,
              roughness: 0.27,
              metalness: 0.15,
              transparent: true,
              opacity: 0.8,
            }),
          );
          m.position.y = 1.15;
          m.castShadow = true;
          g.add(m);
        }
        if (zone.kind === "fire")
          for (let n = 0; n < 5; n++) {
            const m = new T.Mesh(
              new T.ConeGeometry(0.15, 0.65 + (n % 3) * 0.2, 5),
              new T.MeshStandardMaterial({
                color: n % 2 ? 0xffc663 : 0xe9662d,
                emissive: 0xff6a16,
                emissiveIntensity: 2,
                transparent: true,
                opacity: 0.8,
              }),
            );
            m.position.set(
              Math.cos(n * 2.4) * 0.65,
              0.35,
              Math.sin(n * 2.4) * 0.65,
            );
            m.userData.flame = n;
            g.add(m);
          }
        if (zone.kind === "smoke")
          for (let n = 0; n < 3; n++) {
            const m = new T.Mesh(
              new T.IcosahedronGeometry(0.6, 1),
              new T.MeshStandardMaterial({
                color,
                transparent: true,
                opacity: 0.23,
                depthWrite: false,
                roughness: 1,
              }),
            );
            m.position.set(
              Math.cos(n * 2) * 0.4,
              0.6 + n * 0.32,
              Math.sin(n * 2) * 0.4,
            );
            m.scale.set(1.5, 0.65, 1.3);
            m.userData.smoke = n;
            g.add(m);
          }
        if (["light", "healing", "trap"].includes(zone.kind)) {
          const rune = new T.Mesh(
            new T.TorusGeometry(0.65, 0.035, 5, zone.kind === "trap" ? 3 : 6),
            new T.MeshBasicMaterial({ color }),
          );
          rune.rotation.x = Math.PI / 2;
          rune.position.y = 0.04;
          g.add(rune);
        }
        this.battlefieldGroup.add(g);
      }
  },
  showPowerTarget(plan, valid = true) {
    if (this.targetGroup) {
      this.targetGroup.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
      this.targetGroup.removeFromParent();
    }
    this.targetGroup = new T.Group();
    this.scene.add(this.targetGroup);
    for (const p of plan?.cells ?? []) {
      const m = new T.Mesh(
        new T.PlaneGeometry(TILE * 0.91, TILE * 0.91),
        new T.MeshBasicMaterial({
          color: valid ? 0x73d7c7 : 0xe77860,
          transparent: true,
          opacity: 0.3,
          depthWrite: false,
          side: T.DoubleSide,
        }),
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(p.x * TILE, 0.08, p.z * TILE);
      this.targetGroup.add(m);
    }
  },
  animateBattlefield(t, seen) {
    for (const g of this.battlefieldGroup?.children ?? []) {
      g.visible = !!seen?.[`${g.userData.cell.x},${g.userData.cell.z}`];
      for (const o of g.children) {
        if (o.userData.flame !== undefined) {
          o.scale.y = 0.8 + Math.sin(t * 7 + o.userData.flame) * 0.2;
          o.rotation.y = t * 0.4;
        }
        if (o.userData.smoke !== undefined)
          o.rotation.y = t * 0.2 + o.userData.smoke;
      }
    }
  },
};
