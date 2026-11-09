export const SAVE_VERSION = 2;
export function serialize(campaign) {
  return JSON.stringify({
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    campaign,
  });
}
export function deserialize(text) {
  if (typeof text !== "string" || text.length > 8_000_000)
    throw new Error("Save is too large.");
  const s = JSON.parse(text),
    c = s.campaign;
  if (
    s.version !== SAVE_VERSION ||
    !c ||
    !Array.isArray(c.party) ||
    c.party.length !== 4 ||
    !Number.isSafeInteger(c.seed) ||
    !Number.isSafeInteger(c.depth) ||
    c.depth < 1 ||
    !Number.isFinite(c.bank) ||
    c.bank < 0 ||
    !Array.isArray(c.memorial) ||
    !Array.isArray(c.caches) ||
    !["town", "exploration", "combat", "wound-review", "defeat"].includes(
      c.mode,
    ) ||
    !c.floor?.map?.tiles ||
    !Array.isArray(c.floor.enemies) ||
    !Array.isArray(c.floor.map.rooms)
  )
    throw new Error("This is not a supported Four Lanterns Deep save.");
  for (const h of c.party)
    if (
      typeof h.id !== "string" ||
      !h.draft ||
      !Number.isSafeInteger(h.x) ||
      !Number.isSafeInteger(h.z) ||
      !c.floor.map.tiles[`${h.x},${h.z}`] ||
      !Array.isArray(h.wounds) ||
      !Number.isFinite(h.survival?.hp) ||
      h.survival.hp < 0
    )
      throw new Error("Save has invalid party data.");
  if (c.mode === "combat" && (!c.encounter?.roster || !c.budgets))
    throw new Error("Save has incomplete encounter data.");
  return c;
}
