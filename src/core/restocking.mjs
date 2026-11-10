import {
  BASIC_SUPPLIES,
  MATERIAL_STOCKS,
  stockForRecipe,
  stockForItem,
  materialUnits,
  restockCost,
  migrateSimpleStocks,
  SUPPLY_TARGETS,
} from "./supply-stock.mjs";
import { SUPPLY_LADDER } from "./supply-dice.mjs";
import { ordinaryItem } from "./treasure.mjs";

export const restockingMethods = {
  supplyRows() {
    return this.party
      .filter((h) => !["dead", "lastWords"].includes(h.survival.status))
      .flatMap((h) =>
        BASIC_SUPPLIES.flatMap((spec) => {
          const items = h.preview.inventory.items.filter(
            (i) => i.carried && i.catalogId === spec.item,
          );
          return (items.length ? items : [null]).map((item) => ({
            hero: h.heroId,
            name: h.name,
            supply: spec.id,
            itemId: item?.instanceId ?? null,
            before: item ? this.supplyValue(h, item) : 0,
            bulk: item?.bulk ?? 0,
            missing: !item,
          }));
        }),
      );
  },
  supplyRef(ref) {
    const hero = this.party.find((h) => h.heroId === ref.hero),
      spec = BASIC_SUPPLIES.find((s) => s.id === ref.supply);
    if (!hero || !spec) throw new Error("Choose a party companion and supply.");
    const item = ref.itemId
      ? hero.preview.inventory.items.find(
          (i) =>
            i.instanceId === ref.itemId &&
            i.carried &&
            i.catalogId === spec.item,
        )
      : null;
    if (ref.itemId && !item)
      throw new Error("That carried supply has changed.");
    return { hero, spec, item };
  },
  supplyWorkReason() {
    if (
      !["town", "exploration"].includes(this.mode) ||
      this.busy ||
      this.pendingDefense ||
      this.pendingProvocation ||
      this.woundNotices?.length
    )
      return "Finish the current event before preparing supplies.";
    if (this.campaign.supplyNotices?.length)
      return "Acknowledge the supply notice first.";
    if ([...this.paths.values()].some((p) => p.length))
      return "Wait until movement finishes.";
    if (!this.party.some((h) => this.canAct(h)))
      return "A capable companion must prepare the company.";
    return "";
  },
  supplyBuyingRate() {
    return Math.max(
      0.25,
      Math.min(
        1,
        ...this.party
          .filter((h) => this.canAct(h))
          .flatMap((h) => this.traits(h).map((t) => t.buyRate ?? 1)),
      ),
    );
  },
  ingredientPurchasePrice(kind, units = 4) {
    const spec = MATERIAL_STOCKS.find((s) => s.id === kind);
    if (!spec || !Number.isInteger(units) || units < 1 || units > 50)
      throw new Error("Buy between 1 and 50 ingredient units.");
    const rates = this.party
      .filter((h) => this.canAct(h))
      .map(
        (h) =>
          (1 - Math.min(0.75, this.buildStat(h, "craftDiscount"))) *
          Math.min(1, ...this.traits(h).map((t) => t.buyRate ?? 1)) *
          (this.traits(h).some((t) => t.salvage) ? 0.75 : 1),
      );
    return Math.max(1, Math.ceil(spec.price * units * Math.min(1, ...rates)));
  },
  materialSources(kind) {
    const rows = [];
    for (const hero of this.party.filter((h) => this.canAct(h))) {
      for (const item of hero.preview.inventory.items.filter(
        (i) => i.carried && stockForItem(i) === kind,
      ))
        if (materialUnits(item) > 0)
          rows.push({ hero, item, units: materialUnits(item) });
      for (const [recipe, n] of Object.entries(hero.recipeMaterials ?? {})) {
        const spec = stockForRecipe(recipe);
        if (spec?.material === kind && n > 0)
          rows.push({ hero, recipe, units: n * restockCost(0, spec.normal) });
      }
      // Legacy typed material dice become counted stocks on load/action. The
      // preview reports their preserved expected uses without rolling them.
      for (const item of hero.preview.inventory.items.filter(
        (i) =>
          i.carried &&
          i.stockUnits === undefined &&
          stockForRecipe(i.materialType)?.material === kind,
      )) {
        const expected = { 0: 0, 4: 4, 6: 10, 8: 18, 10: 28, 12: 40, 20: 60 };
        rows.push({
          hero,
          item,
          units:
            (expected[this.supplyValue(hero, item)] ?? 0) *
            restockCost(0, stockForRecipe(item.materialType).normal),
        });
      }
    }
    return rows;
  },
  materialCount(kind) {
    return this.materialSources(kind).reduce((n, s) => n + s.units, 0);
  },
  normalizeMaterialStocks() {
    const dirty = this.party.filter(
      (h) =>
        Object.entries(h.recipeMaterials ?? {}).some(
          ([id, n]) => n > 0 && stockForRecipe(id),
        ) ||
        h.treasure?.some(
          (i) =>
            i.stockUnits === undefined &&
            i.materialType &&
            stockForRecipe(i.materialType),
        ),
    );
    if (!dirty.length) return;
    migrateSimpleStocks(
      {
        ...this.campaign,
        party: dirty,
        reserve: [],
        fallenHeroes: [],
        floor: null,
        returnPassage: null,
        market: null,
      },
      this.C,
    );
    dirty.forEach((h) => this.refreshHero(h));
  },
  addMaterialStock(hero, kind, units) {
    const spec = MATERIAL_STOCKS.find((s) => s.id === kind);
    if (!spec || !Number.isSafeInteger(units) || units < 1)
      throw new Error("Choose valid ingredients.");
    let item = (hero.treasure ??= []).find(
      (i) => i.catalogId === spec.item && i.carried !== false,
    );
    if (!item) {
      item = ordinaryItem(
        this.C,
        spec.item,
        `ingredients-${crypto.randomUUID()}`,
      );
      item.quantity = 0;
      hero.treasure.push(item);
    }
    if (!Number.isSafeInteger(item.quantity + units))
      throw new Error("Ingredient stock is too large.");
    item.quantity += units;
    this.refreshHero(hero);
    return item;
  },
  consumeMaterialStock(kind, units) {
    if (
      !Number.isSafeInteger(units) ||
      units < 1 ||
      this.materialCount(kind) < units
    )
      throw new Error("The party lacks the required ingredients.");
    this.normalizeMaterialStocks();
    let left = units;
    for (const source of this.materialSources(kind)) {
      if (!left) break;
      const take = Math.min(left, source.units),
        saved = source.hero.treasure.find(
          (i) => i.instanceId === source.item.instanceId,
        );
      if (saved.stockUnits !== undefined) saved.stockUnits -= take;
      else saved.quantity -= take;
      if ((saved.stockUnits ?? saved.quantity) === 0)
        source.hero.treasure = source.hero.treasure.filter((i) => i !== saved);
      left -= take;
      this.refreshHero(source.hero);
    }
  },
  buySupplyIngredients(kind, units = 4) {
    const reason = this.supplyWorkReason();
    if (reason) throw new Error(reason);
    if (this.mode !== "town") throw new Error("Buy ingredients in Greyhaven.");
    const spec = MATERIAL_STOCKS.find((s) => s.id === kind);
    if (!spec || !Number.isInteger(units) || units < 1 || units > 50)
      throw new Error("Buy between 1 and 50 ingredient units.");
    const heroes = this.party.filter((h) => this.canAct(h));
    if (!heroes.length)
      throw new Error("A capable companion must carry the ingredients.");
    const price = this.ingredientPurchasePrice(kind, units);
    if (this.campaign.bank < price) throw new Error("Not enough vault coins.");
    const carrier = heroes.sort(
      (a, b) =>
        b.preview.inventory.capacity -
        b.preview.inventory.bulk -
        (a.preview.inventory.capacity - a.preview.inventory.bulk),
    )[0];
    this.addMaterialStock(carrier, kind, units);
    this.campaign.bank -= price;
    this.note(
      `${carrier.name} carries ${units} ${spec.name.toLowerCase()} · ${price} coins · ${units * 0.25} Bulk.`,
    );
    this.emit("change");
  },
  restockSteps(h, spec) {
    const ranks =
      {
        food: ["wilderness"],
        arrows: ["craft", "marksmanship"],
        light: ["craft"],
        dressings: ["medicine"],
      }[spec.id] ?? [];
    let rank = Math.max(
      0,
      ...ranks.map((id) => h.preview.state.ranks[`discipline-${id}`] ?? 0),
    );
    if (
      this.powerIds(h).some((id) =>
        [
          "power-field-artisan",
          ...(spec.id === "food" ? ["power-field-replenishment"] : []),
          ...(spec.id === "dressings" ? ["power-forager-remedies"] : []),
        ].includes(id),
      ) ||
      this.traits(h).some((t) => t.craft)
    )
      rank = Math.max(rank, 1);
    return 1 + Math.min(2, rank);
  },
  campSupplyChance(worker, spec) {
    const ranks = { food:["wilderness"], water:["wilderness"], arrows:["craft","marksmanship"], light:["craft"], dressings:["medicine"] }[spec.id] ?? [];
    const rank = Math.max(0,...ranks.map(id=>worker.preview.state.ranks[`discipline-${id}`] ?? 0));
    const powers = this.powerIds(worker);
    const relevant = powers.includes("power-field-artisan") && ["arrows","light"].includes(spec.id) || powers.includes("power-field-replenishment") && ["food","water","arrows","light"].includes(spec.id) || powers.includes("power-forager-remedies") && spec.id==="dressings";
    return Math.min(90,50+rank*10+(relevant?15:0));
  },
  campRestockPlan(worker, duty, target) {
    const spec = BASIC_SUPPLIES.find(s=>s.duty===duty);
    if (!spec) return null;
    const fail = reason=>({spec,reason});
    if (!this.canAct(worker)) return fail("This companion cannot prepare supplies.");
    let rows=this.supplyRows().filter(r=>r.supply===spec.id && this.party.some(h=>h.heroId===r.hero && this.canAct(h)));
    if (target?.supplyId) rows=rows.filter(r=>r.hero===target.heroId && (target.supplyId==="new" || r.itemId===target.supplyId));
    else if (target?.heroId) rows=rows.filter(r=>r.hero===target.heroId);
    const row=rows.filter(r=>r.before<20).sort((a,b)=>Number(a.missing)-Number(b.missing)||a.before-b.before)[0];
    if (!row) return fail(rows.length?"These supplies are already full.":"Choose a capable companion's supply.");
    const after=SUPPLY_LADDER[SUPPLY_LADDER.indexOf(row.before)+1];
    return {spec,row,after,units:0,steps:1,chance:this.campSupplyChance(worker,spec),worker:worker.heroId,
      bulkAdded:row.missing?this.C.inventory.equipment.find(i=>i.id===spec.item).bulk:0,reason:""};
  },
  bestSupplyWorker(ref) {
    const { spec } = this.supplyRef(ref),
      target = { heroId: ref.hero, supplyId: ref.itemId ?? "new" };
    return this.party
      .filter((h) => this.canAct(h))
      .map((h) => ({
        hero: h,
        plan: this.campRestockPlan(h, spec.duty, target),
      }))
      .sort(
        (a, b) =>
          Number(!!a.plan.reason) - Number(!!b.plan.reason) ||
          (b.plan.chance ?? 0) - (a.plan.chance ?? 0) ||
          (b.plan.steps ?? 0) - (a.plan.steps ?? 0),
      )[0];
  },
  applyRestock(row, after) {
    const { hero, spec, item } = this.supplyRef(row);
    let made = item;
    if (!made) {
      made = ordinaryItem(
        this.C,
        spec.item,
        `restocked-${crypto.randomUUID()}`,
      );
      (hero.treasure ??= []).push(made);
    }
    hero.supplies[made.instanceId] = after;
    const saved = hero.treasure?.find((i) => i.instanceId === made.instanceId);
    if (saved) saved.supplyRemaining = after;
    this.refreshHero(hero);
    this.syncTorches();
    return made;
  },
  performCampRestock(worker, duty, rng, target) {
    const plan=this.campRestockPlan(worker,duty,target);
    if (plan.reason) { this.campEvent(`${worker.name}: ${plan.reason}`); return; }
    const success=this.campSupplyProjection ? this.campSupplyProjection==="success" : rng.int(1,100)<=plan.chance;
    if (!success) { this.campEvent(`${worker.name} could not replenish ${plan.spec.name.toLowerCase()} this watch.`); return; }
    const made=this.applyRestock(plan.row,plan.after);
    if (plan.row.missing) for(const entries of Object.values(this.campaign.camp?.targets ?? {})) for(const t of entries)
      if(t?.heroId===plan.row.hero && t.supplyId==="new") t.supplyId=made.instanceId;
    this.campEvent(`${worker.name} replenished ${plan.spec.name.toLowerCase()} for ${plan.row.name}.`);
  },
  townRestockPlan(ref, target = this.campaign.restockTarget ?? 8) {
    if (!SUPPLY_TARGETS.includes(target))
      throw new Error("Choose a supported departure die.");
    const { hero, spec, item } = this.supplyRef(ref),
      before = item ? this.supplyValue(hero, item) : 0;
    const after = Math.max(before, target, spec.id === "water" ? 8 : 0),
      base = this.C.inventory.equipment.find((i) => i.id === spec.item);
    const price =
      spec.id === "water"
        ? (item ? 0 : base.price) +
          Math.ceil(
            (restockCost(Math.max(8, before), Math.max(8, after)) *
              base.price) /
              4,
          )
        : Math.ceil(
            (restockCost(before, after) * base.price) /
              restockCost(0, spec.normal),
          );
    return {
      ...ref,
      before,
      after,
      price: Math.ceil(price * this.supplyBuyingRate()),
      bulkAdded: item ? 0 : base.bulk,
      reason:
        this.mode !== "town"
          ? "Restock with coins in Greyhaven."
          : this.supplyWorkReason(),
    };
  },
  departurePlan(target = this.campaign.restockTarget ?? 8) {
    if (!SUPPLY_TARGETS.includes(target))
      throw new Error("Choose a supported departure die.");
    const rows = this.supplyRows()
      .filter((r) => !r.missing || ["food", "water"].includes(r.supply))
      .map((r) => this.townRestockPlan(r, target))
      .filter((p) => p.after > p.before);
    const total = rows.reduce((n, p) => n + p.price, 0),
      reason =
        this.mode !== "town"
          ? "Restock with coins in Greyhaven."
          : this.supplyWorkReason() ||
            (!rows.length
              ? "The party is ready at this target."
              : this.campaign.bank < total
                ? "Not enough vault coins for the complete restock."
                : "");
    return {
      rows,
      total,
      target,
      reason,
      fingerprint: JSON.stringify(
        rows.map((r) => [
          r.hero,
          r.itemId,
          r.supply,
          r.before,
          r.after,
          r.price,
        ]),
      ),
    };
  },
  restockInTown(ref, target, expected) {
    const plan = this.townRestockPlan(ref, target);
    const reason =
      plan.reason ||
      (this.campaign.bank < plan.price ? "Not enough vault coins." : "");
    if (reason) throw new Error(reason);
    if (
      expected !== undefined &&
      JSON.stringify([plan.before, plan.after, plan.price]) !== expected
    )
      throw new Error("Supplies changed. Review the restock again.");
    if (plan.before === plan.after) return;
    this.campaign.bank -= plan.price;
    this.applyRestock(plan, plan.after);
    this.note(
      `${plan.name ?? this.supplyRef(ref).hero.name} restocks ${BASIC_SUPPLIES.find((s) => s.id === ref.supply).name}: ${plan.before ? `d${plan.before}` : "Empty"} → d${plan.after} · ${plan.price} coins.`,
    );
    this.emit("change");
  },
  restockParty(target, expected) {
    const plan = this.departurePlan(target);
    if (plan.reason) throw new Error(plan.reason);
    if (expected !== undefined && plan.fingerprint !== expected)
      throw new Error("Supplies changed. Review the party restock again.");
    this.campaign.bank -= plan.total;
    for (const row of plan.rows) this.applyRestock(row, row.after);
    this.campaign.restockTarget = target;
    this.note(
      `The party prepares to d${target} · ${plan.total} coins. Larger supplies are preserved.`,
    );
    this.emit("change");
  },
};
