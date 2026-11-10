# Durable working decisions

## 2026-11-09 — Local execution, GitHub handoffs

Bruce wants development to execute on each local computer. Use the repository to transfer source, working checkpoints and project knowledge. Do not move execution to Codex Cloud as part of this workflow.

`AGENTS.md` is the shared agent entry point. `docs/work-progress/current.md` is the current handoff index, with dated session records and this decision log. Keep detailed game rules and asset/release policies in their existing docs.

## Existing boundaries

- Bruce is the final design authority. The game is Four Lanterns Deep; Greyhaven is its town.
- The v0.6 Forge replaced old purchase/signature progression. v0.6–v0.8.3 saves remain compatible; earlier saves are separate.
- Purchased source assets stay private. Finished licensed builds use staged Dungeon Mason assets; public source builds have fallbacks. Follow `docs/releases.md`.
- Personal GitHub identity is process-scoped. Never switch global GitHub authentication.
- Passing PRs may be author-reviewed and merged under existing authorization. A WIP checkpoint must remain unmerged until ready.

## 2026-11-09 — Welcome and HUD shortcuts

Keep the logo visible until preload finishes and the player enters explicitly. Place utility controls under one settings gear and center the clock beside the location. Town uses I/M/G/S/L/H/Shift+S/D: Shift+S resolves Bruce's duplicate S requests for Smithy/Shrine. Camp reports show actual completed-hour outcomes, persist across dungeon save/load, and require acknowledgement before returning to planning.

## 2026-11-09 — Camp outcomes, not dice

Bruce wants player-facing camp text to report what happened, without dice, probability percentages or roll tiers. Keep the rules internal. Camp supplies use qualitative stock labels; foraging reports found resources or nothing.

Camp planning shows two tasks per companion and expected HP recovery only when injured. Stores show current supplies per character and a possible-gain hint from assigned work, without numerical end-state projections or hourly rota detail.

Bruce explicitly changed camp supply pacing: no automatic food, water or lighting costs while resting, including no deferred consumption timer debt. Required crafting/medical inputs still apply. New/refilled water uses d8; existing depleted pools retain their amounts until refill. Forage probabilities remain unchanged and hidden from camp UI.

## 2026-11-09 — Disciplines provide relevant basic competence

Bruce wants small thematic discipline benefits as well as larger ability benefits. Applied first to foraging: each Wilderness rank adds one point to water/wood/food bands, each Craft rank adds one to wood/fletching, and each Medicine rank adds one to medicinal materials. Rank is taken from the acting hero’s effective Forge ranks, including origin grants. No party-wide sharing and no benefit from unrelated disciplines. Existing ability bonuses stack, retain larger contributions, and share the existing 85% overall find cap. Forge text explains benefits qualitatively; no odds table returns to camp.

## 2026-11-09 — Creature goals and tactical abilities

Bruce needs varied enemy behavior to assess balance. Assign identity-driven goals, choose among all printed main attacks, obey cooldowns/ammo, use meaningful support/control/terrain/mobility maneuvers, and preserve legal action/terrain/reaction/perception constraints. Keep printed stats and encounter budgets unchanged during this behavior change. No unprinted summons, free buffs or friendly-fire immunity. Add deterministic Main Action escape from creature holds and Main Action caltrop clearing so newly active control has player counterplay. Preserve/validate tactical commitments through saves. See `docs/creature-ai.md` for deliberate narrative/conditional omissions and NPC collateral resolution.

## 2026-11-09 — Movement consent and creature care

Player fire/trap routes require explicit consent before cost, including formation followers, approaches, movement powers and dangerous landings. New hazards pause travel; already-paid travel does not pay twice. Normal walking consent is not saved; in-flight casting options retain receipts scoped to that paid action.

A single occupied side square permits a one-point diagonal. Solid terrain corners, occupied destinations and two blocked side squares still block it. Creature escape takes priority over holding an attack; safer paths retain actual movement budgets and normal reactions. NPCs may spend the universal Main-action temporary-condition reduction on themselves/adjacent allies; starred remedies and HP-healing limits stay intact. Current encounter cards have no allied HP-healing ability. See the feature docs and PRs #118–#121.

## 2026-11-09 — Direct restocking and camp preparation

Bruce approved the simpler supply design: individual carried consumable dice; one party overview; exact before/after preview and a reviewable Greyhaven restock to a preferred target; deterministic camp projects; shared food/crafting/medicinal ingredients; advanced recipes kept separate. Depletion and one-step combining remain. Ingredient scarcity, paid work periods and camp interruption supply the tension. Relevant specialists improve more tiers while paying every tier's ingredients. See `docs/supplies.md` for chosen costs, migration and source adaptations.

## 2026-11-10 — Simplified camp and progression targets

Bruce supersedes ingredient requirements for basic camp replenishment: no required supplies, hidden success chances improved by relevant training, automatic recipient with manual override. Healing still consumes dressings and wound care remains once per day per wound. Difficulty changes encounter challenge separately. New progression aims for level 2 around depth 4, level 3 around depth 7 and level 4 around depth 11; never remove already-earned levels. Equipment bonus design discussion comes after the other feedback issues.

