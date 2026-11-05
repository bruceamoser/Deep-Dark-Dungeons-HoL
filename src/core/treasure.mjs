import { Random } from "./dungeon.mjs";

// Dungeon adaptations. Printed examples are identified individually; no creation choices are changed.
export const EQUIPMENT_SLOTS = [
  ["head", "Head", "hat"],
  ["neck", "Neck", "necklace"],
  ["body", "Body", "armor"],
  ["hands", "Hands", "hand"],
  ["waist", "Waist", "belt"],
  ["feet", "Feet", "boot"],
  ["ring-left", "Left ring", "ring"],
  ["ring-right", "Right ring", "ring"],
  ["main", "Main hand", "sword"],
  ["off", "Off hand", "shield"],
];
export const ITEM_BASES = {
  blade: {
    name: "Sword",
    slot: "main",
    catalogId: "item-ordinary-melee-weapon",
    hands: 1,
    icon: "sword",
  },
  bow: {
    name: "Longbow",
    slot: "main",
    catalogId: "item-ordinary-ranged-weapon",
    hands: 2,
    icon: "bow",
  },
  shield: {
    name: "Shield",
    slot: "off",
    catalogId: "item-ordinary-shield",
    hands: 1,
    icon: "shield",
  },
  light: {
    name: "Leather Armor",
    slot: "body",
    catalogId: "item-ordinary-light-armor",
    armor: "light",
    icon: "armor",
  },
  medium: {
    name: "Mail Armor",
    slot: "body",
    catalogId: "item-ordinary-medium-armor",
    armor: "medium",
    icon: "armor",
  },
  heavy: {
    name: "Plate Armor",
    slot: "body",
    catalogId: "item-ordinary-heavy-armor",
    armor: "heavy",
    icon: "armor",
  },
  belt: { name: "Belt", slot: "waist", icon: "belt" },
  boots: { name: "Boots", slot: "feet", icon: "boot" },
  hat: { name: "Crown", slot: "head", icon: "hat" },
  ring: { name: "Ring", slot: "ring", icon: "ring" },
  brooch: { name: "Brooch", slot: "neck", icon: "necklace" },
  gloves: { name: "Gloves", slot: "hands", icon: "hand" },
};
export const ENCHANTMENTS = {
  ember: {
    name: "Ember",
    kind: "weapon",
    discipline: "flame",
    type: "fire",
    effect: "damage",
    condition: "burning",
    color: 0xed8a42,
  },
  rime: {
    name: "Rime",
    kind: "weapon",
    discipline: "frost",
    type: "cold",
    effect: "damage",
    condition: "freezing",
    color: 0x76c9ed,
  },
  flameward: {
    name: "Cinderward",
    discipline: "flame",
    type: "fire",
    effect: "resistance",
    color: 0xd49b69,
  },
  frostward: {
    name: "Winterward",
    discipline: "frost",
    type: "cold",
    effect: "resistance",
    color: 0x8dd5e9,
  },
  grave: {
    name: "Gravebound",
    type: "life",
    effect: "resistance",
    color: 0x8cb79b,
  },
  might: {
    name: "Might",
    effect: "attribute",
    attribute: "brawn",
    color: 0xc5aa67,
  },
  wind: {
    name: "Wayfarer",
    discipline: "storm",
    effect: "speed",
    color: 0x9bd1c6,
  },
};
const names = [
  "of the Hollow King",
  "of Quiet Embers",
  "of the Lost Watch",
  "of the Deep Road",
  "of Pale Stars",
  "of Greyhaven",
];
const basesForDepth = (d) =>
  Object.keys(ITEM_BASES).filter(
    (k) => (k !== "medium" || d >= 3) && (k !== "heavy" || d >= 7),
  );
