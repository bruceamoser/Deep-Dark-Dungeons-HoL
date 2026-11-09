import { expect } from "@playwright/test";
export async function verifyWeaponRoll(page) {
  const saved = await page.evaluate(() =>
    structuredClone(window.__ddd.game.snapshot()),
  );
  try {
    await page.evaluate(() => {
      const g = window.__ddd.game;
      g.pause();
      g.mode = "exploration";
      g.enemies = [];
      g.paths.clear();
      g.emit("change");
    });
    await page.locator('[data-action="sheet"]').click();
    await page.locator('[data-tab="appearance"]').click();
    for (const type of ["sword", "hammer", "axe"]) {
      await page
        .getByLabel("One-handed melee type", { exact: true })
        .selectOption(type);
      await expect(page.locator("#hero-preview")).toHaveAttribute(
        "data-preview-weapon",
        new RegExp(
          type === "sword" ? "Sword" : type === "hammer" ? "Hammer" : "Axe",
        ),
      );
      await page.screenshot({ path: `test-results/weapon-roll-${type}.png` });
    }
    await page
      .getByLabel("Equipped shield style", { exact: true })
      .selectOption("Shield04");
    await page.screenshot({ path: "test-results/shield-upright-preview.png" });
    await page.keyboard.press("Escape");
    for (const melee of [false, true]) {
      await page.evaluate((melee) => {
        const g = window.__ddd.game,
          h = g.party[0];
        h.preview.inventory.items.forEach((i) => {
          if (i.catalogId === "item-ordinary-melee-weapon") i.held = melee;
          if (i.catalogId === "item-ordinary-shield") i.held = true;
        });
        g.emit("party");
        g.emit("change");
      }, melee);
      await page.waitForFunction(
        () => {
          const a = window.__ddd.scene.entities.get("hero-0").action;
          return a?.time >= 0.2 && a.getEffectiveWeight() > 0.99;
        },
        null,
        { timeout: 30000 },
      );
      const normal = await page.evaluate(() => {
        const m = window.__ddd.scene.entities.get("hero-0").model;
        let mesh;
        m.getObjectByName("Shield04").traverse((o) => {
          if (o.isMesh && o.material.name === "MasonChannel02") mesh = o;
        });
        m.updateMatrixWorld(true);
        mesh.skeleton.update();
        const inv = m.matrixWorld.clone().invert(),
          p = (i) =>
            mesh
              .localToWorld(
                mesh.getVertexPosition(i, m.position.clone().set(0, 0, 0)),
              )
              .applyMatrix4(inv);
        const index = mesh.geometry.index,
          a = p(index.getX(0)),
          b = p(index.getX(1)),
          c = p(index.getX(2));
        return b.sub(a).cross(c.sub(a)).normalize().toArray();
      });
      expect(normal[2]).toBeGreaterThan(0.8);
      expect(Math.abs(normal[1])).toBeLessThan(0.35);
    }
    console.log(
      "Sword, hammer and axe ready previews plus upright shield faces in armed/unarmed poses passed.",
    );
  } finally {
    await page.evaluate((saved) => {
      const { game: g } = window.__ddd;
      g.load(saved, { resume: false });
      g.emit("floor");
      g.emit("change");
    }, saved);
  }
}
