import { ordinaryItem } from "./treasure.mjs";
import { POWERS } from "./powers.mjs";
import { MATERIAL_ITEMS } from "./supply-stock.mjs";
const recipe = (
  id,
  name,
  product,
  die,
  minutes,
  materialPrice,
  tool,
  extra = {},
) => ({
  id: `recipe-${id}`,
  name,
  product,
  maximumDie: die,
  minutes,
  materialPrice,
  tool,
  level: 1,
  learnPrice: 20,
  location: "camp",
  ...extra,
});
export const RECIPES = Object.freeze([
  recipe(
    "bound-torches",
    "Bound torches",
    "item-lighting-bundle",
    6,
    30,
    3,
    "item-craft-tools",
    { basic: true, materials: "Wood, fiber and tallow" },
  ),
  recipe(
    "fletched-ammunition",
    "Fletched arrows",
    "item-ammunition-bundle",
    8,
    30,
    5,
    "item-craft-tools",
    { basic: true, materials: "Shafts, feathers and binding" },
  ),
  recipe("travel-food", "Trail rations", "item-food-bundle", 8, 30, 5, null, {
    basic: true,
    materials: "Preserved grain and vegetables",
  }),
  recipe(
    "twisted-cord",
    "Braided rope",
    "item-rope-coil",
    null,
    45,
    4,
    "item-craft-tools",
    { materials: "Cordage fibers" },
  ),
  recipe(
    "smoke-flask",
    "Smoke flask",
    "item-smoke-supply",
    6,
    45,
    8,
    "item-mixing-kit",
    { materials: "Resin, charcoal and salts" },
  ),
  recipe(
    "lesser-healing-bottle",
    "Healing potion",
    "item-lesser-healing-bottle",
    4,
    60,
    12,
    "item-mixing-kit",
    { materials: "Moonmint and life salts", location: "town", learnPrice: 30 },
  ),
  recipe(
    "field-dressing",
    "Field dressing",
    "item-field-dressing",
    4,
    30,
    8,
    null,
    { materials: "Clean linen and antiseptic herbs" },
  ),
  recipe(
    "flash-powder",
    "Flash powder",
    "item-flash-powder",
    4,
    60,
    15,
    "item-mixing-kit",
    { materials: "Glowstone dust and white salts", level: 3, learnPrice: 40 },
  ),
  recipe(
    "greater-healing-bottle",
    "Greater healing potion",
    "item-greater-healing-bottle",
    4,
    120,
    30,
    "item-mixing-kit",
    {
      materials: "Distilled life salts",
      level: 3,
      location: "town",
      learnPrice: 50,
    },
  ),
  recipe(
    "restoration-draught",
    "Restoration draught",
    "item-restoration-draught",
    4,
    240,
    80,
    "item-mixing-kit",
    {
      materials: "Silverleaf and phoenix resin",
      level: 7,
      location: "town",
      learnPrice: 100,
    },
  ),
  recipe(
    "ward-charm",
    "Ward charm",
    "item-ward-charm",
    4,
    90,
    20,
    "item-craft-tools",
    {
      materials: "Etched silver and braided silk",
      level: 3,
      location: "town",
      learnPrice: 60,
    },
  ),
]);
export const RECIPE_ITEMS = [
  ...[
    ["item-field-dressing", "Field Dressing", 12],
    ["item-flash-powder", "Flash Powder", 25],
    ["item-restoration-draught", "Restoration Draught", 120],
    ["item-ward-charm", "Ward Charm", 35],
  ].map(([id, name, price]) => ({
    id,
    name,
    price,
    bulk: 0,
    inventoryDie: 4,
    handChoices: [],
    specialOrder: false,
    grantOnly: false,
    source: { path: "game/recipes" },
    kind: "consumable",
  })),
  ...MATERIAL_ITEMS,
];
export const recipeMethods = {
  knownRecipes(h) {
    return new Set([
      ...RECIPES.filter((r) => r.basic).map((r) => r.id),
      ...(h.recipeBook ?? []),
      ...(h.preview.state.recipes ?? []),
      ...this.powerIds(h).flatMap((id) => POWERS[id]?.recipes ?? []),
    ]);
  },
  recipePrice(h, r) {
    return Math.ceil(
      r.materialPrice *
        (1 - Math.min(0.75, this.buildStat(h, "craftDiscount"))) *
        Math.min(1, ...this.traits(h).map((t) => t.buyRate ?? 1)) *
        (this.traits(h).some((t) => t.salvage) ? 0.75 : 1),
    );
  },
  recipeTime(h, r) {
    const speed = Math.max(
      0,
      ...this.powerIds(h).map((id) => POWERS[id]?.passive?.craftSpeed ?? 0),
      ...this.traits(h).map((t) =>
        t.craft || t.structure || t.craftTime ? 0.25 : 0,
      ),
    );
    if (h.draft.forge) {
      const traitSpeed = Math.max(
        0,
        ...this.traits(h).map((t) =>
          t.craft || t.structure || t.craftTime ? 0.25 : 0,
        ),
      );
      const multiplier = this.powerIds(h).reduce(
        (m, id) => m * (1 - (POWERS[id]?.passive?.craftSpeed ?? 0)),
        1,
      );
      return Math.max(
        5,
        Math.ceil(
          r.minutes *
            multiplier *
            (1 - traitSpeed) *
            (1 - Math.min(0.75, this.buildStat(h, "craftSpeed"))),
        ),
      );
    }
    return Math.max(
      5,
      Math.ceil(
        r.minutes *
          (1 - Math.min(0.75, speed + this.buildStat(h, "craftSpeed"))),
      ),
    );
  },
  learnRecipe(index, id, source = "merchant") {
    const h = this.party[index],
      r = RECIPES.find((r) => r.id === id);
    if (!r || this.knownRecipes(h).has(id))
      throw new Error("That recipe is unknown or already learned.");
    if (
      source !== "loot" &&
      (this.mode !== "town" || this.campaign.bank < r.learnPrice)
    )
      throw new Error(
        "Learn this recipe from a town artisan with enough vault coins.",
      );
    if (source !== "loot") this.campaign.bank -= r.learnPrice;
    (h.recipeBook ??= []).push(id);
    this.note(`${h.name} learns ${r.name}.`);
    this.emit("change");
  },
  recipeReason(index, id, supplyId = "") {
    const h = this.party[index],
      r = RECIPES.find((r) => r.id === id);
    if (!r || !this.knownRecipes(h).has(id)) return "Learn this recipe first.";
    if (!["town", "exploration"].includes(this.mode) || !this.canAct(h))
      return "A capable artisan needs a safe camp or town.";
    if (this.mode === "exploration" && this.sleepReason())
      return this.sleepReason();
    if (r.location === "town" && this.mode !== "town")
      return "Requires the town workshop.";
    if (h.preview.state.level < r.level)
      return `Requires hero level ${r.level}.`;
    if (
      r.tool &&
      !this.traits(h).some((t) => t.improvise) &&
      !h.preview.inventory.items.some(
        (i) => i.carried && i.catalogId === r.tool,
      )
    )
      return `Requires ${r.tool === "item-mixing-kit" ? "a mixing kit" : "craft tools"}.`;
    if (!(h.recipeMaterials?.[id] > 0))
      return `Requires one batch: ${r.materials}.`;
    if (supplyId) {
      const item = h.preview.inventory.items.find(
        (i) =>
          i.instanceId === supplyId && i.carried && i.catalogId === r.product,
      );
      if (!item) return "Select a matching carried supply.";
      if (!r.maximumDie || this.supplyValue(h, item) >= r.maximumDie)
        return "This supply is already full.";
    }
    return "";
  },
  buyRecipeMaterials(index, id) {
    const h = this.party[index],
      r = RECIPES.find((r) => r.id === id);
    if (!r || this.mode !== "town" || !this.knownRecipes(h).has(id))
      throw new Error("Buy ingredients for a known recipe in town.");
    const price = this.recipePrice(h, r);
    if (this.campaign.bank < price) throw new Error("Not enough vault coins.");
    this.campaign.bank -= price;
    h.recipeMaterials ??= {};
    h.recipeMaterials[id] = (h.recipeMaterials[id] ?? 0) + 1;
    this.note(`${h.name} buys one batch of ${r.materials} for ${price} coins.`);
    this.emit("change");
  },
  craftRecipe(index, id, supplyId = "") {
    const reason = this.recipeReason(index, id, supplyId);
    if (reason) throw new Error(reason);
    const h = this.party[index],
      r = RECIPES.find((r) => r.id === id);
    let made = h.preview.inventory.items.find((i) => i.instanceId === supplyId);
    if (!made) {
      made = ordinaryItem(this.C, r.product, `crafted-${crypto.randomUUID()}`);
      made.inventoryDie = r.maximumDie ?? made.inventoryDie;
      (h.treasure ??= []).push(made);
    }
    if (r.maximumDie) h.supplies[made.instanceId] = r.maximumDie;
    const preserved =
      this.traits(h).some((t) => t.craftImprove) &&
      h.traitUses?.craftImprove !== this.clock().day;
    if (preserved) {
      h.traitUses ??= {};
      h.traitUses.craftImprove = this.clock().day;
    } else h.recipeMaterials[id]--;
    this.refreshHero(h);
    this.advanceTime(this.recipeTime(h, r) * 60, { provisions: true });
    this.note(
      `${h.name} ${supplyId ? "replenishes" : "crafts"} ${r.name}${r.maximumDie ? ` · d${r.maximumDie}` : ""}. ${preserved ? "Maker’s gift preserved the batch" : "One batch used"}; ${this.recipeTime(h, r)} minutes.`,
    );
    if (!h.recipeMaterials[id])
      this.supplyNotice(
        h,
        { instanceId: `materials-${id}`, definition: { name: r.materials } },
        `${r.materials}: your last crafting batch was used.`,
      );
    this.emit("change");
    return made;
  },
  discoverRecipe(chest) {
    if (chest.recipeSearched) return;
    chest.recipeSearched = true;
    // One guaranteed manuscript on each newly searched floor; assignment follows the looter.
    if (this.map.recipeFound) return;
    this.map.recipeFound = true;
    const h = this.active,
      unknown = RECIPES.filter((r) => !this.knownRecipes(h).has(r.id));
    if (unknown.length) {
      const r = unknown[(this.campaign.depth - 1) % unknown.length];
      this.learnRecipe(this.selected, r.id, "loot");
      this.notify(`${h.name} found a recipe: ${r.name}`);
    }
  },
};
