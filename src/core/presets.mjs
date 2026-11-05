/** Ready the published examples' owned starting equipment; never grant new items. */
export function readyExample(input, rules, catalogs) {
  const draft = structuredClone(input),
    character = rules.workshopCharacter(draft, catalogs);
  draft.loadout ??= {};
  let hands = 0;
  const heldTypes = ["item-ordinary-melee-weapon", "item-ordinary-shield"];
  for (const type of heldTypes) {
    const item = character.inventory.items.find((i) => i.catalogId === type);
    if (item && hands + (item.hands ?? 1) <= 2) {
      draft.loadout[item.instanceId] = {
        carried: true,
        held: true,
        worn: false,
      };
      hands += item.hands ?? 1;
    }
  }
  const armor = character.inventory.items.find((i) =>
    /item-ordinary-(heavy|medium|light)-armor/.test(i.catalogId),
  );
  if (armor)
    draft.loadout[armor.instanceId] = {
      carried: true,
      worn: true,
      held: false,
    };
  return draft;
}
