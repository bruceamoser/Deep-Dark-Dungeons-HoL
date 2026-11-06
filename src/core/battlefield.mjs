// Persistent floor surfaces use campaign seconds, including saved inactive floors.
export function surfacesAt(map, p) {
  return (map?.zones ?? []).filter((z) =>
    z.cells.some((c) => c.x === p.x && c.z === p.z),
  );
}
export function surfaceAt(map, p, kind) {
  return surfacesAt(map, p).some((z) => z.kind === kind);
}
export function wallAt(map, x, z) {
  return surfaceAt(map, { x, z }, "wall");
}
export const SURFACE_COLORS = {
  fire: 0xef7138,
  water: 0x3998bd,
  smoke: 0x9b94af,
  wall: 0x86d4e0,
  difficult: 0x71964d,
  light: 0xf7d478,
  darkness: 0x694d91,
  healing: 0x65d7b2,
  trap: 0xc294e2,
};
export const battlefieldMethods = {
  expireBattlefield() {
    const now = this.clock().seconds;
    for (const floor of [this.map, this.campaign.returnPassage?.floor?.map])
      if (floor?.zones)
        floor.zones = floor.zones.filter(
          (z) => z.expires === null || z.expires > now,
        );
    for (const h of [...this.party, ...this.enemies])
      h.powerEffects = (h.powerEffects ?? []).filter(
        (e) =>
          e.expiresAt > now &&
          (this.mode !== "combat" || e.expiresTurn >= (h.powerTurn ?? 0)),
      );
  },
  createSurface(kind, cells, actor, rounds = 3) {
    if (kind === "water") {
      const wet = new Set(cells.map((p) => `${p.x},${p.z}`));
      for (const zone of this.map.zones ?? [])
        if (zone.kind === "fire")
          zone.cells = zone.cells.filter((p) => !wet.has(`${p.x},${p.z}`));
      this.map.zones = (this.map.zones ?? []).filter((z) => z.cells.length);
    }
    if (kind === "fire")
      cells = cells.filter((p) => !surfaceAt(this.map, p, "water"));
    if (!cells.length) return;
    this.map.zones ??= [];
    this.map.zones.push({
      id: crypto.randomUUID(),
      kind,
      cells: structuredClone(cells),
      source: actor.id,
      expires: this.clock().seconds + rounds * 6,
      hits: {},
    });
    // A newly created hazardous surface is an entry; healing waits for the turn.
    for (const h of [...this.party, ...this.enemies])
      if (cells.some((p) => p.x === h.x && p.z === h.z))
        this.surfaceContact(h, { entry: true });
    this.syncTorches();
    this.emit("battlefield");
  },
  surfaceContact(actor, { entry = false } = {}) {
    if ((actor.survival?.hp ?? actor.hp ?? 0) <= 0) return;
    for (const z of surfacesAt(this.map, actor)) {
      if (z.kind === "water")
        actor.conditions = this.R.reduceTemporary(
          actor.conditions ?? [],
          "burning",
          99,
        );
      if (z.kind === "healing" && entry) continue;
      const stamp = `${Math.floor(this.clock().seconds / 6)}`;
      if (z.hits?.[actor.id] === stamp) continue;
      (z.hits ??= {})[actor.id] = stamp;
      if (z.kind === "fire" || z.kind === "trap") {
        this.powerDamage(
          actor,
          z.kind === "fire" ? 2 : 5,
          z.kind === "fire" ? "fire" : "mental",
          this.party.find((h) => h.id === z.source),
        );
        if (z.kind === "fire")
          this.powerCondition(actor, "burning", 1, z.source);
        if (z.kind === "trap") {
          z.expires = this.clock().seconds;
          z.cells = [];
        }
      }
      if (z.kind === "healing" && !entry && actor.survival)
        this.powerHeal(actor, 2);
    }
  },
};