## 2026-11-10 — Equipment discussion order

After all eight implementation items merged, Bruce requested proceeding item type by item type with available bonuses explained first. Start with weapons, then armour, shields and accessories. Existing generated bonuses remain until agreed. Parent #127 and focused #144 track this discussion.

## 2026-11-10 — Approved equipment catalogue and release

Bruce completed the item-by-item discussion and approved strongest matching equipment bonuses. Implement the catalogue in [equipment-bonuses.md](../equipment-bonuses.md): accuracy/range and plain Push 1, no armour penetration, Light reduces Bulk, fuel-free toggleable equipped light sources on approved forms, discipline-wide competence rather than activated magical abilities, and Fortitude on belts. Preserve item identity/save compatibility while replacing opaque generated effects. He explicitly authorized finish, commit/push, progress documentation, author review/merge and a new patch release. This supersedes the earlier “discussion pending/no release requested” status.

## 2026-11-10 — Asset-production preparation and optional cloud generation

Bruce requested Blender/useful tools, a DeepSeek worker and review of the proposed hybrid generation pipeline. Meshy was subsequently clarified as optional; defer its account, installation and paid generation. Use Blender/Rigify/MCP plus existing assets first. GPT remains the default design/integration model; DeepSeek is a separate authenticated Codex profile for bounded worker jobs, not a claimed built-in subagent model. Preserve credentials outside Git with helper-backed auth. Replace blanket geometry/transform cleanup with inspected, selective changes and require real deformation/render/export evidence. See the asset-production pipeline and repo skill for details. Blender must be open for interactive MCP calls; background scripts start their own instance.

## 2026-11-10 — Recognizable roster first, refinement second

Bruce accepted the first model pilots with a facial-contrast correction: recolor existing eye/mouth details rather than add geometry. Establish decent, recognizable, animated/equipped models across the roster, then return with high-capability guidance for deeper anatomy/material/detail refinement. Keep editable sources and validate improvements in-game. Broad coverage should not stall on finishing every small detail of the first four creatures.

## 2026-11-10 — Parallel model authors and staged refinement

Bruce explicitly authorized DeepSeek workers on separate models concurrently, with GPT organizing, judging renders and returning concrete revisions. The first three-worker wave demonstrates model authoring, one requested revision and actual-game integration. Bruce accepted these as good first-pass work. Continue recognizable/playable coverage before detailed anatomy/material refinement, preserving editable Blender sources. Do not label first-pass acceptance as final art approval or author review as independent review.

Each job owns its directory and Blender background process; no concurrent edits in the shared MCP scene or source checkout. Organizer alone integrates/merges. Keep the initial concurrency at three workers and use bounded runtimes, kill-after/cleanup and per-job locks. A completed export does not mean its Blender process exited: the first wave exposed shutdown hangs, now documented in the worker process. Raw transcripts/credentials remain local; accepted assets/builders/provenance and progress records are versioned. No automatic paid generation or unlimited swarm.

## 2026-11-10 — Validate actual pixels and hanging gear

Wave 02 confirms the invisible bat was alpha-discarded despite valid bounds; require a visible-pixel render check alongside mesh/rig checks. Preserve a working nonhumanoid rig/clips instead of replacing it with a humanoid. Shared flight for bat idle/movement is explicit, not advertised as distinct clips. Hanging brazier gear follows the hand position while staying upright, and its rigid cup rests at floor contact in extreme poses; no chain physics or new gameplay light is implied. Keep exported file meshes, renderer primitives/draw calls, skinned vertices and static unskinned parts distinct in cost reports. Native assertions must reject nonfinite measurements and inspect actual mesh children.

## 2026-11-10 — Canonical rigs, rendered materials and capture state

Wave 03 returned a Strider that reconstructed the rig after overlooking a supplied donor. Exact input paths/hashes and original rest/bind relationships must be verified; a guessed rig with the same names/count is not enough. Deliberate outer presentation transforms are acceptable for silhouette if documented/factored in binding checks and replayed in actual clips. Material callbacks must capture final rendered material instances after actor lighting clones them. Live Vite capture must use the same timestamped animation module as the appearance factory and fail if humanoid Idle is unavailable; no silent rest-pose evidence. Trapkeeper's one-handed ranged visual preference leaves game stats/ammo and normal bow fallback unchanged.

## 2026-11-10 — Wave-04 first-pass coverage and canonical rig gate

Continue roster coverage with bounded parallel DeepSeek authors; organizer returns actual exported-pose findings rather than trusting self-ratings. Werebear/Marshal/Ash fit78/83/74: below80 bear/demon are explicitly first-pass coverage, retained for later refinement, not final art approval. A reusable comparator checks named hierarchy/local rest/inverse binds for every direct canonical skin; added joints/deliberate presentation scale require explicit separate review. Actual unarmed attacks/visible pixels/costs/native final material instances remain required. See [wave-04 report](../creature-model-wave-04.md).
