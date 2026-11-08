import { RECIPES } from "./recipes.mjs";
import { SURFACE_COLORS } from "./battlefield.mjs";
import { validateBuild } from "./builds.mjs";
const nonnegative = (n) => Number.isSafeInteger(n) && n >= 0;
const recipeIds = new Set(RECIPES.map((r) => r.id));
// Validate optional game-owned additions before a save replaces the live run.
// Missing fields are legitimate in pre-0.4 saves.
export function validateGameState(campaign) {
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
