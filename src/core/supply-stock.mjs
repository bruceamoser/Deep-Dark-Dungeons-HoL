import { SUPPLY_LADDER } from "./supply-dice.mjs";
export const SUPPLY_TARGETS = SUPPLY_LADDER.filter((n) => n > 0);

export const MATERIAL_STOCKS = [
  {
    id: "food",
    name: "Food ingredients",
    item: "item-food-ingredients",
    price: 2,
  },
  {
    id: "craft",
    name: "Crafting materials",
    item: "item-crafting-stock",
    price: 2,
  },
  {
    id: "medicine",
    name: "Medicinal herbs",
    item: "item-medicinal-herbs",
    price: 6,
  },
];
export const BASIC_SUPPLIES = [
  {
    id: "food",
    name: "Food",
    item: "item-food-bundle",
    recipe: "recipe-travel-food",
    duty: "cook",
    material: "food",
    normal: 8,
  },
  {
    id: "water",
    name: "Water",
    item: "item-water-flask",
    duty: "water",
    normal: 8,
  },
  {
    id: "arrows",
    name: "Arrows",
    item: "item-ammunition-bundle",
    recipe: "recipe-fletched-ammunition",
    duty: "arrows",
    material: "craft",
    normal: 8,
    tool: true,
  },
  {
    id: "light",
    name: "Torches",
    item: "item-lighting-bundle",
    recipe: "recipe-bound-torches",
    duty: "torches",
    material: "craft",
    normal: 6,
    tool: true,
  },
  {
    id: "dressings",
    name: "Dressings",
    item: "item-field-dressing",
    recipe: "recipe-field-dressing",
    duty: "dressings",
    material: "medicine",
    normal: 4,
    learned: true,
  },
];
// Each higher tier costs more preparation. Empty -> d8 needs four units;
// d12 -> d20 alone needs eight. A larger die does not create another bundle.
export const RESTOCK_COSTS = [0, 1, 1, 2, 3, 5, 8];
export function restockCost(before, after) {
  const from = SUPPLY_LADDER.indexOf(before),
    to = SUPPLY_LADDER.indexOf(after);
  if (from < 0 || to < 0 || to < from)
    throw new Error("Choose a larger supported supply die.");
  return RESTOCK_COSTS.slice(from + 1, to + 1).reduce((n, v) => n + v, 0);
}
export const stockForRecipe = (id) =>
  id ? BASIC_SUPPLIES.find((s) => s.recipe === id) : undefined;
export const stockForItem = (item) =>
  MATERIAL_STOCKS.find((s) => s.item === item.catalogId)?.id ??
  (item.stockUnits !== undefined
    ? stockForRecipe(item.materialType)?.material
    : null);
export const materialUnits = (item) => item.stockUnits ?? item.quantity ?? 1;
export const MATERIAL_ITEMS = MATERIAL_STOCKS.map((s) => ({
  id: s.item,
  name: s.name,
  price: s.price,
  bulk: 0.25,
  inventoryDie: null,
  handChoices: [],
  specialOrder: false,
  grantOnly: false,
  source: { path: "game/supplies" },
  kind: "material",
}));
const expected = { 0: 0, 4: 4, 6: 10, 8: 18, 10: 28, 12: 40, 20: 60 };
export function migrateSimpleStocks(campaign, C) {
  if (!C.gamePowers) return;
  const heroes = [
    ...campaign.party,
    ...(campaign.reserve ?? []),
    ...(campaign.fallenHeroes ?? []).map((f) => f.hero),
  ];
  const convertItem = (item, hero) => {
    const spec = stockForRecipe(item.materialType);
    if (
      !spec ||
      item.kind !== "ordinary" ||
      item.catalogId !== "item-material-bundle" ||
      item.stockUnits !== undefined
    )
      return;
    const definition = C.inventory.equipment.find(
      (d) => d.id === item.catalogId,
    );
    const die =
      hero?.supplies?.[item.instanceId] ??
      item.supplyRemaining ??
      item.inventoryDie ??
      definition?.inventoryDie ??
      0;
    if (!Object.hasOwn(expected, die))
      throw new Error("Invalid legacy ingredient supply.");
    const units = expected[die] * restockCost(0, spec.normal);
    if (!Number.isSafeInteger(units))
      throw new Error("Ingredient stock is too large.");
    item.stockUnits = units;
    item.stockBulk = (definition?.bulk ?? 0.5) * (item.quantity ?? 1);
    if (hero?.supplies) delete hero.supplies[item.instanceId];
  };
  for (const h of heroes) {
    for (const item of h.treasure ?? []) convertItem(item, h);
    for (const spec of BASIC_SUPPLIES.filter((s) => s.recipe)) {
      const batches = h.recipeMaterials?.[spec.recipe] ?? 0;
      if (!batches) continue;
      if (!Number.isSafeInteger(batches * restockCost(0, spec.normal)))
        throw new Error("Ingredient stock is too large.");
      (h.treasure ??= []).push({
        kind: "ordinary",
        catalogId: "item-material-bundle",
        instanceId: `stock-${crypto.randomUUID()}`,
        materialType: spec.recipe,
        stockUnits: batches * restockCost(0, spec.normal),
        stockBulk: 0,
        quantity: 1,
        carried: true,
        held: false,
        worn: false,
      });
      delete h.recipeMaterials[spec.recipe];
    }
  }
  for (const floor of [campaign.floor, campaign.returnPassage?.floor].filter(
    Boolean,
  ))
    for (const chest of floor.map.chests ?? [])
      for (const item of chest.items ?? []) convertItem(item);
  for (const rows of Object.values(campaign.market?.stock ?? {}))
    for (const row of rows) convertItem(row.item);
}
