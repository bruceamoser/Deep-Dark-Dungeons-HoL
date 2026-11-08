import { traitsOf } from "./ancestry-game.mjs";
import { Random } from "./dungeon.mjs";
import { distance, lineOfSight } from "./dungeon.mjs";

// Dungeon adaptations. Printed examples are identified individually; no creation choices are changed.
export const EQUIPMENT_SLOTS = [
  ["head", "Head", "hat"],
  ["neck", "Neck", "necklace"],
  ["back", "Back", "pack"],
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
  stormbite: {
    name: "Stormbite",
    kind: "weapon",
    discipline: "storm",
    type: "lightning",
    effect: "damage",
    condition: "slowed",
    color: 0xa2b8ff,
  },
  bloodletter: {
    name: "Bloodletter",
    kind: "weapon",
    type: "physical",
    effect: "damage",
    condition: "bleeding",
    color: 0xea526f,
  },
  mindpiercer: {
    name: "Mindpiercer",
    kind: "weapon",
    discipline: "mind",
    type: "mental",
    effect: "damage",
    condition: "dazed",
    color: 0xb187ff,
  },
  duelist: {
    name: "Duelist’s",
    effect: "build",
    stat: "critical",
    color: 0xffd28c,
  },
  lifebloom: {
    name: "Lifebloom",
    discipline: "life",
    effect: "build",
    stat: "heal",
    color: 0x68e0a4,
  },
  ram: { name: "Ram’s", effect: "build", stat: "impact", color: 0xe8ad71 },
  stalker: {
    name: "Stalker’s",
    effect: "build",
    stat: "ambush",
    color: 0xb7a0ff,
  },
  wardweaver: {
    name: "Wardweaver’s",
    effect: "build",
    stat: "barrier",
    color: 0x81dbef,
  },
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
  "of the Ashen Gate",
  "of Shattered Oaths",
  "of the Last Dawn",
  "of the Drowned Court",
  "of Falling Crowns",
  "of the Red Pilgrim",
  "of Thorn and Bone",
  "of the Nine Roads",
  "of the Moonless Hunt",
  "of the Iron Choir",
  "of the First Spark",
  "of the Silent Bell",
];
export const RELICS = {
  "cinder-crown": {
    name: "The Cinder Sovereign",
    base: "hat",
    affixes: ["flameward"],
    stats: { wildfire: 1, fire: 2 },
    discipline: "flame",
    color: 0xff7138,
  },
  "winter-verdict": {
    name: "Winter’s Verdict",
    base: "blade",
    affixes: ["rime"],
    stats: { shatter: 4 },
    discipline: "frost",
    color: 0x73e1ff,
  },
  thunderwake: {
    name: "Thunderwake",
    base: "bow",
    affixes: ["stormbite"],
    stats: { chain: 3, lightning: 1 },
    discipline: "storm",
    color: 0xb5adff,
  },
  "last-bastion": {
    name: "The Last Bastion",
    base: "shield",
    affixes: ["wardweaver"],
    stats: { barrier: 3, reduction: 1 },
    discipline: "guard",
    color: 0x70ddd1,
  },
  "pilgrim-step": {
    name: "Steps Between Worlds",
    base: "boots",
    affixes: ["wind"],
    stats: { moveDamage: 3 },
    discipline: "athletics",
    color: 0x8becbd,
  },
  "blood-debt": {
    name: "The Blood Debt",
    base: "ring",
    affixes: ["duelist"],
    stats: { killHeal: 3, bleeding: 1 },
    color: 0xed6278,
  },
  "black-thread": {
    name: "Black Thread Covenant",
    base: "gloves",
    affixes: ["stalker"],
    stats: { ambush: 4, critical: 2 },
    discipline: "subterfuge",
    color: 0xc394ff,
  },
  "dawn-chorus": {
    name: "Chorus of the Unbroken",
    base: "brooch",
    affixes: ["lifebloom"],
    stats: { healingWard: 3, heal: 1 },
    discipline: "life",
    color: 0xffe299,
  },
};
const basesForDepth = (d) =>
  Object.keys(ITEM_BASES).filter(
    (k) => (k !== "medium" || d >= 3) && (k !== "heavy" || d >= 7),
  );
