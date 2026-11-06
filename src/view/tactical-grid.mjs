import * as T from "three";
const TILE = 2.4;
export const tacticalViewMethods = {
  updateTacticalGrid(game, { targeting = false, force = false } = {}) {
    const combat = game.mode === "combat",
      showGrid = combat || this.gridEnabled;
    const reach = combat && !targeting ? game.movementRange() : [];
    this.movementCells = new Map(reach.map((p) => [`${p.x},${p.z}`, p]));
    const cells = showGrid
      ? Object.values(game.map.tiles).filter((p) => game.seen[`${p.x},${p.z}`])
      : [];
    const signature = JSON.stringify([
      game.map.seed,
      showGrid,
      targeting,
      cells.map((p) => [p.x, p.z]),
      reach,
    ]);
    if (!force && signature === this.tacticalKey) return;
    this.tacticalKey = signature;
    if (this.tacticalGroup) {
      this.tacticalGroup.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
      this.tacticalGroup.removeFromParent();
    }
    this.tacticalGroup = new T.Group();
    this.tacticalGroup.name = "Tactical squares";
    this.scene.add(this.tacticalGroup);
    const vertices = [],
      edges = new Set();
    for (const p of cells) {
      const x = p.x * TILE,
        z = p.z * TILE,
        a = TILE / 2;
      for (const [x1, z1, x2, z2] of [
        [x - a, z - a, x + a, z - a],
        [x + a, z - a, x + a, z + a],
        [x + a, z + a, x - a, z + a],
        [x - a, z + a, x - a, z - a],
      ]) {
        const id = [[x1, z1].join(","), [x2, z2].join(",")].sort().join("|");
        if (!edges.has(id)) {
          edges.add(id);
          vertices.push(x1, 0.075, z1, x2, 0.075, z2);
        }
      }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
    const grid = new T.LineSegments(
      geo,
      new T.LineBasicMaterial({
        color: 0xa1c5bf,
        transparent: true,
        opacity: combat ? 0.42 : 0.26,
        depthWrite: false,
      }),
    );
    grid.name = "True movement grid";
    this.tacticalGroup.add(grid);
    for (const p of reach) {
      if (!game.seen[`${p.x},${p.z}`] || !p.canEnd || p.cost === 0) continue;
      const tile = new T.Mesh(
        new T.PlaneGeometry(TILE * 0.94, TILE * 0.94),
        new T.MeshBasicMaterial({
          color: p.cost === game.movementLeft() ? 0xd1b477 : 0x4bb8aa,
          transparent: true,
          opacity: p.cost === game.movementLeft() ? 0.25 : 0.15,
          depthWrite: false,
          side: T.DoubleSide,
        }),
      );
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(p.x * TILE, 0.09, p.z * TILE);
      tile.userData.movementCost = p.cost;
      this.tacticalGroup.add(tile);
    }
  },
};
