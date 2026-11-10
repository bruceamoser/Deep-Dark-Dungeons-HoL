# Consumable preparation

Everyday supplies use one party **Supplies** screen, available from the HUD, character inventory and workshop. Food, water, arrows, torches and dressings remain individual carried items with the existing depletion die, Bulk and one-step combining rule. The last exhausted use still works. Advanced potion, smoke, rope and magical recipes remain in **Advanced recipes & training**.

## Greyhaven

Choose a departure target from d4 through d20 (default d8). Review one supply or the complete party before paying. Party restock covers carried everyday supplies plus missing food/water; optional empty slots allow adding other supplies explicitly. Existing larger dice are preserved. The review lists every recipient, before/after die, coins and any Bulk for newly added items. Cancel is free. Changes invalidate stale quotes; insufficient coins never produce a partial purchase.

An ordinary tier costs 1/1/2/3/5/8 preparation units for Empty→d4→d6→d8→d10→d12→d20. Town coin cost is the item's normal price scaled by required units versus its original normal die, rounded up. This charges a premium for higher supply density without adding another bundle's Bulk. Existing flasks refill freely to at least d8. A missing flask costs its normal price; packing water above d8 costs coins. A normal camp water task fills carried flasks to at least d8, never reduces larger stocks and cannot create containers.

Town restocking is immediate procurement, with no separate ingredient purchase, recipe crafting, combining, transfer or world-time advance. The existing combine route remains valid and retains the weight of its components.

## Shared ingredients and carrying

Food ingredients, crafting materials and medicinal herbs are three counted stocks. Every capable party member can use ingredients carried by another. New units each weigh 0.25 Bulk and cost 2/2/6 coins respectively. The Supplies screen buys four at a time, shows the total and Bulk, and assigns them to the capable hero with the most free carrying capacity. Foraging places finds on the forager. Stock items remain transferable/droppable/recoverable inventory, not a weightless party bank. Reserves, dead or incapacitated carriers cannot supply active projects.

Foraging probabilities/training bonuses are unchanged. One successful nonwater find supplies one category: wood gives 2 crafting units, fletching 4 crafting units, food 4 food units and herbs 1 medicinal unit. These retain the ordinary recipe-batch value under the new step costs. Reports name the find and the available preparation. Water keeps its existing source-discovery/refill behavior.

## Camp projects

Select a supply, and **Plan at camp** chooses the best capable worker, prefills a future duty and targets the carried bundle or empty slot. The camp planner also allows explicit recipient selection. Preparation is deterministic, consumes shared ingredients and takes an existing one-hour work period; six-hour sleep/two-duty scheduling, guard checks, wandering risk, HP recovery, Grit and wound treatment are unchanged.

A general worker can improve one tier. Relevant discipline rank I allows two, rank II/III up to three. Marksmanship/Craft apply to arrows, Wilderness to food, Craft to torches and Medicine to dressings. Relevant preparation abilities and crafting traits provide at least the first specialist bonus. Every extra tier still costs its listed ingredients; output stops at the largest affordable tier or d20. Dressings require recipe knowledge, and arrows/torches need shared craft tools or the worker's improvisation trait. Water needs a nearby source and carried flasks.

Previews simulate work order against shared ingredients so later duties cannot promise already-spent stocks. They show a next-turn result and cost; interrupted/changed work can alter later outcomes. Foraging remains uncertain and is never counted as guaranteed material. A resumed camp executes only future periods. Actual results persist in the camp report.

## Compatible saves

Legacy everyday prepared recipe batches become counted ingredient receipts with their original zero Bulk and normal-batch value. Legacy typed everyday material dice convert at their remaining expected checks (d4=4, d6=10, d8=18, d10=28, d12=40, d20=60), multiplied by that recipe's normal-batch units. They retain original total carried Bulk until the receipt is consumed. No spent supply is refilled by migration. Reserve heroes, fallen records, floor caches and cached merchant items are covered; conversion is idempotent. Advanced/untagged materials and special prepared batches remain unchanged. New ingredients use normal per-unit Bulk.

Game-owned code is `supply-stock.mjs` and `restocking.mjs`; source book/Foundry files are untouched. Old direct recipe adapters remain for compatibility; current everyday UI and camp use the restocking planner.
