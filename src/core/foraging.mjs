import {
  stockForRecipe,
  restockCost,
  MATERIAL_STOCKS,
} from "./supply-stock.mjs";
import { DISCIPLINE_FORAGING } from "./discipline-benefits.mjs";
import { distance, key, lineOfSight } from "./dungeon.mjs";
export const FORAGE_RESOURCES = Object.freeze([
  { id: "water", name: "Water", base: 8 },
  { id: "wood", name: "Wood & fuel", base: 12, recipe: "recipe-bound-torches" },
  {
    id: "food",
    name: "Food ingredients",
    base: 14,
    recipe: "recipe-travel-food",
  },
  {
    id: "fletching",
    name: "Fletching materials",
    base: 10,
    recipe: "recipe-fletched-ammunition",
  },
  {
    id: "herbs",
    name: "Medicinal materials",
    base: 6,
    recipe: "recipe-field-dressing",
  },
]);
export function forageTable({
  powers = [],
  ranks = {},
  remedies = false,
  salvage = false,
  healingSkills = 0,
} = {}) {
  const bonus = Object.fromEntries(FORAGE_RESOURCES.map((r) => [r.id, 0])),
    modifiers = [];
  const add = (name, changes) => {
    modifiers.push({ name, changes });
    for (const [id, n] of Object.entries(changes)) bonus[id] += n;
  };
  for (const [id, benefit] of Object.entries(DISCIPLINE_FORAGING)) {
    const rank = Math.max(
      0,
      Math.min(3, Math.floor(ranks[`discipline-${id}`] ?? 0)),
    );
    if (rank)
      add(
        `${benefit.name} training`,
        Object.fromEntries(
          Object.entries(benefit.resources).map(([resource, weight]) => [
            resource,
            rank * weight,
          ]),
        ),
      );
  }
  if (powers.includes("power-field-replenishment"))
    add("Field Replenishment", { water: 4, wood: 4, food: 6, fletching: 4 });
  if (powers.includes("power-forager-remedies"))
    add("Forager Remedies", { herbs: 12, food: 3 });
  if (powers.includes("power-field-artisan"))
    add("Field Artisan", { wood: 5, fletching: 5 });
  if (remedies && !powers.includes("power-forager-remedies"))
    add("Dressing recipe knowledge", { herbs: 3 });
  if (salvage) add("Salvage training", { wood: 3, fletching: 3 });
  if (healingSkills)
    add("Healing knowledge", { herbs: Math.min(6, healingSkills * 2) });
  const sum = Object.values(bonus).reduce((n, v) => n + v, 0);
  // Keep at least a 15% empty band; scale only bonuses, never baseline chances.
  if (sum > 35) {
    const fractions = Object.entries(bonus).map(([id, n]) => ({
      id,
      value: (n * 35) / sum,
    }));
    for (const f of fractions) bonus[f.id] = Math.floor(f.value);
    let remaining = 35 - Object.values(bonus).reduce((n, v) => n + v, 0);
    for (const f of fractions.sort((a, b) => (b.value % 1) - (a.value % 1)))
      if (remaining-- > 0) bonus[f.id]++;
  }
  let next = 1;
  const bands = FORAGE_RESOURCES.map((r) => {
    const chance = r.base + bonus[r.id],
      start = next;
    next += chance;
    return { ...r, chance, start, end: next - 1, bonus: bonus[r.id] };
  });
  bands.push({
    id: "nothing",
    name: "Nothing found",
    chance: 101 - next,
    start: next,
    end: 100,
  });
  return { bands, modifiers, findChance: next - 1 };
}
export function forageOutcome(table, roll) {
  if (!Number.isInteger(roll) || roll < 1 || roll > 100)
    throw new Error("Foraging requires d100.");
  return table.bands.find((b) => roll >= b.start && roll <= b.end);
}
export function migrateForagePlan(campaign) {
  for (const duties of Object.values(campaign.camp?.assignments ?? {}))
    for (let i = 0; i < duties.length; i++)
      if (duties[i].startsWith("forage-")) duties[i] = "forage";
}
export const foragingMethods = {
  campForageTable(h) {
    return forageTable({
      powers: this.powerIds(h),
      ranks: h.preview.state.ranks,
      remedies: this.knownRecipes(h).has("recipe-field-dressing"),
      salvage: this.traits(h).some((t) => t.salvage),
      healingSkills: this.campHealSkills(h).length,
    });
  },
  campForage(h, rng) {
    const table = this.campForageTable(h),
      roll = rng.int(1, 100);
    const outcome = this.forageProjection
      ? table.bands.find((b) => b.id === this.forageProjection)
      : forageOutcome(table, roll);
    if (outcome.id === "nothing") {
      this.campEvent(`${h.name} found nothing.`);
      return;
    }
    if (outcome.id === "water") {
      const center = this.campaign.camp;
      if (!this.campWaterSource()) {
        const tile = Object.values(this.map.tiles).find(
          (p) =>
            distance(p, center) > 0 &&
            distance(p, center) <= 2 &&
            !this.map.obstacles[key(p.x, p.z)] &&
            !this.occupied().has(key(p.x, p.z)) &&
            lineOfSight(this.map, p, center),
        );
        if (tile)
          (this.map.waterSources ??= []).push({
            x: tile.x,
            z: tile.z,
            discovered: true,
          });
      }
      let target;
      for (const p of [h, ...this.party.filter((p) => p !== h)]) {
        const item = p.preview.inventory.items.find(
          (i) =>
            i.carried &&
            i.catalogId === "item-water-flask" &&
            this.supplyValue(p, i) < 8,
        );
        if (item) {
          target = { hero: p, item };
          break;
        }
      }
      if (target) target.hero.supplies[target.item.instanceId] = 8;
      this.campEvent(
        `${h.name} found water${target ? ` and replenished ${target.hero.name}'s water flask` : this.campWaterSource() ? "; the company can gather more nearby" : " but could not reach a safe source"}.`,
      );
      this.emit("party");
      return;
    }
    const spec = stockForRecipe(outcome.recipe),
      units = restockCost(0, spec.normal);
    this.addMaterialStock(h, spec.material, units);
    this.campEvent(
      `${h.name} found ${units} ${MATERIAL_STOCKS.find((m) => m.id === spec.material).name.toLowerCase()} · ${spec.name.toLowerCase()} preparation available.`,
    );
  },
};
