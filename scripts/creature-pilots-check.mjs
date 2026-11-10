import { expect } from "@playwright/test";

export async function verifyCreaturePilots(page) {
  const saved = await page.evaluate(() =>
    structuredClone(window.__ddd.game.snapshot()),
  );
  const camera = await page.evaluate(() => {
    const { zoom, angle, follow } = window.__ddd.scene;
    return { zoom, angle, follow };
  });
  try {
    await page.evaluate(() => {
      const { game: g, scene: s, C } = window.__ddd;
      g.pause();
      g.mode = "exploration";
      g.busy = false;
      g.encounter = null;
      g.paths.clear();
      g.campaign.caches = [];
      g.map = {
        ...g.map,
        tiles: {},
        obstacles: {},
        rooms: [],
        chests: [],
        zones: [],
        lights: [{ x: 7, z: 7, radius: 12 }],
        start: { x: 1, z: 14 },
        exit: { x: 14, z: 1 },
        waterSources: [],
      };
      for (let x = 0; x < 16; x++)
        for (let z = 0; z < 16; z++) g.map.tiles[`${x},${z}`] = { x, z };
      g.seen = Object.fromEntries(
        Object.keys(g.map.tiles).map((k) => [k, true]),
      );
      g.party.forEach((h, i) => Object.assign(h, { x: 5 + i, z: 14 }));
      const ids = [
        "goblin-spearhand",
        "wererat",
        "clay-helper",
        "air-elemental",
        "stone-knuckle",
        "kobold-tunnel-scout",
        "plague-zombie",
        "cave-bat",
        "animated-statue",
        "kobold-emberkeeper",
        "cinder-strider",
        "kobold-trapkeeper",
        "emberling",
      ];
      g.enemies = ids.map((id, i) => {
        const c = C.creatures.creatures.find((c) => c.id === `creature-${id}`);
        return {
          id: `pilot-${i}`,
          type: c.id,
          name: c.name,
          hp: c.hp.max,
          maxHp: c.hp.max,
          cv: c.cv,
          x: 5 + (i % 4) * 2,
          z: 5 + Math.floor(i / 4) * 2,
          conditions: [],
        };
      });
      g.emit("floor");
      g.emit("party");
      g.emit("change");
      s.zoom = 26;
      s.angle = Math.PI / 4;
      s.resize();
      s.follow = false;
      s.focusOn({ x: 8, z: 8.5 }, false);
    });
    await page.waitForTimeout(1000);
    const inspection = await page.evaluate(() => {
      const s = window.__ddd.scene;
      return [...s.entities.values()]
        .filter((e) => e.isEnemy)
        .map((e) => {
          const names = [
            "Idle",
            "Walking_A",
            "1H_Melee_Attack_Slice_Diagonal",
            "Hit_A",
            "Death_A_Pose",
            ...(e.data.type === "creature-kobold-emberkeeper"
              ? ["Spellcast_Shoot"]
              : []),
            ...(e.data.type === "creature-kobold-trapkeeper"
              ? ["2H_Ranged_Shoot"]
              : []),
            ...(["creature-cinder-strider", "creature-emberling"].includes(
              e.data.type,
            )
              ? ["Unarmed_Melee_Attack_Punch_A"]
              : []),
          ];
          const missing = names.filter(
            (n) => !e.clips.some((c) => c.name === n),
          );
          const poses = [];
          const hanging = e.model.getObjectByName("HangingBrazier");
          const hangingMeshes = new Set(
            hanging?.getObjectsByProperty("isMesh", true) ?? [],
          );
          for (const name of names) {
            e.mixer.stopAllAction();
            const clip = e.clips.find((c) => c.name === name);
            if (!clip) continue;
            const action = e.mixer.clipAction(clip);
            action.reset().play();
            e.mixer.update(Math.min(0.3, clip.duration * 0.4));
            e.model.userData.animate?.(0.3, false);
            e.model.updateMatrixWorld(true);
            let finite = true,
              vertices = 0,
              fingerprint = 0;
            let hangingMinY = Infinity;
            e.model.traverse((o) => {
              if (!o.isMesh) return;
              o.skeleton?.update();
              for (let i = 0; i < o.geometry.attributes.position.count; i++) {
                const p = e.model.position.clone();
                o.getVertexPosition(i, p);
                p.applyMatrix4(o.matrixWorld);
                finite &&= [p.x, p.y, p.z].every(Number.isFinite);
                vertices++;
                fingerprint += p.x * 0.31 + p.y * 0.73 + p.z * 0.29;
                if (hangingMeshes.has(o))
                  hangingMinY = Math.min(hangingMinY, p.y);
              }
            });
            const up = hanging
              ? e.model.position
                  .clone()
                  .set(0, 1, 0)
                  .applyQuaternion(
                    hanging.getWorldQuaternion(e.model.quaternion.clone()),
                  )
              : null;
            poses.push({
              name,
              finite,
              vertices,
              fingerprint,
              hangingUp: up?.y,
              hangingMinY: hanging ? hangingMinY : null,
            });
          }
          e.mixer.stopAllAction();
          e.action = null;
          s.animate(e.data.id, "Idle");
          const spear = e.model.getObjectByName("Readied spear"),
            pan = e.model.getObjectByName("Saucepan helmet");
          let heatMotion = null;
          if (
            ["creature-cinder-strider", "creature-emberling"].includes(
              e.data.type,
            )
          ) {
            const materials = [
              ...new Set(
                e.model
                  .getObjectsByProperty("isMesh", true)
                  .flatMap((o) =>
                    Array.isArray(o.material) ? o.material : [o.material],
                  ),
              ),
            ].filter((m) => m.emissive?.getHex());
            e.model.userData.animate?.(0.37, false);
            const before = materials.map((m) => m.emissiveIntensity);
            e.model.userData.animate?.(1.21, false);
            heatMotion =
              materials.length > 0 &&
              materials.every(
                (m) =>
                  Number.isFinite(m.emissiveIntensity) &&
                  m.emissiveIntensity >= 0,
              ) &&
              materials.some(
                (m, i) => Math.abs(m.emissiveIntensity - before[i]) > 1e-7,
              );
          }
          return {
            id: e.data.type,
            visible: e.group.visible,
            missing,
            poses,
            heatMotion,
            spear: !!spear,
            pan: !!pan,
            tail: !!(
              e.model.getObjectByName("tail_0") ||
              e.model.getObjectByName("tail1")
            ),
            skull: e.model
              .getObjectsByProperty("isMesh", true)
              .some((o) => /skull/i.test(o.name)),
            wind: e.model
              .getObjectsByProperty("isMesh", true)
              .filter((o) => /^VortexWind/.test(o.name)).length,
          };
        });
    });
    expect(inspection).toHaveLength(13);
    for (const e of inspection) {
      expect(e.missing, e.id).toEqual([]);
      expect(e.visible, e.id + " is actually visible in the scene").toBe(true);
      expect(
        new Set(e.poses.map((p) => Math.round(p.fingerprint * 1000))).size,
        e.id + " changes pose",
      ).toBeGreaterThanOrEqual(e.id === "creature-cave-bat" ? 4 : 5);
      expect(
        e.poses.every((p) => p.finite && p.vertices > 0),
        e.id,
      ).toBe(true);
    }
    expect(inspection[0]).toMatchObject({ spear: true, pan: true });
    expect(inspection[1].tail).toBe(true);
    expect(inspection[3].wind).toBe(7);
    expect(inspection[3].skull).toBe(false);
    expect(inspection[5].tail).toBe(true);
    expect(inspection[11].tail).toBe(true);
    expect(inspection[10].heatMotion).toBe(true);
    expect(inspection[12].heatMotion).toBe(true);
    for (const pose of inspection[9].poses) {
      expect(
        Number.isFinite(pose.hangingMinY),
        pose.name + " measures the actual cup mesh",
      ).toBe(true);
      expect(
        pose.hangingUp,
        pose.name + " keeps the brazier upright",
      ).toBeCloseTo(1, 4);
      expect(
        pose.hangingMinY,
        pose.name + " keeps the cup above the floor",
      ).toBeGreaterThanOrEqual(0.024);
    }
    for (const [name, label] of [
      ["Idle", "idle"],
      ["Walking_A", "walk"],
      ["1H_Melee_Attack_Slice_Diagonal", "attack"],
      ["Hit_A", "hit"],
      ["Death_A_Pose", "death"],
      ["Spellcast_Shoot", "spell"],
      ["2H_Ranged_Shoot", "dart"],
      ["Unarmed_Melee_Attack_Punch_A", "coal-touch"],
    ]) {
      await page.evaluate((name) => {
        for (const e of window.__ddd.scene.entities.values())
          if (e.isEnemy) {
            e.mixer.stopAllAction();
            e.action = null;
            const clip =
              name === "Spellcast_Shoot" &&
              e.data.type !== "creature-kobold-emberkeeper"
                ? "Idle"
                : name === "2H_Ranged_Shoot" &&
                    e.data.type !== "creature-kobold-trapkeeper"
                  ? "Idle"
                  : name === "Unarmed_Melee_Attack_Punch_A" &&
                      ![
                        "creature-cinder-strider",
                        "creature-emberling",
                      ].includes(e.data.type)
                    ? "Idle"
                    : name;
            window.__ddd.scene.animate(e.data.id, clip, true);
            e.lock = 10;
          }
      }, name);
      await page.waitForTimeout(name === "Death_A_Pose" ? 900 : 240);
      await page.screenshot({
        path: `test-results/creature-model-pilots/game-${label}.png`,
      });
    }
    console.log(
      "Authored creature checks: required clips bind with finite geometry; bat shares idle/movement flight; emberkeeper brazier is upright and above the floor, including spellcasting.",
      JSON.stringify(inspection),
    );
  } finally {
    await page.evaluate(
      ({ saved, camera }) => {
        const { game: g, scene: s } = window.__ddd;
        g.load(saved, { resume: false });
        g.emit("floor");
        g.emit("change");
        Object.assign(s, camera);
        s.resize();
      },
      { saved, camera },
    );
  }
}
