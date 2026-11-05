import { magicItem, ordinaryItem, recallScroll } from "./treasure.mjs";
export const MERCHANTS = [
  {
    id: "general",
    name: "Mara Thistledown",
    shop: "The Wayfarer’s Rest",
    trade: "General store",
    icon: "pack",
    quote: "A full pack weighs less than regret.",
    goods: [
      "item-ammunition-bundle",
      "item-rope-coil",
      "item-lighting-bundle",
      "item-food-bundle",
      "item-water-flask",
      "item-craft-tools",
    ],
  },
  {
    id: "armory",
    name: "Brann Ironwake",
    shop: "Ironwake Armory",
    trade: "Armorer",
    icon: "armor",
    quote: "Let the steel take the first blow.",
    goods: [
      "item-ordinary-light-armor",
      "item-ordinary-medium-armor",
      "item-ordinary-heavy-armor",
      "item-ordinary-shield",
    ],
    bases: ["light", "medium", "heavy", "shield"],
  },
  {
    id: "weapons",
    name: "Veyra Flint",
    shop: "The Tempered Edge",
    trade: "Weaponsmith",
    icon: "sword",
    quote: "Choose the weapon your hands remember.",
    goods: [
      "item-ordinary-melee-weapon",
      "item-ordinary-ranged-weapon",
      "item-ammunition-bundle",
    ],
    bases: ["blade", "bow"],
  },
  {
    id: "temple",
    name: "Sister Elowen",
    shop: "The Last Candle",
    trade: "Temple",
    icon: "heart",
    quote: "There is always a road home.",
    goods: ["item-lesser-healing-bottle"],
    scroll: true,
  },
  {
    id: "alchemy",
    name: "Orris Vale",
    shop: "Vale’s Crucible",
    trade: "Alchemist",
    icon: "potion",
    quote: "Mind the stopper. Mind the price.",
    goods: [
      "item-lesser-healing-bottle",
      "item-greater-healing-bottle",
      "item-superior-healing-bottle",
    ],
    scroll: true,
  },
  {
    id: "arcana",
    name: "Neris Quill",
    shop: "The Seventh Lantern",
    trade: "Magic shop",
    icon: "star",
    quote: "Power answers to discipline, not ownership.",
    goods: [],
    scroll: true,
    bases: ["ring", "belt", "boots", "hat", "brooch", "gloves"],
  },
];
export const marketMethods = {
  buyPrice(h, item) {
    return Math.ceil(
      item.definition.price *
        Math.min(1, ...this.traits(h).map((t) => t.buyRate ?? 1)),
    );
  },
  sellPrice(h, item) {
    return Math.floor(
      item.definition.price *
        Math.max(0.5, ...this.traits(h).map((t) => t.sellRate ?? 0.5)),
    );
  },
  market() {
    const epoch = this.campaign.expeditions,
      depth = this.campaign.deepest ?? this.campaign.depth;
    if (this.campaign.market?.epoch === epoch) {
      const stock = this.campaign.market.stock.general;
      for (const id of MERCHANTS.find((m) => m.id === "general").goods)
        if (!stock.some((e) => e.item.catalogId === id))
          stock.push({
            id: `general-added-${id}`,
            item: ordinaryItem(this.C, id, `stock-added-${id}`),
            quantity: 8,
          });
      return this.campaign.market;
    }
    const stock = {};
    for (const [mi, m] of MERCHANTS.entries()) {
      const seed = (this.campaign.seed + epoch * 17471 + mi * 797) >>> 0;
      stock[m.id] = m.goods
        .filter((id) => this.C.inventory.equipment.some((d) => d.id === id))
        .map((id, i) => ({
          id: `${m.id}-${i}`,
          item: ordinaryItem(this.C, id, `stock-${seed}-${i}`),
          quantity: 8,
        }));
      if (m.scroll)
        stock[m.id].push({
          id: m.id + "-recall",
          item: recallScroll(seed),
          quantity: 6,
        });
      for (const [i, base] of (m.bases ?? []).entries()) {
        if ((base === "medium" && depth < 3) || (base === "heavy" && depth < 7))
          continue;
        const item = magicItem(seed + i + 123, Math.max(1, depth), { base });
        stock[m.id].push({ id: item.instanceId, item, quantity: 1 });
      }
    }
    return (this.campaign.market = { epoch, stock });
  },
  buy(shop, id, index = this.selected) {
    if (this.mode !== "town")
      throw new Error("Visit the merchants in Greyhaven.");
    const h = this.party[index],
      entry = this.market().stock[shop]?.find((e) => e.id === id);
    if (!h || h.survival.status === "dead" || !entry || entry.quantity < 1)
      throw new Error("This purchase is unavailable.");
    const price = this.buyPrice(h, entry.item);
    if (this.campaign.bank < price)
      throw new Error("Not enough coins in the company vault.");
    const item = structuredClone(entry.item);
    // Each ordinary purchase receives a unique receipt; magical stock is a unique object.
    if (!item.base) item.instanceId = `purchase-${crypto.randomUUID()}`;
    (h.treasure ??= []).push(item);
    this.refreshHero(h);
    entry.quantity--;
    this.campaign.bank -= price;
    this.note(`${h.name} buys ${item.definition.name} for ${price} coins.`);
    this.emit("party");
    this.emit("change");
  },
  sell(shop, index, id) {
    if (this.mode !== "town" || !MERCHANTS.some((m) => m.id === shop))
      throw new Error("Visit a merchant in Greyhaven.");
    const h = this.party[index],
      item = h?.preview.inventory.items.find((i) => i.instanceId === id);
    if (
      !item?.carried ||
      !Number.isFinite(item.definition.price) ||
      item.held ||
      item.worn
    )
      throw new Error("Stow or remove an item before selling it.");
    if (
      item.inventoryDie &&
      (h.supplies[id] ?? item.inventoryDie) !== item.inventoryDie
    )
      throw new Error("Merchants cannot value a partly used supply.");
    if (item.kind === "scroll" && item.quantity < 1)
      throw new Error("That scroll was consumed.");
    const value = this.sellPrice(h, item);
    if (value < 1) throw new Error("There is no offer for this item.");
    if (h.treasure?.some((i) => i.instanceId === id))
      h.treasure = h.treasure.filter((i) => i.instanceId !== id);
    else {
      h.soldItems ??= [];
      h.soldItems.push(id);
      h.draft.loadout ??= {};
      h.draft.loadout[id] = { carried: false, worn: false, held: false };
    }
    this.campaign.bank += value;
    this.refreshHero(h);
    this.note(`Sold ${item.definition.name} for ${value} coins.`);
    this.emit("party");
    this.emit("change");
  },
  recallReason(index = this.selected) {
    const h = this.party[index];
    if (this.mode !== "exploration" || this.busy)
      return "Read the scroll in a quiet chamber outside combat.";
    if (!h || !this.canAct(h)) return "Choose a capable reader.";
    if (
      this.woundNotices?.length ||
      this.party.some((h) => ["dying", "lastWords"].includes(h.survival.status))
    )
      return "Resolve wounds and survival before travel.";
    if (
      h.preview.inventory.items
        .filter((i) => i.held)
        .reduce((n, i) => n + (i.hands ?? 0), 0) >= 2
    )
      return "Free one hand to read the scroll.";
    return "";
  },
  useRecall(index = this.selected, id = null) {
    const reason = this.recallReason(index);
    if (reason) throw new Error(reason);
    const h = this.party[index],
      item = h.treasure?.find(
        (i) => i.kind === "scroll" && (!id || i.instanceId === id),
      );
    if (!item) throw new Error("This hero has no Scroll of Return.");
    h.treasure = h.treasure.filter((i) => i !== item);
    this.refreshHero(h);
    this.bankTreasureXP();
    this.campaign.bank += this.campaign.haul;
    this.campaign.haul = 0;
    this.campaign.returnPassage = {
      depth: this.campaign.depth,
      seed: this.campaign.seed,
      floor: structuredClone({
        map: this.map,
        seen: this.seen,
        enemies: this.enemies,
      }),
    };
    this.mode = "town";
    this.paths.clear();
    this.pendingInteraction = null;
    this.note(
      `The scroll opens a passage to Greyhaven. Your way back to depth ${this.campaign.depth} remains open.`,
    );
    this.emit("party");
    this.emit("change");
  },
  returnThroughPassage() {
    const passage = this.campaign.returnPassage;
    if (this.mode !== "town" || !passage)
      throw new Error("There is no return passage.");
    if (
      this.party.some(
        (h) =>
          h.survival.status !== "active" || h.wounds.some((w) => !w.applied),
      )
    )
      throw new Error("Prepare four active heroes before returning.");
    this.campaign.depth = passage.depth;
    this.campaign.seed = passage.seed;
    this.newFloor(structuredClone(passage.floor));
    this.campaign.returnPassage = null;
    this.party.forEach((h, i) =>
      Object.assign(h, {
        x: this.map.start.x + (i % 2),
        z: this.map.start.z + Math.floor(i / 2),
      }),
    );
    this.campaign.expeditions++;
    this.mode = "exploration";
    this.encounter = null;
    this.busy = false;
    this.paths.clear();
    this.note(
      `The passage returns the company to depth ${this.campaign.depth}. The dungeon remembers.`,
    );
    this.emit("party");
    this.emit("change");
  },
};
