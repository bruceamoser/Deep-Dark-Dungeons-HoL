// Preview-only equipment never changes carried items or their real held/worn flags.
export function appearanceEquipment(hero = {}) {
  const items = hero.preview?.inventory?.items ?? [];
  const carried = items.filter((i) => i.carried !== false);
  const ordinary = (id, hands) =>
    carried.some(
      (i) => i.catalogId === id && !i.base && (!hands || i.hands === hands),
    );
  return {
    one: ordinary("item-ordinary-melee-weapon", 1),
    two: ordinary("item-ordinary-melee-weapon", 2),
    bow: ordinary("item-ordinary-ranged-weapon"),
    shield: carried.some((i) => i.catalogId === "item-ordinary-shield"),
    backpack: carried.some((i) => i.catalogId === "item-travel-pack"),
  };
}
export function appearancePreviewHero(hero, key) {
  const items = hero.preview?.inventory?.items ?? [];
  const group = key?.startsWith("oneHand")
    ? "one"
    : key?.startsWith("twoHand")
      ? "two"
      : ["bow", "arrow"].includes(key)
        ? "bow"
        : key === "hairColor"
          ? "hair"
          : key;
  const match = items.find(
    (i) =>
      i.carried !== false &&
      (group === "one" || group === "two"
        ? !i.base &&
          i.catalogId === "item-ordinary-melee-weapon" &&
          i.hands === (group === "one" ? 1 : 2)
        : group === "bow"
          ? !i.base && i.catalogId === "item-ordinary-ranged-weapon"
          : group === "shield"
            ? i.catalogId === "item-ordinary-shield"
            : group === "backpack"
              ? i.catalogId === "item-travel-pack"
              : false),
  );
  let caption = "Equipped gear";
  if (!match && group !== "headpiece" && group !== "hair")
    return { hero, caption };
  const previewItems = items.map((i) => ({ ...i }));
  if (match) {
    caption = `Preview: ${match.definition?.name ?? group} · equipment unchanged`;
    if (group === "backpack")
      previewItems.find((i) => i.instanceId === match.instanceId).worn = true;
    else {
      for (const i of previewItems) if (i.hands) i.held = false;
      previewItems.find((i) => i.instanceId === match.instanceId).held = true;
    }
  } else {
    caption = "Preview: cosmetic headwear · equipped headgear unchanged";
    for (const i of previewItems) if (i.slot === "head") i.worn = false;
  }
  const draft =
    group === "hair" || group === "hairColor"
      ? {
          ...hero.draft,
          appearance: {
            ...hero.draft.appearance,
            mason: { ...hero.draft.appearance.mason, headpiece: "none" },
          },
        }
      : hero.draft;
  return {
    hero: {
      ...hero,
      draft,
      torch: { ...hero.torch, held: false },
      preview: {
        ...hero.preview,
        inventory: { ...hero.preview.inventory, items: previewItems },
      },
    },
    caption,
  };
}
