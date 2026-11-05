import * as T from "three";
export const CONDITION_VISUALS = [
  "burning",
  "freezing",
  "bleeding",
  "poisoned",
  "dazed",
  "frightened",
  "slowed",
  "grappled",
  "blinded",
  "deafened",
  "asleep",
  "paralyzed",
  "unconscious",
  "petrified",
  "prone",
  "hidden",
  "invisible",
];
const starShape = () => {
  const s = new T.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.045 : 0.105,
      a = (i * Math.PI) / 5;
    const x = Math.sin(a) * r,
      y = Math.cos(a) * r;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  s.closePath();
  return s;
};
export function conditionVisuals(parent, height = 1.8) {
  const active = new Map();
  let signature = "";
  const make = (key) => {
    const group = new T.Group(),
      parts = [],
      owned = [];
    group.name = `Condition ${key}`;
    group.userData.condition = key;
    parent.add(group);
    const mesh = (geo, color, opacity = 1) => {
      const material = new T.MeshBasicMaterial({
          color,
          transparent: true,
          opacity,
          depthWrite: false,
          side: T.DoubleSide,
        }),
        m = new T.Mesh(geo, material);
      group.add(m);
      parts.push(m);
      owned.push(geo, material);
      return m;
    };
    const ring = (radius, color, y) => {
      const m = mesh(new T.TorusGeometry(radius, 0.013, 4, 48), color, 0.75);
      m.rotation.x = Math.PI / 2;
      m.position.y = y;
      return m;
    };
    if (key === "burning")
      for (let i = 0; i < 10; i++) {
        const m = mesh(
          new T.ConeGeometry(0.075, 0.48, 5),
          i % 2 ? 0xffbd45 : 0xf05a24,
          0.8,
        );
        m.userData.phase = i / 10;
      }
    else if (key === "freezing")
      for (let i = 0; i < 10; i++) {
        const m = mesh(new T.OctahedronGeometry(0.11, 0), 0x8edcf4, 0.8);
        m.position.set(
          Math.sin(i * 2.4) * 0.42,
          0.12,
          Math.cos(i * 2.4) * 0.42,
        );
        m.scale.y = 1.7 + (i % 3) * 0.5;
        m.rotation.z = ((i % 3) - 1) * 0.35;
      }
    else if (key === "dazed")
      for (let i = 0; i < 4; i++) {
        const m = mesh(new T.ShapeGeometry(starShape()), 0xffd35b);
        m.userData.phase = (i * Math.PI) / 2;
      }
    else if (key === "bleeding")
      for (let i = 0; i < 5; i++) {
        const m = mesh(new T.ConeGeometry(0.032, 0.12, 5), 0xb7242f, 0.9);
        m.rotation.z = Math.PI;
        m.userData.phase = i / 5;
      }
    else if (key === "poisoned")
      for (let i = 0; i < 6; i++) {
        const m = ring(0.19 + i * 0.025, 0x83c94e, 0.35 + i * 0.12);
        m.userData.phase = i / 6;
      }
    else if (key === "asleep" || key === "unconscious") {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      ctx.font = "bold 48px Georgia";
      ctx.fillStyle = "#bbd6f5";
      ctx.fillText("Z", 12, 50);
      const texture = new T.CanvasTexture(canvas);
      owned.push(texture);
      for (let i = 0; i < 3; i++) {
        const material = new T.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
          }),
          m = new T.Sprite(material);
        m.scale.setScalar(0.2 + i * 0.08);
        group.add(m);
        parts.push(m);
        owned.push(material);
      }
    } else if (key === "blinded") {
      const m = mesh(new T.BoxGeometry(0.48, 0.12, 0.02), 0x242438, 0.9);
      m.position.set(0, height - 0.25, 0.24);
    } else if (key === "deafened") {
      for (const side of [-1, 1]) {
        const m = ring(0.09, 0xe28c8a, height - 0.25);
        m.rotation.x = 0;
        m.position.x = side * 0.32;
      }
    } else if (key === "frightened") {
      for (let i = 0; i < 3; i++) {
        const m = mesh(new T.ConeGeometry(0.045, 0.23, 3), 0xc7a1e1, 0.8);
        m.position.set((i - 1) * 0.2, height + 0.18, 0);
      }
    } else if (key === "petrified") {
      const m = mesh(
        new T.CylinderGeometry(0.34, 0.5, height, 8, true),
        0xa5a49a,
        0.3,
      );
      m.position.y = height / 2;
    } else if (key === "prone") {
      ring(0.5, 0xc7a477, 0.04);
    } else if (key === "invisible" || key === "hidden") {
      for (let i = 0; i < 3; i++)
        ring(0.35 + i * 0.05, 0x8b96c5, 0.3 + i * 0.4);
    } else {
      for (let i = 0; i < 3; i++)
        ring(
          0.4 - i * 0.05,
          key === "paralyzed"
            ? 0xe6cf91
            : key === "grappled"
              ? 0xcc9a72
              : 0x9793da,
          0.12 + i * 0.28,
        );
    }
    return {
      group,
      parts,
      key,
      dispose() {
        parent.remove(group);
        owned.forEach((r) => r.dispose());
      },
    };
  };
  return {
    active,
    sync(conditions, alive = true) {
      const keys = alive
        ? [
            ...new Set(
              conditions.filter((c) => c.rating > 0).map((c) => c.key),
            ),
          ].filter((k) => CONDITION_VISUALS.includes(k))
        : [];
      const next = keys.sort().join(",");
      if (next === signature) return;
      signature = next;
      for (const [key, effect] of active)
        if (!keys.includes(key)) {
          effect.dispose();
          active.delete(key);
        }
      for (const key of keys) if (!active.has(key)) active.set(key, make(key));
    },
    update(time, camera) {
      for (const { key, parts, group } of active.values()) {
        parts.forEach((m, i) => {
          if (key === "burning") {
            const t = (time * 0.9 + m.userData.phase) % 1,
              a = i * 2.4;
            m.position.set(
              Math.sin(a) * (0.38 + t * 0.1),
              0.2 + t * height * 0.75,
              Math.cos(a) * 0.38,
            );
            m.scale.set(
              1 - t * 0.5,
              0.8 + Math.sin(time * 9 + i) * 0.25,
              1 - t * 0.5,
            );
            m.material.opacity = 0.8 * (1 - t);
          } else if (key === "dazed") {
            const a = time * 2 + m.userData.phase;
            m.position.set(
              Math.sin(a) * 0.43,
              height + 0.2 + Math.sin(time * 3 + i) * 0.04,
              Math.cos(a) * 0.43,
            );
            const q = parent.getWorldQuaternion(new T.Quaternion()).invert();
            m.quaternion.copy(q.multiply(camera.quaternion));
          } else if (key === "bleeding") {
            const t = (time * 0.7 + m.userData.phase) % 1;
            m.position.set(
              Math.sin(i * 2.4) * 0.28,
              0.6 * (1 - t),
              Math.cos(i * 2.4) * 0.28,
            );
            m.material.opacity = 1 - t;
          } else if (key === "poisoned") {
            const t = (time * 0.35 + m.userData.phase) % 1;
            m.position.y = 0.2 + t * height * 0.7;
            m.scale.setScalar(0.6 + t);
            m.material.opacity = 0.45 * (1 - t);
            m.position.x = Math.sin(time + i) * 0.16;
          } else if (key === "asleep" || key === "unconscious")
            m.position.set(
              0.08 + i * 0.15,
              height + 0.1 + i * 0.2 + Math.sin(time + i) * 0.05,
              0,
            );
          else if (key === "frightened") {
            m.rotation.z = Math.sin(time * 13 + i) * 0.2;
            m.material.opacity = 0.5 + Math.sin(time * 7) * 0.25;
          }
        });
        if (["slowed", "grappled", "paralyzed"].includes(key))
          group.rotation.y = time * 0.35;
      }
    },
    dispose() {
      for (const e of active.values()) e.dispose();
      active.clear();
    },
  };
}
