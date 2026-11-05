import * as T from "three";

const UP = new T.Vector3(0, 1, 0);
const v = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
const glow = (color, opacity = 1) =>
  new T.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: T.DoubleSide,
    blending: T.AdditiveBlending,
  });

// Each attack owns its temporary geometry/materials. Loaded arrow geometry and
// textures remain shared with the asset cache and must never be disposed here.
function resources() {
  const geometries = new Set(),
    materials = new Set();
  return {
    mesh(geometry, material) {
      geometries.add(geometry);
      materials.add(material);
      return new T.Mesh(geometry, material);
    },
    geometry(geometry) {
      geometries.add(geometry);
      return geometry;
    },
    material(material) {
      materials.add(material);
      return material;
    },
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    },
  };
}

function bladeRibbon(owned) {
  const geometry = new T.BufferGeometry();
  const positions = new Float32Array(32 * 6 * 3),
    colors = new Float32Array(positions.length);
  geometry.setAttribute(
    "position",
    new T.BufferAttribute(positions, 3).setUsage(T.DynamicDrawUsage),
  );
  geometry.setAttribute(
    "color",
    new T.BufferAttribute(colors, 3).setUsage(T.DynamicDrawUsage),
  );
  geometry.setDrawRange(0, 0);
  const material = glow(0xffe7b7, 0.48);
  material.vertexColors = true;
  const mesh = owned.mesh(geometry, material);
  mesh.name = "Blade motion ribbon";
  mesh.frustumCulled = false;
  const history = [];
  return {
    mesh,
    sample(time, base, tip) {
      history.push({ time, base, tip });
    },
    update(time) {
      while (
        history.length &&
        (time - history[0].time > 0.16 || history.length > 32)
      )
        history.shift();
      let n = 0;
      const put = (p, intensity) => {
        p.toArray(positions, n * 3);
        colors.fill(intensity, n * 3, n * 3 + 3);
        n++;
      };
      for (let i = 1; i < history.length; i++) {
        const a = history[i - 1],
          b = history[i],
          fadeA = Math.max(0, 1 - (time - a.time) / 0.16),
          fadeB = Math.max(0, 1 - (time - b.time) / 0.16);
        put(a.base, fadeA * 0.12);
        put(a.tip, fadeA);
        put(b.tip, fadeB);
        put(a.base, fadeA * 0.12);
        put(b.tip, fadeB);
        put(b.base, fadeB * 0.12);
      }
      geometry.setDrawRange(0, n);
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
    },
  };
}

function impactBurst(owned, color, kind) {
  const group = new T.Group();
  group.name = `${kind} impact`;
  const particles = [];
  const count = kind === "cold" ? 11 : kind === "life" ? 12 : 9;
  for (let i = 0; i < count; i++) {
    const angle = i * 2.399963,
      spread = 0.7 + (i % 3) * 0.3;
    const mesh = owned.mesh(
      kind === "cold" || kind === "life"
        ? new T.OctahedronGeometry(0.045, 0)
        : new T.ConeGeometry(0.016, 0.18, 3),
      glow(color, 0),
    );
    mesh.scale.set(1, kind === "life" ? 2 : 1, 1);
    const velocity = v(
      Math.cos(angle) * spread,
      0.5 + (i % 4) * 0.25,
      Math.sin(angle) * spread,
    );
    mesh.quaternion.setFromUnitVectors(UP, velocity.clone().normalize());
    group.add(mesh);
    particles.push({ mesh, velocity });
  }
  group.visible = false;
  return {
    group,
    update(t) {
      group.visible = t >= 0 && t < 0.38;
      if (!group.visible) return;
      const fade = Math.max(0, 1 - t / 0.38);
      for (const { mesh, velocity } of particles) {
        mesh.position.copy(velocity).multiplyScalar(t * 2);
        mesh.position.y -= (kind === "life" ? -1 : 3) * t * t;
        mesh.material.opacity = fade;
      }
    },
  };
}

