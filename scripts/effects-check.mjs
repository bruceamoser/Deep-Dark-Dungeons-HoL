import { waitForGame } from "./ui-session.mjs";
import { chromium, expect } from "@playwright/test";

export async function verifyEffects(page) {
  // Keep the real UI/action handler; control only encounter placement and frame
  // time so screenshots capture flight/contact rather than a random idle frame.
  await page.evaluate(() => {
    const { game: g, scene: s } = window.__ddd;
    window.effectTick = s.tick.bind(s);
    s.tick = () => {};
    window.effectFixture = (ranged = false, lethal = false) => {
      g.paths.clear();
      g.mode = "town";
      g.busy = false;
      g.pendingDefense = null;
      g.woundNotices = [];
      const index = ranged ? 1 : 0;
      g.selected = index;
      g.party.forEach((h, i) => {
        h.x = g.map.start.x - 2;
        h.z = g.map.start.z - 2 + i;
        h.selected = i === index;
        h.conditions = [];
        h.wounds = [];
        h.survival.status = "active";
        h.survival.hp = h.survival.maxHp;
      });
      const h = g.party[index];
      const item = h.preview.inventory.items.find(
        (i) =>
          i.catalogId === `item-ordinary-${ranged ? "ranged" : "melee"}-weapon`,
      );
      if (!item.held) g.equip(index, item.instanceId, "ready");
      g.enemies = [
        {
          id: "effects-enemy",
          name: "Bone sentry",
          group: 999,
          x: h.x + (ranged ? 5 : 1),
          z: h.z,
          hp: lethal ? 1 : 20,
          maxHp: 20,
          conditions: [],
        },
      ];
      g.dice = (n = 3) => Array(n).fill(6);
      g.mode = "exploration";
      s.resetEntities(g.party, g.enemies);
      g.detect();
      s.zoom = 17;
      s.resize();
      s.angle = Math.PI / 4;
      s.focusOn({ x: h.x + (ranged ? 2 : 0), z: h.z });
      for (let i = 0; i < 80; i++) window.effectTick(1 / 60);
      s.updateVisibility(g.party, g.seen);
      window.effectTick(0);
    };
    window.effectFixture(true, true);
  });
  const clickTarget = async () => {
    const target = await page.evaluate(() => {
      const { scene: s, game: g } = window.__ddd,
        e = g.enemies[0];
      const p = s.camera.position
        .clone()
        .set(e.x * 2.4, 0, e.z * 2.4)
        .project(s.camera);
      return {
        x: ((p.x + 1) * innerWidth) / 2,
        y: ((1 - p.y) * innerHeight) / 2,
      };
    });
    await page.mouse.click(target.x, target.y);
  };
  const step = (seconds) =>
    page.evaluate((seconds) => {
      for (let t = 0; t < seconds - 0.00001; t += 1 / 60)
        window.effectTick(Math.min(1 / 60, seconds - t));
    }, seconds);
  try {
    await clickTarget();
    const nocked = await page.evaluate(() => {
      const s = window.__ddd.scene,
        e = s.effects[0],
        meshes = [];
      e?.root.traverse((o) => {
        if (o.isMesh) meshes.push(o.geometry.type);
      });
      return {
        kind: e?.kind,
        impacted: e?.impacted,
        arrow: !!e?.root.getObjectByName(
          "Flying arrow · shaft, head and fletching",
        ),
        meshes,
        enemyVisible: s.entities.get("effects-enemy").group.visible,
      };
    });
    expect(nocked).toMatchObject({
      kind: "arrow",
      impacted: false,
      arrow: true,
      enemyVisible: true,
    });
    expect(nocked.meshes).not.toContain("SphereGeometry");
    await step(0.1);
    expect(
      await page.evaluate(() => {
        let tension = 0;
        window.__ddd.scene.entities
          .get("hero-1")
          .model.getObjectByName("Readied bow")
          .traverse((m) => {
            if (m.morphTargetDictionary?.Draw !== undefined)
              tension = Math.max(
                tension,
                m.morphTargetInfluences[m.morphTargetDictionary.Draw],
              );
          });
        return tension;
      }),
    ).toBeGreaterThan(0.25);
    await step(0.38);
    const flight = await page.evaluate(() => {
      const s = window.__ddd.scene,
        e = s.effects[0];
      const arrow = e.projectile.getObjectByName(
        "Flying arrow · shaft, head and fletching",
      );
      e.root.updateMatrixWorld(true);
      const shaftDirection = arrow
        .localToWorld(e.projectile.position.clone().set(0, 0, 1))
        .sub(arrow.localToWorld(e.projectile.position.clone().set(0, 0, 0)))
        .normalize();
      return {
        position: e.projectile.position.toArray(),
        shaftDirection: shaftDirection.toArray(),
        impacted: e.impacted,
        visible: s.entities.get("effects-enemy").group.visible,
        action: s.entities.get("effects-enemy").action.getClip().name,
      };
    });
    expect(flight.impacted).toBe(false);
    expect(flight.visible).toBe(true);
    expect(flight.action).not.toContain("Hit");
    await page.screenshot({ path: "test-results/arrow-flight.png" });
    await step(0.16);
    const nextPosition = await page.evaluate(() =>
      window.__ddd.scene.effects[0].projectile.position.toArray(),
    );
    expect(nextPosition).not.toEqual(flight.position);
    const travel = nextPosition.map((value, i) => value - flight.position[i]);
    const distance = Math.hypot(...travel);
    // Check the rendered shaft, including both nested transforms, against
    // observed travel. Wrapper rotation alone missed a sideways arrow model.
    const alignment = travel.reduce(
      (dot, value, i) => dot + (value / distance) * flight.shaftDirection[i],
      0,
    );
    expect(alignment).toBeGreaterThan(0.99);
    await step(0.3);
    expect(
      await page.evaluate(() => window.__ddd.scene.effects[0].impacted),
    ).toBe(true);
    await page.screenshot({ path: "test-results/arrow-impact.png" });
    await step(1.5);
    expect(await page.evaluate(() => window.__ddd.scene.effects.length)).toBe(
      0,
    );
    expect(
      await page.evaluate(
        () => window.__ddd.scene.entities.get("effects-enemy").group.visible,
      ),
    ).toBe(false);

    await page.evaluate(() => window.effectFixture(false));
    await clickTarget();
    await step(0.42);
    expect(
      await page.evaluate(() => {
        const { game: g, scene: s } = window.__ddd,
          h = g.party[0],
          e = s.entities.get(h.id);
        return [
          e.group.position.x === h.x * 2.4,
          e.group.position.z === h.z * 2.4,
          e.model.position.z > 0,
        ];
      }),
    ).toEqual([true, true, true]);
    expect(
      await page.evaluate(() => {
        const s = window.__ddd.scene,
          e = s.effects[0];
        return {
          kind: e.kind,
          vertices: e.root.getObjectByName("Blade motion ribbon").geometry
            .drawRange.count,
          clip: s.entities.get("hero-0").action.getClip().name,
          projectile: !!e.projectile,
        };
      }),
    ).toMatchObject({
      kind: "sword",
      clip: "1H_Melee_Attack_Slice_Diagonal",
      projectile: false,
    });
    expect(
      await page.evaluate(
        () =>
          window.__ddd.scene.effects[0].root.getObjectByName(
            "Blade motion ribbon",
          ).geometry.drawRange.count,
      ),
    ).toBeGreaterThan(12);
    await page.screenshot({ path: "test-results/sword-swing.png" });
    await step(0.06);
    await page.screenshot({ path: "test-results/sword-contact.png" });

    // A second use of the same one-shot must restart the clip; resetting the
    // floor/equipment mid-flight must release effects and pending-hit holds.
    await page.evaluate(() => {
      const s = window.__ddd.scene;
      s.animate("hero-0", "1H_Melee_Attack_Slice_Diagonal", true);
    });
    expect(
      await page.evaluate(
        () => window.__ddd.scene.entities.get("hero-0").action.time,
      ),
    ).toBe(0);
    await step(1.5);
    await page.evaluate(() => {
      const { scene: s, game: g } = window.__ddd;
      s.attackEffect({
        attacker: "hero-1",
        target: "effects-enemy",
        ranged: true,
        damage: 1,
      });
      s.resetEntities(g.party, g.enemies);
    });
    expect(
      await page.evaluate(() => ({
        count: window.__ddd.scene.effects.length,
        pending:
          window.__ddd.scene.entities.get("effects-enemy").pendingImpacts ?? 0,
      })),
    ).toEqual({ count: 0, pending: 0 });

    // A source forced move is committed immediately, but its visual push waits
    // for the shield to connect. This does not rewrite the target's grid square.
    await page.evaluate(() => {
      const { scene: s, game: g } = window.__ddd,
        target = g.enemies[0];
      window.pushOrigin = s.entities.get(target.id).group.position.toArray();
      g.forceMove(target, { x: 1, z: 0 }, 1);
      s.attackEffect({
        attacker: "hero-0",
        target: target.id,
        ability: "ability-rim-strike",
        damage: 1,
      });
    });
    await step(0.2);
    expect(
      await page.evaluate(() =>
        window.__ddd.scene.entities
          .get("effects-enemy")
          .group.position.toArray(),
      ),
    ).toEqual(await page.evaluate(() => window.pushOrigin));
    await step(0.5);
    expect(
      await page.evaluate(() =>
        window.__ddd.scene.entities
          .get("effects-enemy")
          .group.position.toArray(),
      ),
    ).not.toEqual(await page.evaluate(() => window.pushOrigin));
    await step(1);

    // Distinct non-spherical elemental effects, including self-target recovery.
    for (const element of ["fire", "cold", "life"]) {
      await page.evaluate((element) => {
        const s = window.__ddd.scene;
        s.attackEffect({
          attacker: "hero-3",
          target: "effects-enemy",
          spell: true,
          element,
          damage: 0,
        });
      }, element);
      await step(0.45);
      await page.screenshot({ path: `test-results/${element}-effect.png` });
      expect(
        await page.evaluate(() => {
          const geometries = [];
          window.__ddd.scene.effects[0].root.traverse((o) => {
            if (o.isMesh) geometries.push(o.geometry.type);
          });
          return geometries.includes("SphereGeometry");
        }),
      ).toBe(false);
      await step(2);
    }
    await page.evaluate(() =>
      window.__ddd.scene.attackEffect({
        attacker: "hero-3",
        target: "hero-3",
        spell: true,
        element: "life",
        damage: 0,
      }),
    );
    await step(1.5);
    expect(await page.evaluate(() => window.__ddd.scene.effects.length)).toBe(
      0,
    );
    console.log(
      "Rendered bow shot, flying arrow, blade ribbon, contact timing, lethal impact, repeated swing, reset cleanup and distinct spell effects passed.",
    );
  } finally {
    await page.evaluate(() => {
      window.__ddd.scene.clearEffects();
      window.__ddd.scene.tick = window.effectTick;
      delete window.effectFixture;
    });
  }
}
if (process.argv[1]?.endsWith("effects-check.mjs")) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage({
        viewport: { width: 1600, height: 1000 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:5198");
    await waitForGame(page);
    await page.getByRole("button", { name: "The Depths" }).click();
    await page.waitForFunction(
      () => window.__ddd.game.mode === "exploration",
      null,
      { timeout: 15000 },
    );
    await verifyEffects(page);
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
}
