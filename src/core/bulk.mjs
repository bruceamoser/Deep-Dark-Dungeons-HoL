// Computer-game carrying weights. Source equipment records remain unchanged.
const quarter = new Set([
  "item-clearing-tonic",
  "item-lesser-healing-bottle",
  "item-greater-healing-bottle",
  "item-superior-healing-bottle",
  "item-field-dressing",
  "item-flash-powder",
  "item-restoration-draught",
  "item-ward-charm",
  "item-local-map",
  "item-glass-of-fine-detail",
  "item-padlock",
  "item-writing-kit",
  "item-small-necessities",
]);
const half = new Set([
  "item-ammunition-bundle",
  "item-food-bundle",
  "item-lighting-bundle",
  "item-water-flask",
  "item-material-bundle",
  "item-lock-tools",
  "item-smoke-supply",
  "item-signal-kit",
  "item-restraints",
  "item-travel-clothes",
  "item-winter-lining",
]);
export function gameBulk(definition) {
  return quarter.has(definition.id)
    ? 0.25
    : half.has(definition.id)
      ? 0.5
      : definition.bulk;
}
export function bulkCatalog(source) {
  if (source.gameBulk === 1) return source;
  return {
    ...source,
    gameBulk: 1,
    inventory: {
      ...source.inventory,
      equipment: source.inventory.equipment.map((d) => ({
        ...d,
        bulk: gameBulk(d),
      })),
    },
  };
}
export const encumbranceFor = (bulk, capacity) =>
  Math.ceil(Math.max(0, bulk - capacity));
