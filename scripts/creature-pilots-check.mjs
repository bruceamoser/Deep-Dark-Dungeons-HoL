import { expect } from "@playwright/test";

export async function verifyCreaturePilots(page) {
  const saved = await page.evaluate(() =>
    structuredClone(window.__ddd.game.snapshot()),
  );
  try {
    await page.evaluate(() => {
      const { game: g, scene: s, C } = window.__ddd;
      g.pause();
      g.mode = "exploration";
      g.busy = false;
      g.encounter = null;
      g.paths.clear();
      g.map = {
        ...g.map,
        tiles: {},
        obstacles: {},
        rooms: [],
        chests: [],
        zones: [],
        lights: [{ x: 7, z: 7, radius: 12 }],
        start: { x: 7, z: 11 },
        exit: { x: 7, z: 1 },
        waterSources: [],
      };
      for (let x = 0; x < 16; x++)
        for (let z = 0; z < 16; z++) g.map.tiles[`${x},${z}`] = { x, z };
      g.seen = Object.fromEntries(
        Object.keys(g.map.tiles).map((k) => [k, true]),
      );
      g.party.forEach((h, i) => Object.assign(h, { x: 5 + i, z: 11 }));
      const ids = [
        "goblin-spearhand",
        "wererat",
        "clay-helper",
        "air-elemental",
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
          x: 5 + (i % 2) * 4,
          z: 5 + Math.floor(i / 2) * 3,
          conditions: [],
        };
      });
      g.emit("floor");
      g.emit("party");
      g.emit("change");
      s.zoom = 16;
      s.angle = Math.PI / 4;
      s.resize();
      s.focusOn({ x: 7, z: 7 });
    });
    await page.waitForTimeout(1000);
    const inspection = await page.evaluate(() => {
      const s = window.__ddd.scene;
      return [...s.entities.values()]
        .filter((e) => e.isEnemy)
        .map((e) => {
          const missing = [
            "Idle",
            "Walking_A",
            "1H_Melee_Attack_Slice_Diagonal",
            "Hit_A",
            "Death_A_Pose",
          ].filter((n) => !e.clips.some((c) => c.name === n));
          const poses = [];
          for (const name of [
            "Idle",
            "Walking_A",
            "1H_Melee_Attack_Slice_Diagonal",
            "Hit_A",
            "Death_A_Pose",
          ]) {
            e.mixer.stopAllAction();
            const clip = e.clips.find((c) => c.name === name);
            if (!clip) continue;
            const action = e.mixer.clipAction(clip);
            action.reset().play();
            e.mixer.update(Math.min(0.3, clip.duration * 0.4));
            e.model.updateMatrixWorld(true);
            let finite = true,
              vertices = 0,
              fingerprint = 0;
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
              }
            });
            poses.push({ name, finite, vertices, fingerprint });
          }
          e.mixer.stopAllAction();
          e.action = null;
          s.animate(e.data.id, "Idle");
          const spear = e.model.getObjectByName("Readied spear"),
            pan = e.model.getObjectByName("Saucepan helmet");
          return {
            id: e.data.type,
            missing,
            poses,
            spear: !!spear,
            pan: !!pan,
            tail: !!e.model.getObjectByName("tail_0"),
            skull: e.model
              .getObjectsByProperty("isMesh", true)
              .some((o) => /skull/i.test(o.name)),
            wind: e.model
              .getObjectsByProperty("isMesh", true)
              .filter((o) => /^VortexWind/.test(o.name)).length,
          };
        });
    });
    expect(inspection).toHaveLength(4);
    for (const e of inspection) {
      expect(e.missing, e.id).toEqual([]);
      expect(
        new Set(e.poses.map((p) => Math.round(p.fingerprint * 1000))).size,
        e.id + " changes pose",
      ).toBe(5);
      expect(
        e.poses.every((p) => p.finite && p.vertices > 0),
        e.id,
      ).toBe(true);
    }
    expect(inspection[0]).toMatchObject({ spear: true, pan: true });
    expect(inspection[1].tail).toBe(true);
    expect(inspection[3].wind).toBe(7);
    expect(inspection[3].skull).toBe(false);
    for (const [name, label] of [
      ["Idle", "idle"],
      ["Walking_A", "walk"],
      ["1H_Melee_Attack_Slice_Diagonal", "attack"],
      ["Hit_A", "hit"],
      ["Death_A_Pose", "death"],
    ]) {
      await page.evaluate((name) => {
        for (const e of window.__ddd.scene.entities.values())
          if (e.isEnemy) {
            e.mixer.stopAllAction();
            e.action = null;
            window.__ddd.scene.animate(e.data.id, name, true);
            e.lock = 10;
          }
      }, name);
      await page.waitForTimeout(name === "Death_A_Pose" ? 900 : 240);
      await page.screenshot({
        path: `test-results/creature-model-pilots/game-${label}.png`,
      });
    }
    console.log(
      "Pilot creatures: authored anatomy/props and all five animation states have distinct poses and every rendered vertex is finite.",
      JSON.stringify(inspection),
    );
  } finally {
    await page.evaluate((saved) => {
      const g = window.__ddd.game;
      g.load(saved, { resume: false });
      g.emit("floor");
      g.emit("change");
    }, saved);
  }
}
