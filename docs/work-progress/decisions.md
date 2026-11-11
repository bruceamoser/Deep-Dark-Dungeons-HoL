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

Continue roster coverage with bounded parallel DeepSeek authors; organizer returns actual exported-pose findings rather than trusting self-ratings. Werebear/Marshal/Ash fit78/83/74: below 80 bear/demon are explicitly first-pass coverage, retained for later refinement, not final art approval. A reusable comparator checks named hierarchy/local rest/inverse binds for every direct canonical skin; added joints/deliberate presentation scale require explicit separate review. Actual unarmed attacks/visible pixels/costs/native final material instances remain required. See [wave-04 report](../creature-model-wave-04.md).

## 2026-11-10 — Bestiary as local art review

Bruce wants the model beside its creature illustration to review locally. Use the actual appearance factory and gear, neutral inspection lighting, manual rotation/zoom and supported animation previews. Keep one context across selections and dispose copied resources on switch/close; never substitute a separate approved-looking render for the real game model. Preview availability does not change fit ratings or imply art approval. See [bestiary comparison](../bestiary-model-review.md).

## 2026-11-10 — Installed review builds and next pipeline test

Bruce reviews through the installed game's normal menu, so checkout rebuilds alone are insufficient. Current-source licensed AppImage now supersedes the old user menu target; keep the stable per-user path updated for accepted local art batches, retain real saves and verify the exact menu executable with isolated data/silent audio. Do not overwrite public releases or claim the system Debian package changed. See [wave 05](../creature-model-wave-05.md).

Bruce proposed Modly plus local rigging/motion tools, then explicitly prioritized completing wave 05 before a pipeline test. Next is a bounded one-creature comparison against the current model; verify exact primary repos, model/component licenses, hardware fit, automation and animated export before adoption. No experimental tool/weight installation or generation has occurred. Existing working models remain the baseline.

## 2026-11-10 — Local generation pilot result

The Crypt Ghoul experiment establishes a promising local source-generation route: Modly/TRELLIS.2 produces a much closer static shape and textured illustration match. Keep the successful source private and preserve the production baseline. The first reduced proxy/Mesh2Motion skin fails actual deformation; do not bulk-convert the roster or call it game-ready. Prioritize neutral pose preparation, selective topology/texture baking and fitted weights; require actual five-clip Three.js review before adoption. User approval of the static image does not establish motion acceptance. See [pilot report](../local-mesh-pipeline-pilot.md).

## 2026-11-11 — Reuse owned sources before more generation

Bruce prioritizes minimal/no additional cost and a cohesive high-quality result, allows a style change, and wants the actual KayKit/Dungeon Mason inventory established first. Unity installation is authorized as an asset import/inspection utility; it does not migrate the game. User supplied KayKit v8, matching the already documented version. Retrieve the purchased Unity package through the signed-in owner account; no new purchase needed.

Do not resume unattended full-roster generation based on static mesh success. A bounded reused-body/attached-head experiment is only an assembly test; its visible neck, paint and equipment problems prevent promotion. Choose authored source parts after full inventory and pass one equipped creature through real motion/dungeon review before scaling. See [inventory and acceptance gaps](../owned-assets-pilot.md).

## 2026-11-11 — Goblin preview before dungeon integration

Bruce accepted the source spear test and required a point-first stab. The source Attack02 hand motion needed a constant socket rotation for the separate spear mesh; this is now validated. Bruce then requested a clean goblin head, skin/outfit colours and gear/animation preview before integration. The authored-head/saucepan candidate reuses the exact source rig/body/spear/clips, with green skin/rust cloth/brown leather and a bare scalp under removable headgear. This is a candidate for review, not approval of the full roster's style. See [preview report](../goblin-spearhand-owned-pilot.md). No new purchase, cloud generation, game replacement or batch restart.

## 2026-11-11 — Approve Spearhand for the dungeon pilot

Bruce approved the owned-source Goblin Spearhand preview and requested six opponents plus four heroes in the actual dungeon. Promote that exact private GLB through a dedicated conditional model route; preserve its source skeleton/materials/thrust and avoid legacy gear attachments. Reuse existing approach-before-impact/full-death handling. Normal installed-menu review must match the checkout, so update the per-user AppImage with a backup, then test it independently using temporary saves and muted audio. This one-role qualification does not authorize resuming the abandoned whole-roster generator. See [native encounter report](../goblin-spearhand-dungeon.md).

## 2026-11-11 — Existing reference sheets for Tripo

Bruce selected Air Elemental then Wolf for the next tests, and wants a Tripo comparison using existing multiview sheets. Find and reuse the earlier references; do not regenerate them just because they are absent from the immediate chat. An unnecessary new Air Elemental image was generated before this correction, and is excluded from the supplied reference bundle. The original Air Elemental and later solid-body variant are separate designs, clearly labeled. Goblin Smoke Slinger uses the prior stylized equipped A-pose sheet. No Tripo spending or generation has occurred.