function magicMissile(owned, kind) {
  const group = new T.Group();
  group.name =
    kind === "cold"
      ? "Flying ice lance"
      : kind === "life"
        ? "Living light ribbons"
        : "Flying ember lance";
  const color =
    kind === "cold" ? 0x91dfff : kind === "life" ? 0x82e8ba : 0xffa54d;
  if (kind !== "life") {
    const core = owned.mesh(new T.OctahedronGeometry(1, 0), glow(color));
    core.scale.set(kind === "cold" ? 0.12 : 0.09, 0.55, 0.12);
    group.add(core);
    for (let i = 0; i < 3; i++) {
      const shard = owned.mesh(
        new T.OctahedronGeometry(1, 0),
        glow(color, 0.6),
      );
      shard.scale.set(0.035, 0.24, 0.035);
      shard.position.set(
        Math.cos(i * 2.1) * 0.16,
        -0.24 - i * 0.12,
        Math.sin(i * 2.1) * 0.16,
      );
      group.add(shard);
    }
  }
  // Tapered double helix: fire wakes, frost filaments or restorative ribbons.
  for (let strand = 0; strand < 2; strand++) {
    const points = [];
    for (let i = 0; i <= 18; i++) {
      const t = i / 18,
        a = t * Math.PI * 2 + strand * Math.PI,
        r = (1 - t) * 0.18;
      points.push(v(Math.cos(a) * r, t * 0.95 - 0.8, Math.sin(a) * r));
    }
    group.add(
      owned.mesh(
        new T.TubeGeometry(new T.CatmullRomCurve3(points), 24, 0.018, 4, false),
        glow(color, 0.65),
      ),
    );
  }
  return { group, color };
}

export function attackPresentation(from, data) {
  const items = from.data.preview?.inventory.items ?? [];
  const melee = items.find(
    (i) => i.carried && i.held && i.catalogId === "item-ordinary-melee-weapon",
  );
  if (data.spell)
    return {
      kind: data.element ?? "fire",
      clip: "Spellcast_Shoot",
      release: 0.3,
    };
  if (data.ranged)
    return { kind: "arrow", clip: "2H_Ranged_Shoot", release: 0.28 };
  if (data.ability === "ability-rim-strike")
    return { kind: "shield", clip: "Block_Attack", contact: 0.43 };
  if (data.ability === "ability-basic-unarmed" || (!melee && !from.isEnemy))
    return {
      kind: "unarmed",
      clip: "Unarmed_Melee_Attack_Punch_A",
      contact: 0.48,
    };
  return {
    kind: "sword",
    clip:
      melee?.hands === 2
        ? "2H_Melee_Attack_Slice"
        : "1H_Melee_Attack_Slice_Diagonal",
    contact: melee?.hands === 2 ? 0.44 : 0.4,
  };
}

