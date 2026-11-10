# Consumable preparation

Everyday supplies use one party **Supplies** screen, available from the HUD, character inventory and workshop. Food, water, arrows, torches and dressings remain individual carried items with the existing depletion die, Bulk and one-step combining rule. The last exhausted use still works. Advanced potion, smoke, rope and magical recipes remain in **Advanced recipes & training**.

## Greyhaven

Choose a departure target from d4 through d20 (default d8). Review one supply or the complete party before paying. Party restock covers carried everyday supplies plus missing food/water; optional empty slots allow adding other supplies explicitly. Existing larger dice are preserved. The review lists every recipient, before/after die, coins and any Bulk for newly added items. Cancel is free. Changes invalidate stale quotes; insufficient coins never produce a partial purchase.

An ordinary tier costs 1/1/2/3/5/8 preparation units for Empty→d4→d6→d8→d10→d12→d20. Town coin cost is the item's normal price scaled by required units versus its original normal die, rounded up. The best capable party buying rate applies automatically. Ingredient purchases also honor applicable crafting discounts and salvage, choosing the best capable buyer; the displayed quote includes them. This charges a premium for higher supply density without adding another bundle's Bulk. Existing flasks refill freely to at least d8. A missing flask costs its normal price; packing water above d8 costs coins. A normal camp water task fills carried flasks to at least d8, never reduces larger stocks and cannot create containers.

Town restocking is immediate procurement, with no separate ingredient purchase, recipe crafting, combining, transfer or world-time advance. The existing combine route remains valid and retains the weight of its components.

## Shared ingredients and carrying

Food ingredients, crafting materials and medicinal herbs are three counted stocks. Every capable party member can use ingredients carried by another. New units each weigh 0.25 Bulk and cost 2/2/6 coins respectively. The Supplies screen buys four at a time, shows the total and Bulk, and assigns them to the capable hero with the most free carrying capacity. Foraging places finds on the forager. Stock items remain transferable/droppable/recoverable inventory, not a weightless party bank. Reserves, dead or incapacitated carriers cannot supply active projects.

Basic camp foraging no longer creates ingredient units; see basic camp duties below. Legacy stocks remain intact.

## Basic camp duties

Choose Make arrows, Make dressings, Find food, Find water or Make torches. No ingredients, tools, recipe knowledge or nearby water source are required. The automatic recipient is the capable companion with the lowest carried supply; a recipient selector can choose a specific bundle or add a new one. New supplies add their ordinary Bulk. A successful duty increases one step through d20; failure leaves supplies unchanged. The hidden base success chance is 50%, plus 10 points per relevant discipline rank and 15 for a relevant preparation ability, capped at 90%. Marksmanship/Craft help arrows, Craft helps torches, Wilderness helps food/water, Medicine helps dressings.

General Forage retains its hidden resource bands but now gives useful finished supplies rather than basic ingredients. Reports describe what was replenished without rolls or odds. Forecasts are read-only possible gains, not guaranteed output. Six hours of sleep/two duties, guards, wandering danger and interruption/save rules remain. Healing care still requires dressings; wound care remains once per day per wound. Advanced crafting retains its requirements and Maker’s Gift daily receipt; free basic duties do not spend that receipt.

The Supplies screen supports reviewed Greyhaven purchases and camp handoff without ingredient management. Old counted ingredients remain carried inventory with their value/Bulk intact for compatibility; no automatic deletion or free conversion occurs. Earlier deterministic ingredient-project rules are superseded.

## Compatible saves

Legacy everyday prepared recipe batches become counted ingredient receipts with their original zero Bulk and normal-batch value. Legacy typed everyday material dice convert at their remaining expected checks (d4=4, d6=10, d8=18, d10=28, d12=40, d20=60), multiplied by that recipe's normal-batch units. They retain original total carried Bulk until the receipt is consumed. No spent supply is refilled by migration. Reserve heroes, fallen records, floor caches and cached merchant items are covered; conversion is idempotent. Advanced/untagged materials and special prepared batches remain unchanged. New ingredients use normal per-unit Bulk.

Game-owned code is `supply-stock.mjs` and `restocking.mjs`; source book/Foundry files are untouched. Old direct recipe adapters remain for compatibility; current everyday UI and camp use the restocking planner.