## 2026-11-11 — Air pilot and local Hunyuan research

Keep the Air Elemental candidate behind `FLD_AIR_PILOT=1` while reviewing its appearance. Native six-plus-four technical checks pass, but that does not authorize automatic roster promotion or a new installed release. Runtime object animation is appropriate for this wind creature; do not claim the static GLB contains a humanoid skeleton or embedded clips. Wolf remains the next planned pilot.

Bruce reports Tripo's extra cost did not produce a worthwhile improvement and asks about local Hunyuan multiview. Research confirms technical feasibility on a 3090, but the current 2mv license explicitly restricts generated outputs in EU/UK/South Korea. No installation or generation occurred. Resolve that production-use issue before adopting it; judge any bounded experiment by total correction time through animation, not static generation speed. See [research](../hunyuan-local-feasibility.md).

Bruce then asked to continue the existing workflow and called the Air Elemental fantastic. Defer Hunyuan; proceed to the already planned Wolf pilot using existing owned/free sources.

## 2026-11-11 — Bounded Wolf reuse pilot

Reuse the already generated multiview wolf mesh and fitted rig, preserving originals; no new image generation or whole-roster job. The Quaternius source is useful as a comparison, but too blocky for this target and lacks a hit clip. Candidate refinements include coat, fitted eyes and a real opening jaw. Its 118,007 triangles are qualified by an actual six-wolf/four-hero encounter, not by a fixed triangle-budget promise. Keep the candidate opt-in until visual review. Remaining foot/gait/mouth polish is explicit in the report; passing FPS and clip assertions is not final art approval.

## 2026-11-11 — Promote all three anchors; humanoids first, sequential production

Bruce explicitly approves the Goblin Spearhand, Air Elemental and Wolf results for the game. Promote the exact reviewed exports as defaults, update the local installed review build, and follow a tracked queue for all 55 remaining creatures. This supersedes prior pilot-only/no-roster-work constraints, while retaining one active creature at a time rather than the failed unattended generation batch. Humanoids go first to reuse fitted bodies, heads, held gear and authored clips; specialized grips/anatomy get their own reviews. No requirement to ask Bruce for routine per-creature permission within this approved direction.

Use `docs/creature-production/README.md`, queue.json and the pinned approved asset manifest. Status/gates/evidence must travel through Git. Goblin Scrapper is first; its brief is complete, modeling remains next. Private assets stay outside Git; missing-input fallback must not be confused with a complete delivery build. No Hunyuan, Tripo spending or parallel creature workers authorized by this workflow change.

## 2026-11-11 — Final bulk performance pass, per-creature visual gates

Bruce explicitly deferred performance testing until the full roster is complete. Replace the per-creature encounter benchmark gate with `game-view`: actual game appearance/bestiary routing and game-scale look, alongside model/gear and five-animation review. Preserve all existing evidence. Queue records performance as deferred; do not infer new FPS results from old anchors. Commit each source integration before proceeding; installed builds/PR merges occur at delivery checkpoints. This reduces repeated packaging/benchmarking without dropping visual checks.

## 2026-11-11 — Modify owned headpieces; reject shallow primitive caps

Bruce rejected the authored shallow Scrapper cap and Soldier helmet and explicitly directed reuse/modification of existing bundle items. Use supplied helmet/cap/hood volume and fit as the baseline. Soldier now uses Hat02 with only its two disconnected horns removed, preserving shell/rim/crest/guards. Revise Scrapper’s headwear next before new roster work. Do not treat successful mesh/animation checks as overriding the user’s visual correction.

## 2026-11-11 — Deliberate creature palettes and recolored owned items

Bruce explicitly requires color schemes when modifying supplied assets to give creatures distinct looks and feels. Each role brief/spec must name dominant/secondary/accent colors and material colors, coordinate outfit/gear, preserve facial/weapon detail, and verify readability in dungeon lighting. Palette design complements silhouette/gear; it does not replace them. Related factions can share colors with role accents, while ordinary animals keep appropriate coats. See the active production workflow’s color-scheme section.

## 2026-11-11 — Mandatory creative owned-prop search for every creature

Bruce explicitly requires the pipeline to always search what we own for items to add to creatures, including nonweapon tools, bottles, books, rope, traps, containers and lights. Every brief must record inspected candidate parts, selected role/personality props, planned modifications/colors/attachments and any remaining gap. Reuse/modify first; avoid random clutter and do not equip ordinary animals without a creature-specific reason. The workflow’s required brief gate now spells this out.