export function magicItem(seed, depth = 1, options = {}) {
  if (
    !Number.isSafeInteger(seed) ||
    seed < 0 ||
    seed > 4294967295 ||
    !Number.isInteger(depth) ||
    depth < 1
  )
    throw new Error("Invalid treasure generation receipt.");
  const rng = new Random(seed),
    bases = basesForDepth(depth),
    base = options.base ?? bases[rng.int(0, bases.length - 1)];
  if (!ITEM_BASES[base]) throw new Error("Unknown treasure form.");
  const def = ITEM_BASES[base],
    weapon = ["blade", "bow"].includes(base);
  const pool = Object.keys(ENCHANTMENTS).filter((k) =>
    weapon ? ENCHANTMENTS[k].kind === "weapon" : !ENCHANTMENTS[k].kind,
  );
  const power = options.power ?? (depth >= 7 && rng.next() < 0.35 ? 2 : 1);
  const affixes = options.affixes ?? [pool[rng.int(0, pool.length - 1)]];
  if (
    affixes.length < 1 ||
    affixes.length > 2 ||
    new Set(affixes).size !== affixes.length ||
    ![1, 2].includes(power) ||
    affixes.some((k) => !pool.includes(k))
  )
    throw new Error("Invalid enchantment for this form.");
  const suffix = names[rng.int(0, names.length - 1)];
  const name = `${ENCHANTMENTS[affixes[0]].name} ${def.name} ${suffix}`;
  const effects = affixes.map((id) => {
    const e = ENCHANTMENTS[id];
    return {
      id,
      ...e,
      value: ["attribute", "speed"].includes(e.effect) ? 1 : power,
      rank: e.discipline ? power : 0,
      text:
        e.effect === "damage"
          ? `+${power} ${e.type} damage with this weapon; ${e.condition} 1 on Strong.`
          : e.effect === "resistance"
            ? `${e.type[0].toUpperCase() + e.type.slice(1)} resistance ${power}${e.type === "life" ? "; also reduces Life healing" : ""}.`
            : e.effect === "attribute"
              ? "+1 Brawn while equipped. Does not change creation DP, HP or eligibility."
              : "+1 Speed while worn.",
      source:
        id === "ember" && base === "blade" && power === 1
          ? "Ember Edge · book effect"
          : id === "might"
            ? "Cincture of Might · book effect, adapted form"
            : id === "grave" && power === 1
              ? "Gravebound Brooch · book effect, adapted form"
              : "Dungeon adaptation",
    };
  });
  return {
    instanceId: `relic-${seed >>> 0}-${base}`,
    catalogId: def.catalogId ?? `relic-${base}`,
    base,
    slot: def.slot,
    icon: def.icon,
    seed: seed >>> 0,
    depth,
    power,
    affixes,
    rarity: power === 2 ? "rare" : "enchanted",
    effects,
    definition: {
      id: `relic-${seed >>> 0}-${base}`,
      name,
      bulk: 1,
      price: 180 + power * 140,
      handChoices: def.hands ? [def.hands] : [],
      source: { path: "docs/encounters-and-treasure.md" },
    },
    hands: def.hands ?? 0,
    bulk: 1,
    quantity: 1,
    carried: true,
    held: false,
    worn: false,
    inventoryDie: null,
  };
}
export function ordinaryItem(C, catalogId, instanceId) {
  const definition = C.inventory.equipment.find((i) => i.id === catalogId);
  if (!definition) throw new Error("Unknown ordinary equipment.");
  return {
    kind: "ordinary",
    catalogId,
    instanceId,
    definition: structuredClone(definition),
    hands: definition.handChoices?.[0] ?? 0,
    bulk: definition.bulk,
    quantity: 1,
    carried: true,
    held: false,
    worn: false,
    inventoryDie: definition.inventoryDie,
  };
}
export function recallScroll(seed, instanceId = `recall-${seed >>> 0}`) {
  return {
    kind: "scroll",
    instanceId,
    catalogId: "dungeon-scroll-return",
    seed,
    icon: "book",
    definition: { name: "Scroll of Return", price: 60, bulk: 1 },
    quantity: 1,
    bulk: 1,
    hands: 0,
    carried: true,
    held: false,
    worn: false,
    inventoryDie: null,
  };
}
export function slotOf(item) {
  if (item.slot)
    return item.slot === "ring"
      ? (item.equippedSlot ?? "ring-left")
      : item.slot;
  if (/armor|travel-clothes/.test(item.catalogId)) return "body";
  if (/shield/.test(item.catalogId)) return "off";
  if (item.hands) return "main";
  return null;
}
export function effectStatus(hero, effect) {
  const rank =
    hero.preview?.state.ranks?.[`discipline-${effect.discipline}`] ?? 0;
  return {
    active: !effect.discipline || rank >= effect.rank,
    rank,
    requirement: effect.discipline
      ? `${effect.discipline[0].toUpperCase() + effect.discipline.slice(1)} ${effect.rank}`
      : "No discipline required",
  };
}
export function activeItemEffects(hero, item) {
  if (!item.carried || !(item.hands ? item.held : item.worn)) return [];
  return (item.effects ?? []).filter((e) => effectStatus(hero, e).active);
}
export function gearPreview(R, C, hero, draft = hero.draft) {
  const p = R.workshopCharacter(draft, C);
  if (!p.valid) return p;
  const treasure = (hero.treasure ?? []).map((saved) => {
    // Rebuild mechanics from the generation receipt; never trust persisted effect values.
    const item =
      saved.kind === "ordinary"
        ? ordinaryItem(C, saved.catalogId, saved.instanceId)
        : saved.kind === "scroll"
          ? recallScroll(saved.seed, saved.instanceId)
          : magicItem(saved.seed, saved.depth, {
              base: saved.base,
              power: saved.power,
              affixes: saved.affixes,
            });
    if (item.instanceId !== saved.instanceId)
      throw new Error("Invalid saved treasure identity.");
    return {
      ...item,
      carried: saved.carried !== false,
      held: !!saved.held,
      worn: !!saved.worn,
      equippedSlot: saved.equippedSlot,
    };
  });
  if (new Set(treasure.map((i) => i.instanceId)).size !== treasure.length)
    throw new Error("Duplicate treasure identity.");
  p.inventory.items = p.inventory.items.filter(
    (i) => !hero.soldItems?.includes(i.instanceId),
  );
  p.inventory.items.push(...treasure);
  const subject = { ...hero, preview: p };
  p.equipmentEffects = p.inventory.items.flatMap((i) =>
    activeItemEffects(subject, i),
  );
  p.attributes = { ...draft.attributes };
  for (const a of Object.keys(p.attributes))
    p.attributes[a] += Math.max(
      0,
      ...p.equipmentEffects
        .filter((e) => e.effect === "attribute" && e.attribute === a)
        .map((e) => e.value),
    );
  for (const armor of p.inventory.items.filter((i) => i.worn && i.carried)) {
    const tier = armor.catalogId.match(
      /item-ordinary-(light|medium|heavy)-armor/,
    )?.[1];
    if (tier && p.state.abilities.includes(`ability-wear-${tier}-armor`))
      p.resistances.physical = Math.max(
        p.resistances.physical ?? 0,
        { light: 1, medium: 2, heavy: 3 }[tier],
      );
  }
  for (const e of p.equipmentEffects.filter((e) => e.effect === "resistance"))
    p.resistances[e.type] = Math.min(
      3,
      Math.max(p.resistances[e.type] ?? 0, e.value),
    );
  p.inventory.bulk += treasure
    .filter((i) => i.carried)
    .reduce((n, i) => n + i.bulk, 0);
  p.inventory.capacity += 3 * (p.attributes.brawn - draft.attributes.brawn);
  p.inventory.encumbrance = Math.max(
    0,
    p.inventory.bulk - p.inventory.capacity,
  );
  p.summary.speed = Math.max(
    0,
    p.summary.unencumberedSpeed -
      p.inventory.encumbrance +
      Math.max(
        0,
        ...p.equipmentEffects
          .filter((e) => e.effect === "speed")
          .map((e) => e.value),
      ),
  );
  const equipped = p.inventory.items.filter(
    (i) => i.carried && (i.held || i.worn),
  );
  if (
    equipped.filter((i) => i.held).reduce((n, i) => n + (i.hands ?? 0), 0) > 2
  )
    throw new Error("Equipment exceeds two hands.");
  const worn = equipped.filter((i) => i.worn && i.base).map(slotOf);
  if (
    new Set(worn).size !== worn.length ||
    worn.some((s) => !EQUIPMENT_SLOTS.some(([id]) => id === s))
  )
    throw new Error("Invalid worn equipment slots.");
  return p;
}
export const treasureMethods = {
  attribute(h, key) {
    return h.preview.attributes?.[key] ?? h.draft.attributes[key];
  },
  refreshHero(h, draft = h.draft) {
    h.preview = gearPreview(this.R, this.C, h, draft);
    return h.preview;
  },
  transferTreasure(index, id, to) {
    const h = this.party[index],
      target = this.party[to];
    if (
      !["town", "exploration"].includes(this.mode) ||
      this.busy ||
      !target ||
      target === h ||
      !this.canAct(h) ||
      !this.canAct(target)
    )
      throw new Error(
        "Transfer equipment between capable companions outside combat.",
      );
    const item = h.treasure?.find((i) => i.instanceId === id);
    if (!item) throw new Error("Choose recovered treasure.");
    if (target.treasure?.some((i) => i.instanceId === id))
      throw new Error("That companion already owns this item.");
    h.treasure = h.treasure.filter((i) => i !== item);
    item.held = false;
    item.worn = false;
    delete item.equippedSlot;
    (target.treasure ??= []).push(item);
    this.refreshHero(h);
    this.refreshHero(target);
    this.note(`${h.name} gives ${item.definition.name} to ${target.name}.`);
    this.emit("party");
    this.emit("change");
  },
  takeTreasure(cofferId, instanceId, index = this.selected) {
    const world = this.worldInteractions().find((i) => i.id === cofferId),
      reason = this.interactionReason({
        ...world,
        available: !!world?.source?.items?.length,
      });
    if (reason) throw new Error(reason);
    const h = this.party[index];
    if (!h || !this.canAct(h)) throw new Error("Choose a capable companion.");
    const item = world.source.items.find((i) => i.instanceId === instanceId);
    if (!item) throw new Error("That item has already been taken.");
    if (
      this.livingRoster().some((p) =>
        p.treasure?.some((i) => i.instanceId === instanceId),
      )
    )
      throw new Error("This item already belongs to the company.");
    (h.treasure ??= []).push(structuredClone(item));
    world.source.items = world.source.items.filter((i) => i !== item);
    this.refreshHero(h);
    this.note(`${h.name} recovers ${item.definition.name}.`);
    this.emit("loot", { chest: world.source });
    this.emit("party");
    this.emit("change");
  },
};
