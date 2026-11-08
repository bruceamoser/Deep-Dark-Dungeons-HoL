export const SUPPLY_LADDER = Object.freeze([0, 4, 6, 8, 10, 12, 20]);
export function combineSupplyDice(a, b) {
  if (!SUPPLY_LADDER.includes(a) || !SUPPLY_LADDER.includes(b) || !a || !b)
    throw new Error("Combine two nonempty supply dice.");
  return SUPPLY_LADDER[
    Math.min(
      6,
      Math.max(SUPPLY_LADDER.indexOf(a), SUPPLY_LADDER.indexOf(b)) + 1,
    )
  ];
}
export function collapseSupplyDice(dice) {
  return dice
    .filter(Boolean)
    .reduce((a, b) => (a ? combineSupplyDice(a, b) : b), 0);
}
export function migrateCombinedSupplies(campaign, C) {
  const convert = (item, hero) => {
    if (!Array.isArray(item.reserveDice)) return;
    const definition = C.inventory.equipment.find(
      (d) => d.id === item.catalogId,
    );
    const current =
      hero?.supplies?.[item.instanceId] ??
      item.supplyRemaining ??
      item.inventoryDie ??
      definition?.inventoryDie ??
      0;
    const die = collapseSupplyDice([current, ...item.reserveDice]);
    delete item.reserveDice;
    item.combinedSupply = true;
    item.supplyRemaining = die;
    if (hero) {
      hero.supplies ??= {};
      hero.supplies[item.instanceId] = die;
    }
  };
  for (const h of [
    ...campaign.party,
    ...(campaign.reserve ?? []),
    ...(campaign.fallenHeroes ?? []).map((e) => e.hero),
  ])
    for (const item of h.treasure ?? []) convert(item, h);
  for (const f of [campaign.floor, campaign.returnPassage?.floor].filter(
    Boolean,
  ))
    for (const chest of f.map.chests ?? [])
      for (const item of chest.items ?? []) convert(item);
  for (const rows of Object.values(campaign.market?.stock ?? {}))
    for (const { item } of rows) convert(item);
}
