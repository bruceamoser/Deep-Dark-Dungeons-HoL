import { CHALLENGES } from "./challenge.mjs";
import { validateCamp } from "./camp.mjs";
import { RECIPES } from "./recipes.mjs";
import { SURFACE_COLORS } from "./battlefield.mjs";
import { validateBuild } from "./builds.mjs";
import { stockForRecipe, SUPPLY_TARGETS } from "./supply-stock.mjs";
const nonnegative = (n) => Number.isSafeInteger(n) && n >= 0;
const recipeIds = new Set(RECIPES.map((r) => r.id));
// Validate optional game-owned additions before a save replaces the live run.
// Missing fields are legitimate in pre-0.4 saves.
export function validateGameState(campaign) {
  validateCamp(campaign);
  if (campaign.challenge !== undefined && !Object.hasOwn(CHALLENGES, campaign.challenge))
    throw new Error("Invalid encounter challenge.");
  if (
    campaign.restockTarget !== undefined &&
    !SUPPLY_TARGETS.includes(campaign.restockTarget)
  )
    throw new Error("Invalid departure supply target.");
  const heroes = [
    ...campaign.party,
    ...(campaign.reserve ?? []),
    ...(campaign.fallenHeroes ?? []).map((f) => f.hero),
  ];
  const floors = [campaign.floor, campaign.returnPassage?.floor].filter(
    Boolean,
  );
  if (
    campaign.generatedMagic !== undefined &&
    (!Array.isArray(campaign.generatedMagic) ||
      campaign.generatedMagic.some(
        (id) => typeof id !== "string" || id.length > 200,
      ))
  )
    throw new Error("Saved magic discovery registry is invalid.");
  const items = [
    ...heroes.flatMap((h) => h.treasure ?? []),
    ...floors.flatMap((f) =>
      (f.map.chests ?? []).flatMap((c) => c.items ?? []),
    ),
    ...Object.values(campaign.market?.stock ?? {}).flatMap((rows) =>
      rows.map((row) => row.item),
    ),
  ];
  for (const item of items) {
    if (
      item.stockUnits !== undefined &&
      (item.kind !== "ordinary" ||
        item.catalogId !== "item-material-bundle" ||
        !stockForRecipe(item.materialType) ||
        !nonnegative(item.stockUnits) ||
        !Number.isFinite(item.stockBulk) ||
        item.stockBulk < 0 ||
        item.stockBulk > Number.MAX_SAFE_INTEGER)
    )
      throw new Error("Invalid saved ingredient stock.");
    if (
      item.reserveDice !== undefined &&
      (item.kind !== "ordinary" ||
        !Array.isArray(item.reserveDice) ||
        item.reserveDice.length > 98 ||
        item.reserveDice.length + 1 > (item.quantity ?? 1) ||
        item.reserveDice.some((die) => ![4, 6, 8, 10, 12, 20].includes(die)))
    )
      throw new Error("Saved combined supplies are invalid.");
    if (
      (item.quantity !== undefined &&
        (!nonnegative(item.quantity) || item.quantity < 1)) ||
      (item.supplyRemaining != null &&
        ![0, 4, 6, 8, 10, 12, 20].includes(item.supplyRemaining))
    )
      throw new Error("Saved portable equipment is invalid.");
  }
  for (const h of heroes) {
    for (const f of ["foodDue", "waterDue"])
      if (h.needs?.[f] !== undefined && typeof h.needs[f] !== "boolean")
        throw new Error("Saved provision need is invalid.");
    for (const w of h.wounds ?? [])
      if (
        w.campCare &&
        (!nonnegative(w.campCare.minutes) ||
          !Number.isSafeInteger(w.campCare.required) ||
          w.campCare.required < 1 ||
          w.campCare.required > 240 ||
          w.campCare.minutes > w.campCare.required ||
          !/^day-\d+$/.test(w.campCare.dayKey))
      )
        throw new Error("Saved wound camp care is invalid.");
    validateBuild(h);
    if (h.respecGritSpent !== undefined && !nonnegative(h.respecGritSpent))
      throw new Error("Saved respec Grit accounting is invalid.");
    if (
      (h.recipeBook !== undefined &&
        (!Array.isArray(h.recipeBook) ||
          h.recipeBook.some((id) => !recipeIds.has(id)))) ||
      (h.recipeMaterials !== undefined &&
        (!h.recipeMaterials ||
          typeof h.recipeMaterials !== "object" ||
          Array.isArray(h.recipeMaterials) ||
          Object.entries(h.recipeMaterials).some(
            ([id, n]) => !recipeIds.has(id) || !nonnegative(n),
          ))) ||
      (h.powerPendingManeuver !== undefined &&
        typeof h.powerPendingManeuver !== "boolean") ||
      [h.powerUses, h.restPowerUses].some(
        (uses) =>
          uses !== undefined &&
          (!uses ||
            typeof uses !== "object" ||
            Array.isArray(uses) ||
            Object.values(uses).some((n) => !nonnegative(n))),
      ) ||
      (h.powerResourceUsed !== undefined &&
        (!Array.isArray(h.powerResourceUsed) ||
          h.powerResourceUsed.some(
            (r) => !["main", "maneuver", "reaction"].includes(r),
          )))
    )
      throw new Error("Saved recipes or power charges are invalid.");
  }
  for (const actor of [...heroes, ...floors.flatMap((f) => f.enemies ?? [])]) {
    const ai = actor.aiState;
    if (
      ai !== undefined &&
      (!ai ||
        typeof ai !== "object" ||
        Array.isArray(ai) ||
        (ai.anchor !== undefined &&
          (!Number.isSafeInteger(ai.anchor?.x) ||
            !Number.isSafeInteger(ai.anchor?.z))) ||
        [ai.action, ai.target, ai.evade].some(
          (s) => s != null && (typeof s !== "string" || s.length > 120),
        ) ||
        [ai.maneuverDone, ai.movingManeuver].some(
          (b) => b !== undefined && typeof b !== "boolean",
        ) ||
        [ai.fireBonus, ai.nextAttackBane, ai.baseStability].some(
          (n) => n !== undefined && (!nonnegative(n) || n > 3),
        ) ||
        (ai.sceneUsed !== undefined &&
          (!Array.isArray(ai.sceneUsed) ||
            ai.sceneUsed.length > 20 ||
            ai.sceneUsed.some(
              (s) => typeof s !== "string" || s.length > 120,
            ))) ||
        (ai.lastActions !== undefined &&
          (!ai.lastActions ||
            typeof ai.lastActions !== "object" ||
            Array.isArray(ai.lastActions) ||
            Object.entries(ai.lastActions).length > 20 ||
            Object.entries(ai.lastActions).some(
              ([name, turn]) => name.length > 120 || !nonnegative(turn),
            ))))
    )
      throw new Error("Saved creature tactics are invalid.");

    if (
      (actor.powerTurn !== undefined && !nonnegative(actor.powerTurn)) ||
      (actor.powerEffects !== undefined &&
        (!Array.isArray(actor.powerEffects) ||
          actor.powerEffects.some(
            (e) =>
              !e ||
              typeof e.id !== "string" ||
              typeof e.source !== "string" ||
              !Number.isFinite(e.expiresAt) ||
              e.expiresAt < 0 ||
              !nonnegative(e.expiresTurn) ||
              !e.stats ||
              typeof e.stats !== "object" ||
              Array.isArray(e.stats) ||
              Object.values(e.stats).some(
                (n) => typeof n !== "boolean" && !Number.isFinite(n),
              ),
          )))
    )
      throw new Error("Saved temporary power effects are invalid.");
  }
  for (const floor of floors) {
    if (
      floor.map.zones !== undefined &&
      (!Array.isArray(floor.map.zones) ||
        floor.map.zones.some(
          (z) =>
            !z ||
            !Object.hasOwn(SURFACE_COLORS, z.kind) ||
            (z.npcUntilTurn !== undefined && !nonnegative(z.npcUntilTurn)) ||
            (z.caltrops !== undefined && typeof z.caltrops !== "boolean") ||
            typeof z.id !== "string" ||
            typeof z.source !== "string" ||
            !(
              z.expires === null ||
              (Number.isFinite(z.expires) && z.expires >= 0)
            ) ||
            !Array.isArray(z.cells) ||
            z.cells.some(
              (p) =>
                !Number.isSafeInteger(p?.x) ||
                !Number.isSafeInteger(p?.z) ||
                !floor.map.tiles[`${p.x},${p.z}`],
            ) ||
            !z.hits ||
            typeof z.hits !== "object" ||
            Array.isArray(z.hits),
        ))
    )
      throw new Error("Saved battlefield surfaces are invalid.");
  }
}
