import { MATERIAL_STOCKS, stockForRecipe } from "./supply-stock.mjs";
export function campSnapshot(game) {
  return game.party.map((h) => ({
    id: h.heroId,
    name: h.name,
    hp: h.survival.hp,
    wounds: h.wounds.filter((w) => !w.treatment?.completed).length,
    materials: {
      ...Object.fromEntries(
        Object.entries(h.recipeMaterials ?? {}).filter(
          ([id]) => !stockForRecipe(id),
        ),
      ),
      ...Object.fromEntries(
        MATERIAL_STOCKS.map((s) => [
          s.id,
          game
            .materialSources(s.id)
            .filter((r) => r.hero.heroId === h.heroId)
            .reduce((n, r) => n + r.units, 0),
        ]),
      ),
    },
    supplies: h.preview.inventory.items
      .filter((i) => i.inventoryDie)
      .map((i) => ({ name: i.definition.name, die: game.supplyValue(h, i) })),
  }));
}
export function newCampReport(game) {
  return {
    start: campSnapshot(game),
    healed: {},
    events: [],
    acknowledged: false,
  };
}
export function finishCampReport(game) {
  const report = game.campaign.camp?.report;
  if (report) report.end = campSnapshot(game);
}

export function validateCampReport(report) {
  if (!report) return;
  const validRows = (rows) =>
    Array.isArray(rows) &&
    rows.length <= 4 &&
    rows.every(
      (r) =>
        typeof r.id === "string" &&
        typeof r.name === "string" &&
        Number.isFinite(r.hp) &&
        Number.isSafeInteger(r.wounds) &&
        r.wounds >= 0 &&
        r.materials &&
        Object.values(r.materials).every(
          (n) => Number.isSafeInteger(n) && n >= 0,
        ) &&
        Array.isArray(r.supplies) &&
        r.supplies.length <= 1000 &&
        r.supplies.every(
          (s) => typeof s.name === "string" && Number.isFinite(s.die),
        ),
    );
  if (
    !validRows(report.start) ||
    (report.end && !validRows(report.end)) ||
    !report.healed ||
    Object.values(report.healed).some((n) => !Number.isFinite(n) || n < 0) ||
    !Array.isArray(report.events) ||
    report.events.length > 512 ||
    report.events.some((e) => typeof e !== "string") ||
    typeof report.acknowledged !== "boolean"
  )
    throw new Error("Invalid camp results.");
}