export function createAttackEffect(host, data, callbacks = {}) {
  const from = host.entities.get(data.attacker),
    to = host.entities.get(data.target);
  if (!from || !to) return null;
  const spec = attackPresentation(from, data),
    owned = resources(),
    root = new T.Group();
  root.name = `${spec.kind} attack`;
  const direction = to.group.position
    .clone()
    .sub(from.group.position)
    .setY(0)
    .normalize();
  if (direction.lengthSq())
    from.group.rotation.y = Math.atan2(direction.x, direction.z);
  host.animate(data.attacker, spec.clip, true);
  from.group.updateMatrixWorld(true);
  const end = to.group.position
    .clone()
    .add(v(0, 1.05, 0))
    .addScaledVector(direction, -0.23);
  let start, projectile, ribbon, weapon;
  const isProjectile = !!(data.spell || data.ranged);
  const restingPosition = from.model.position.clone();
  const lunge = isProjectile
    ? 0
    : Math.min(
        0.85,
        Math.max(
          0,
          from.group.position.distanceTo(to.group.position) -
            (spec.kind === "sword" ? 1.85 : 1.5),
        ),
      );
  if (spec.kind === "arrow") {
    projectile = host.assets.get("arrow").scene.clone(true);
    projectile.name = "Flying arrow · shaft, head and fletching";
    // KayKit arrow points down local Y; flip it so +Y follows the flight tangent.
    const wrapper = new T.Group();
    projectile.rotation.z = Math.PI;
    projectile.scale.setScalar(1.65);
    projectile.traverse((o) => {
      if (!o.isMesh) return;
      o.material = owned.material(o.material.clone());
      o.material.transparent = true;
      o.material.emissive.setHex(0x463626);
      o.material.emissiveIntensity = 0.4;
    });
    wrapper.add(projectile);
    projectile = wrapper;
    projectile.name = "Arrow flight";
  } else if (isProjectile) projectile = magicMissile(owned, spec.kind).group;
  if (projectile) root.add(projectile);
  if (spec.kind === "sword") {
    weapon = from.model.getObjectByName("Readied melee weapon");
    ribbon = bladeRibbon(owned);
    root.add(ribbon.mesh);
  }
  const bow = from.model.getObjectByName("Readied bow");
  const bowRotation = bow?.quaternion.clone();
  const bowString =
    spec.kind === "arrow" ? bow?.children.find((o) => o.isLine) : null;
  const stringWasVisible = bowString?.visible;
  let drawnString;
  if (bowString) {
    bowString.visible = false;
    drawnString = new T.Line(
      owned.geometry(new T.BufferGeometry().setFromPoints([v(), v(), v()])),
      owned.material(new T.LineBasicMaterial({ color: 0xe5d6b8 })),
    );
    drawnString.name = "Drawn bowstring";
    drawnString.frustumCulled = false;
    root.add(drawnString);
  }
  const drawTension = (age) =>
    age < spec.release
      ? Math.min(1, age / 0.2)
      : Math.exp(-(age - spec.release) * 38);
  const aimBow = (age) => {
    if (spec.kind !== "arrow" || !bow) return;
    // The bundled two-hand shot is crossbow-oriented. Keep this recurve upright
    // while aiming, then return to its normal hand-relative carrying pose.
    if (age < 0.8 && direction.lengthSq()) {
      bow.parent.updateWorldMatrix(true, false);
      const world = new T.Quaternion().setFromRotationMatrix(
        new T.Matrix4().makeBasis(direction, UP, direction.clone().cross(UP)),
      );
      bow.quaternion.copy(
        bow.parent
          .getWorldQuaternion(new T.Quaternion())
          .invert()
          .multiply(world),
      );
    } else bow.quaternion.copy(bowRotation);
    bow.updateWorldMatrix(true, false);
    if (drawnString) {
      const tension = drawTension(age);
      const points = [
        v(-0.12, 0.75),
        v(-0.12 - tension * 0.38, 0),
        v(-0.12, -0.75),
      ];
      const positions = drawnString.geometry.attributes.position;
      points.forEach((p, i) => {
        bow.localToWorld(p);
        positions.setXYZ(i, p.x, p.y, p.z);
      });
      positions.needsUpdate = true;
    }
  };
  aimBow(0);
  const hand =
    from.model.getObjectByName("handslotr") ??
    from.model.getObjectByName("handslot.r");
  const launchPoint = (age = spec.release) => {
    from.group.updateMatrixWorld(true);
    if (spec.kind === "arrow" && bow) {
      // The nock follows the drawn string; the loaded shaft is 0.603 units
      // from its centre to the feathered tail after the display scale.
      const nock = bow.localToWorld(v(-0.12 - drawTension(age) * 0.38, 0, 0));
      return nock.addScaledVector(end.clone().sub(nock).normalize(), 0.603);
    }
    return (
      hand
        ? hand.getWorldPosition(v())
        : from.group.position.clone().add(v(0, 1.2, 0))
    ).addScaledVector(direction, 0.15);
  };
  start = launchPoint();
  const flight = isProjectile
    ? T.MathUtils.clamp(start.distanceTo(end) / 22, 0.2, 0.85)
    : 0;
  const contact = isProjectile ? spec.release + flight : spec.contact;
  const color =
    spec.kind === "cold"
      ? 0xa3e4ff
      : spec.kind === "life"
        ? 0x91e6ba
        : data.spell
          ? 0xffa153
          : 0xffda96;
  const burst = impactBurst(owned, color, spec.kind);
  burst.group.position.copy(end);
  root.add(burst.group);
  host.scene.add(root);
  to.pendingImpacts = (to.pendingImpacts ?? 0) + 1;
  // Damage is already resolved by HoL. Hold only its presentation until contact.
  if (to.isEnemy) to.group.visible = true;
  let impacted = false,
    released = false,
    disposed = false;
  const effect = {
    kind: spec.kind,
    root,
    projectile,
    age: 0,
    contact,
    flight,
    release: spec.release,
    get impacted() {
      return impacted;
    },
    update(dt) {
      effect.age += dt;
      const age = effect.age;
      if (lunge) {
        const phase =
          age < contact
            ? (age - 0.16) / (contact - 0.16)
            : 1 - (age - contact) / 0.42;
        const eased = T.MathUtils.smoothstep(
          T.MathUtils.clamp(phase, 0, 1),
          0,
          1,
        );
        from.model.position.copy(restingPosition).add(v(0, 0, lunge * eased));
      }
      aimBow(age);
      if (!released && age >= (spec.release ?? 0.15)) {
        released = true;
        if (isProjectile) start = launchPoint();
        callbacks.release?.(spec.kind);
      }
      if (projectile) {
        if (age < spec.release) {
          projectile.visible = spec.kind === "arrow";
          projectile.position.copy(launchPoint(age));
          projectile.quaternion.setFromUnitVectors(
            UP,
            end.clone().sub(projectile.position).normalize(),
          );
        } else {
          const p = Math.min(1, (age - spec.release) / flight);
          const arc =
            spec.kind === "arrow"
              ? Math.min(0.65, start.distanceTo(end) * 0.035)
              : 0.08;
          projectile.visible = spec.kind === "arrow" || p < 1;
          projectile.position.lerpVectors(start, end, p);
          projectile.position.y += 4 * arc * p * (1 - p);
          const tangent = end.clone().sub(start);
          tangent.y += 4 * arc * (1 - 2 * p);
          projectile.quaternion.setFromUnitVectors(UP, tangent.normalize());
          if (age > contact && spec.kind === "arrow") {
            const alpha = Math.max(0, 1 - (age - contact) / 0.32);
            projectile.traverse((o) => {
              if (o.isMesh) o.material.opacity = alpha;
            });
          }
        }
      }
      if (ribbon && weapon) {
        from.group.updateMatrixWorld(true);
        if (age >= 0.18 && age <= 0.57)
          ribbon.sample(
            age,
            weapon.localToWorld(v(0, 0.3, 0)),
            weapon.localToWorld(v(0, 1.38, 0)),
          );
        ribbon.update(age);
      }
      if (!impacted && age >= contact) {
        impacted = true;
        to.pendingImpacts = Math.max(0, to.pendingImpacts - 1);
        if (data.damage > 0) {
          host.animate(data.target, "Hit_A", true);
          to.deathGrace = 0.75;
        }
        callbacks.impact?.(spec.kind);
      }
      burst.update(age - contact);
      return age < contact + 0.55;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (!impacted) to.pendingImpacts = Math.max(0, to.pendingImpacts - 1);
      if (lunge) from.model.position.copy(restingPosition);
      if (bowRotation) bow.quaternion.copy(bowRotation);
      if (bowString) bowString.visible = stringWasVisible;
      host.scene.remove(root);
      owned.dispose();
    },
  };
  effect.update(0);
  return effect;
}