export function magicItem(seed, depth = 1, options = {}) {
  const relic = options.relic ? RELICS[options.relic] : null;
  if (options.relic && !relic) throw new Error("Unknown relic identity.");
  if (relic)
    options = {
      ...options,
      base: relic.base,
      affixes: relic.affixes,
      power: 2,
    };
  const revision = options.revision ?? 2;
  if (![1, 2].includes(revision)) throw new Error("Unknown treasure revision.");
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
  const first = pool[rng.int(0, pool.length - 1)];
  const second = pool.filter((k) => k !== first);
  const affixes =
    options.affixes ??
    (depth >= 3 && rng.next() < 0.55
      ? [first, second[rng.int(0, second.length - 1)]]
      : [first]);
  if (
    affixes.length < 1 ||
    affixes.length > 2 ||
    new Set(affixes).size !== affixes.length ||
    ![1, 2].includes(power) ||
    affixes.some((k) => !pool.includes(k))
  )
    throw new Error("Invalid enchantment for this form.");
  const suffix = names[rng.int(0, (revision === 1 ? 6 : names.length) - 1)];
  const name =
    relic?.name ??
    `${affixes.map((a) => ENCHANTMENTS[a].name).join(" ")} ${def.name} ${suffix}`;
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
              : e.effect === "build"
                ? `+${power} ${e.stat} while equipped.`
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
  if (relic)
    for (const [stat, value] of Object.entries(relic.stats))
      effects.push({
        id: `relic-${stat}`,
        name: relic.name,
        effect: "build",
        stat,
        value,
        discipline: relic.discipline,
        rank: relic.discipline ? 1 : 0,
        color: relic.color,
        text: `+${value} ${stat} while equipped.`,
        source: "Unique dungeon relic",
      });
  return {
    instanceId: `relic-${seed >>> 0}-${base}`,
    catalogId: def.catalogId ?? `relic-${base}`,
    base,
    slot: def.slot,
    icon: def.icon,
    seed: seed >>> 0,
    depth,
    revision,
    relic: options.relic ?? null,
    power,
    affixes,
    rarity: relic
      ? "relic"
      : power === 2 || affixes.length > 1
        ? "rare"
        : "enchanted",
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
  if (item.catalogId === "item-travel-pack") return "back";
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
              revision: saved.revision ?? 1,
              relic: saved.relic,
            });
    if (item.instanceId !== saved.instanceId)
      throw new Error("Invalid saved treasure identity.");
    return {
      ...item,
      hands:
        saved.kind === "ordinary" &&
        item.definition.handChoices?.includes(saved.hands)
          ? saved.hands
          : item.hands,
      quantity: saved.quantity ?? item.quantity,
      bulk: item.definition.bulk * (saved.quantity ?? item.quantity),
      materialType: saved.materialType,
      definition: saved.materialType
        ? {
            ...item.definition,
            price:
              saved.materialType === "recipe-lesser-healing-bottle" ? 80 : 12,
            name: `${item.definition.name} · ${saved.materialType.replace("recipe-", "").replaceAll("-", " ")}`,
          }
        : saved.definition?.name
          ? { ...item.definition, name: saved.definition.name }
          : item.definition,
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
  p.summary.stability = Math.max(
    p.summary.stability ?? 0,
    ...traitsOf(subject).map((t) => t.stability ?? 0),
  );
  for (const t of traitsOf(subject))
    for (const [type, value] of Object.entries(t.resistance ?? {}))
      p.resistances[type] = Math.max(p.resistances[type] ?? 0, value);
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
  p.inventory.bulk = p.inventory.items
    .filter(
      (i) => i.carried && !(i.worn && i.catalogId === "item-travel-clothes"),
    )
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
  if (
    p.state.abilities.includes("ability-wake-the-iron-rune") &&
    p.inventory.items.some(
      (i) => i.carried && i.worn && /armor/.test(i.catalogId),
    )
  )
    p.summary.stability = Math.max(p.summary.stability ?? 0, 1);
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
  uniqueMagic(seed, depth, options = {}) {
    this.campaign.generatedMagic ??= [];
    const seen = new Set(this.campaign.generatedMagic);
    const heroes = [
      ...(this.campaign.party ?? []),
      ...(this.campaign.reserve ?? []),
      ...(this.campaign.fallenHeroes ?? []).map((f) => f.hero),
    ];
    const existing = [
      ...heroes.flatMap((h) => h.treasure ?? []),
      ...[this.map, this.campaign.returnPassage?.floor?.map].flatMap((m) =>
        (m?.chests ?? []).flatMap((c) => c.items ?? []),
      ),
      ...Object.values(this.campaign.market?.stock ?? {}).flatMap((rows) =>
        rows.map((r) => r.item),
      ),
    ];
    for (const i of existing.filter((i) => i.base)) {
      seen.add(i.definition.name);
      seen.add(`item:${i.instanceId}`);
      if (i.relic) seen.add(`relic:${i.relic}`);
    }
    if (options.boss) {
      const available = Object.keys(RELICS).filter(
        (id) => !seen.has(`relic:${id}`) && !seen.has(RELICS[id].name),
      );
      if (available.length)
        options = { relic: available[(seed >>> 0) % available.length] };
    }
    for (let n = 0; n < 1024; n++) {
      const item = magicItem((seed + n * 104729) >>> 0, depth, options);
      if (
        seen.has(item.definition.name) ||
        seen.has(`item:${item.instanceId}`) ||
        (item.relic && seen.has(`relic:${item.relic}`))
      )
        continue;
      seen.add(item.definition.name);
      seen.add(`item:${item.instanceId}`);
      if (item.relic) seen.add(`relic:${item.relic}`);
      this.campaign.generatedMagic = [...seen];
      return item;
    }
    this.campaign.generatedMagic = [...seen];
    return null; // Exhausted combinations produce no duplicate prize.
  },
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
    if (
      this.mode !== "town" &&
      (distance(h, target) > 2 || !lineOfSight(this.map, h, target))
    )
      throw new Error(
        "Move the companions within 2 squares with a clear path to hand over gear.",
      );
    const item = this.portableItem(h, id);
    if (target.treasure?.some((i) => i.instanceId === item.instanceId))
      throw new Error("That companion already owns this item.");
    this.removePortableItem(h, id);
    (target.treasure ??= []).push(item);
    if (item.supplyRemaining != null)
      target.supplies[item.instanceId] = item.supplyRemaining;
    delete h.supplies[id];
    this.refreshHero(h);
    this.refreshHero(target);
    this.syncTorches();
    this.note(`${h.name} gives ${item.definition.name} to ${target.name}.`);
    this.emit("party");
    this.emit("change");
  },
  portableItem(h, id) {
    const owned = h.preview.inventory.items.find((i) => i.instanceId === id);
    if (!owned)
      throw new Error("Choose an item in this character’s inventory.");
    const recovered = h.treasure?.find((i) => i.instanceId === id);
    const item = recovered
      ? structuredClone(recovered)
      : {
          ...ordinaryItem(this.C, owned.catalogId, `carried-${h.heroId}-${id}`),
          quantity: owned.quantity,
          hands: owned.hands,
          bulk: owned.bulk,
        };
    Object.assign(item, { held: false, worn: false, carried: true });
    delete item.equippedSlot;
    const supply = this.supplyValue(h, owned);
    if (supply || Object.hasOwn(h.supplies, id)) item.supplyRemaining = supply;
    return item;
  },
  removePortableItem(h, id) {
    if (h.treasure?.some((i) => i.instanceId === id))
      h.treasure = h.treasure.filter((i) => i.instanceId !== id);
    else (h.soldItems ??= []).push(id); // Historical creation receipts stay intact.
  },
  dropItem(index, id) {
    const h = this.party[index];
    if (this.mode !== "exploration" || this.busy || !this.canAct(h))
      throw new Error("Drop items on the dungeon floor outside combat.");
    const item = this.portableItem(h, id);
    this.removePortableItem(h, id);
    delete h.supplies[id];
    let pile = this.map.chests.find(
      (c) => c.dropped && c.x === h.x && c.z === h.z,
    );
    if (!pile) {
      pile = {
        id: `dropped-${crypto.randomUUID()}`,
        x: h.x,
        z: h.z,
        coins: 0,
        opened: true,
        dropped: true,
        recipeSearched: true,
        items: [],
      };
      this.map.chests.push(pile);
    }
    pile.items.push(item);
    this.refreshHero(h);
    this.syncTorches();
    this.note(
      `${h.name} drops ${item.definition.name}. It can be recovered from the ground cache.`,
    );
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
    if (item.supplyRemaining != null || item.inventoryDie)
      h.supplies[item.instanceId] = item.supplyRemaining ?? item.inventoryDie;
    world.source.items = world.source.items.filter((i) => i !== item);
    this.refreshHero(h);
    this.note(`${h.name} recovers ${item.definition.name}.`);
    this.emit("loot", { chest: world.source });
    this.emit("party");
    this.emit("change");
  },
};
