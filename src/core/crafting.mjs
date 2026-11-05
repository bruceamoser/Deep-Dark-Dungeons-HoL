import { workshopCraft } from "../../public/vendor/hol/rules/workshop-crafting.mjs";
import { ordinaryItem, gearPreview } from "./treasure.mjs";

// Named materials enforce the source's compatibility and specialist pricing.
export const CRAFT_MATERIALS = Object.freeze({
  "recipe-smoke-flask": {
    name: "Charcoal, resin & smoke salts",
    price: 12,
    tool: "item-mixing-kit",
  },
  "recipe-bound-torches": {
    name: "Torch wood, fiber & fat",
    price: 12,
    tool: "item-craft-tools",
  },
  "recipe-fletched-ammunition": {
    name: "Shafts, feathers & binding",
    price: 12,
    tool: "item-craft-tools",
  },
  "recipe-travel-food": {
    name: "Safe edible ingredients",
    price: 12,
    tool: "either",
  },
  "recipe-lesser-healing-bottle": {
    name: "Moonmint & prepared life salts",
    price: 80,
    tool: "item-mixing-kit",
  },
  "recipe-twisted-cord": {
    name: "Long cordage fibers",
    price: 12,
    tool: "item-craft-tools",
  },
});
export const craftingMethods = {
  gatherFood(h) {
    if (this.mode !== "exploration" || this.map.foraged)
      throw new Error("This floor has no unharvested patch.");
    const reason = this.sleepReason();
    if (reason) throw new Error(reason);
    const r = this.heroRoll(h, "knowledge"),
      steps = { weak: 1, standard: 2, strong: 3 }[r.tier];
    let item = h.preview.inventory.items.find(
      (i) =>
        i.carried &&
        i.catalogId === "item-food-bundle" &&
        this.supplyValue(h, i) < 8,
    );
    if (!item) {
      item = ordinaryItem(
        this.C,
        "item-food-bundle",
        `harvest-${crypto.randomUUID()}`,
      );
      (h.treasure ??= []).push(item);
      h.supplies[item.instanceId] = 0;
    }
    const dice = [0, 4, 6, 8],
      before = this.supplyValue(h, item);
    h.supplies[item.instanceId] =
      dice[Math.min(3, Math.max(0, dice.indexOf(before)) + steps)];
    this.map.foraged = true;
    this.refreshHero(h);
    this.advanceTime(3600, { provisions: true });
    this.note(
      `${h.name} harvests the floor's edible patch: ${r.tier}, food now d${h.supplies[item.instanceId]}.`,
    );
  },
  craftingOptions(index) {
    const h = this.party[index];
    return this.R.craftingActions(h.preview, this.C).filter(
      ({ recipe }) => CRAFT_MATERIALS[recipe.id],
    );
  },
  buyMaterials(index, recipeId) {
    if (this.mode !== "town")
      throw new Error("Buy named materials in Greyhaven.");
    const h = this.party[index],
      material = CRAFT_MATERIALS[recipeId];
    if (
      !material ||
      !this.craftingOptions(index).some((o) => o.recipe.id === recipeId)
    )
      throw new Error("Learn the recipe and its crafting ability first.");
    const price = Math.ceil(
      material.price *
        Math.min(1, ...this.traits(h).map((t) => t.buyRate ?? 1)),
    );
    if (this.campaign.bank < price) throw new Error("Not enough vault coins.");
    const item = ordinaryItem(
      this.C,
      "item-material-bundle",
      `materials-${crypto.randomUUID()}`,
    );
    item.materialType = recipeId;
    h.treasure ??= [];
    h.treasure.push(item);
    this.campaign.bank -= price;
    this.refreshHero(h);
    this.note(`${h.name} buys ${material.name} · d6 · ${price} coins.`);
    this.emit("change");
  },
  craftReason(index, recipeId, abilityId, supplyId = "") {
    if (this.mode !== "town")
      return "Downtime crafting is available in Greyhaven.";
    const h = this.party[index],
      choice = this.craftingOptions(index).find(
        (o) => o.recipe.id === recipeId && o.ability.id === abilityId,
      );
    if (!choice || !this.canAct(h))
      return "A capable hero needs both this recipe and its crafting ability.";
    const material = CRAFT_MATERIALS[recipeId],
      items = h.preview.inventory.items.filter((i) => i.carried);
    if (
      !this.traits(h).some((t) => t.improvise) &&
      !items.some((i) =>
        material.tool === "either"
          ? ["item-craft-tools", "item-mixing-kit"].includes(i.catalogId)
          : i.catalogId === material.tool,
      )
    )
      return `Requires ${material.tool === "item-mixing-kit" ? "a mixing kit" : "craft tools"}.`;
    if (
      !items.some(
        (i) => i.materialType === recipeId && this.supplyValue(h, i) > 0,
      )
    )
      return `Requires ${material.name}.`;
    if (supplyId) {
      const supply = items.find(
        (i) =>
          i.instanceId === supplyId && i.catalogId === choice.recipe.product,
      );
      if (!supply) return "Choose a matching carried supply.";
      if (this.supplyValue(h, supply) >= choice.recipe.maximumDie)
        return "That supply is already full.";
    }
    return "";
  },
  craft(index, recipeId, abilityId, supplyId = "") {
    const reason = this.craftReason(index, recipeId, abilityId, supplyId);
    if (reason) throw new Error(reason);
    const h = this.party[index],
      { recipe } = this.craftingOptions(index).find(
        (o) => o.recipe.id === recipeId && o.ability.id === abilityId,
      );
    const material = h.preview.inventory.items.find(
      (i) =>
        i.carried && i.materialType === recipeId && this.supplyValue(h, i) > 0,
    );
    const automatic =
      abilityId === "ability-bottled-morning" &&
      recipeId === "recipe-lesser-healing-bottle";
    const roll = automatic
      ? null
      : this.heroRoll(h, "knowledge", "craft", { recipe: recipeId });
    if (
      roll &&
      roll.tier !== "strong" &&
      this.traits(h).some((t) => t.craftImprove) &&
      h.traitUses.craftImprove !== this.clock().day
    ) {
      roll.tier = roll.tier === "weak" ? "standard" : "strong";
      h.traitUses.craftImprove = this.clock().day;
    }
    const result = workshopCraft({
      play: h.draft.play ?? {},
      recipe,
      abilityId,
      tier: roll?.tier,
      items: h.preview.inventory.items.map((i) => ({
        ...i,
        inventoryDie: this.supplyValue(h, i),
      })),
      supplyId,
      instanceId: `inventory-crafted-${crypto.randomUUID()}`,
    });
    const nextDraft = { ...h.draft, play: result.play };
    const preview = gearPreview(this.R, this.C, h, nextDraft);
    if (!preview.valid)
      throw new Error("The crafted result failed inventory validation.");
    h.draft = nextDraft;
    const made = result.play.crafting[recipeId].supplyId;
    if (made)
      h.supplies[made] = result.play.inventory.overrides[made].inventoryDie;
    this.checkSupply(h, material, "crafting materials");
    this.refreshHero(h);
    this.advanceTime(recipe.attemptMinutes * 60, { provisions: true });
    this.note(
      `${h.name} · ${recipe.name}: ${automatic ? "no roll required" : roll.tier} · ${result.message} · one hour.`,
    );
    this.emit("change");
    return result;
  },
};
