# One-creature-at-a-time production

This is the active production workflow, approved November 11, 2026. It supersedes the earlier unattended generation batches and old partial-completion spreadsheets. **58 creatures total; current completion and active work are recorded in queue.json.** The user approved Goblin Spearhand, Air Elemental and Wolf for the game. Their exact private exports are pinned in `config/approved-creature-assets.json` and are now normal build defaults when installed.

The queue and its evidence are the cross-machine source of truth. No job continues merely because a chat ends: the next local session reads this queue, resumes its one active creature and records its actual progress. These tools track work and prevent overlap; they do not automate artistic judgment or claim generation is running in the background.

## Order and reuse

1. **18 equipped humanoids:** Goblin Scrapper first, then Road Bandit and Shield Soldier. Reuse the approved Spearhand head/body approach and owned Dungeon Mason/KayKit rigs, parts and authored clips. Simple melee/caster roles precede bow, mallet and sling work. A spear stabs, a bow draws/releases, and a sling requires a real grip and release.
2. **18 specialized humanoids:** skeletons, undead, kobolds, beastfolk and demons. Reuse suitable donors but fit anatomy and deformation individually. A humanoid label does not make a skull, digitigrade leg or wing trivial.
3. **Six animals:** wolf relatives first, then rat, bat and spider. Ordinary animals have no added gear. Existing appropriate multiview meshes may be reused after inspection; generation is optional.
4. **Seven constructs:** reuse rigid parts, fitted joints and authored motion.
5. **Six effect creatures:** layered shapes/materials and motion where appropriate. Use the Air Elemental as a presentation anchor, not the same body for every element.

Exact order and all creature IDs live in [queue.json](queue.json). Order can change with documented evidence (for example a newly discovered suitable donor), but maintain one active creature. Never mark the older raw/painted/rigged files complete based solely on their presence.

## Commands

From the repository root:

```sh
node scripts/creature-production.mjs status
node scripts/creature-production.mjs next
node scripts/creature-production.mjs start CREATURE_ID
# To reopen an integrated creature after visual feedback:
node scripts/creature-production.mjs revise CREATURE_ID
node scripts/creature-production.mjs record goblin-scrapper brief docs/creature-production/goblin-scrapper.md
# Record the subsequent gates in order: model, motion, game-view, integration.
node scripts/creature-production.mjs validate
node scripts/creature-production.mjs assets
```

`start` refuses a second active creature or skipping the documented order. `record` requires an existing repository report and ordered gates. The final gate also requires a matching approved manifest entry and the exact asset bytes locally. Evidence content must be reviewed by the author; a command succeeding does not establish visual quality. No new permission is required for each routine refinement within Bruce's authorized direction.

See [verified owned gear inventory](owned-gear-inventory.md) for supplied headwear, packs, tools, consumables and role props.

## Reuse before new geometry

Bruce explicitly corrected the shallow authored headwear: use the bundle’s helmets, caps, hoods and accessories first, modifying the owned copy to fit the creature. Preserve the source item’s rounded volume, side/back coverage and finished silhouette. Remove ornaments only after inspecting component topology (e.g. the Soldier’s two separate Hat02 horns); recolor or refit rather than replacing the whole item with a primitive. New geometry is for a demonstrated missing part, not a shortcut around inspecting the bundle.

## Mandatory owned-asset search for every creature

**Always inspect what we already own before modeling a creature or its accessories.** This is a required part of the brief gate, not an optional fallback. Search the verified Dungeon Mason/KayKit inventory and inspect likely source meshes or thumbnails. Do not stop at the weapon/headwear: look for clothing, packs, tools, consumables, containers, books, ropes, lights and small environmental props that can be adapted into personal equipment.

Record in each brief:

1. What this creature does and what its silhouette should communicate.
2. The owned candidates actually inspected, with source pack/part names. State which are selected, which need modification and why unsuitable candidates were rejected.
3. One strong signature prop plus supporting details where useful: a fuel bottle/torch for a firestarter, a folded trap/rope/keyring for a trapkeeper, a worn book/candle for a cultist, or a journal/potions for a traveler/caster. These are prompts for creative selection, not fixed loadouts for every member of a family.
4. Attachment and modification plan: carried, worn, held, sheathed, hung from a belt or packed; fit/scale/pivot, palette/material changes, and relevant animation clearance. An environmental prop may become a convincing worn item after adaptation. Large anvils, tents or furniture are not automatically body-sized accessories.
5. Any genuine gap requiring newly authored geometry, after the owned search. Explain why adapting a suitable existing item would not work. Preserve source files, UVs and rigs wherever practical.

Use props to convey occupation, habits and personality while maintaining game-scale readability. Avoid random clutter, impossible loads and gear intersecting hands/limbs. Ordinary animals should remain ordinary animals unless the creature description calls for equipment; the asset search may correctly conclude no carried gear is appropriate. A successful source import is not a grip, attachment or animation check.

## Keep adaptations reusable

Search [the adapted asset library](adapted-asset-library.md) as well as the original inventory. Every useful item made by modifying an existing item must be registered there before its creature completes integration. Include the source/license, modification recipe/spec, private editable object/file, socket/fit, palette and review status. Preserve a separable object or a reproducible extraction/assembly recipe. Reusing a reviewed item on another creature still requires fit and motion clearance checks.

## Color schemes are part of creature design

Bruce explicitly requires deliberate color and color schemes when adapting owned items, to give each creature its own look and feel. **Reusing a mesh does not mean leaving the supplier’s default colors or recoloring every surface the same shade.**

- Record the palette in the brief/spec before assembly: dominant cloth/body color, secondary color, restrained focal accent, and skin/fur, leather, metal and other material colors. Explain the intended role or personality; exact swatches belong in the versioned role JSON when applicable.
- Modify supplied clothing, headwear, shields, weapons, packs and accessories through their existing tint masks/material regions. Coordinate the complete outfit rather than painting each item independently. Preserve readable eyes, mouths, blade edges, straps and other important details.
- Use hue, value and saturation deliberately. Keep neighboring roles distinguishable at dungeon scale: for example Scrapper’s teal/ochre workwear and warm leather, Road Bandit’s olive/rust travel clothes, and Shield Soldier’s green livery/steel armor. These are examples, not a fixed palette imposed on the whole roster.
- Let related creatures share a family or faction palette where useful, while varying accents, equipment finish and silhouette to identify role/rank. Keep the overall sculpted, clean-painted style cohesive. Ordinary animals retain appropriate natural coat colors and do not gain costume gear merely for differentiation.
- Preserve material identity: steel, brass, leather, cloth, skin, stone, fur and elemental effects should read appropriately. Use contrast and selective accents to direct attention; do not make every surface metallic, emissive or uniformly dull. Retain the approved approximately 0.3 polished finish where appropriate, with purposeful material exceptions.
- Review the full palette from front/side/back, in motion and under actual dungeon lighting alongside party characters and nearby creature roles. Check readable light/dark contrast as well as hue; a nameplate or color alone must not carry identity. Record palette revisions in the report/spec and preserve source colors in untouched originals.

## Efficient private visual checks

Use [TextureCraft](../asset-production-pipeline.md#texturecraft-for-creature-materials) when skin, cloth, metal or other surfaces need more than a flat tint. Start with appropriate library materials and adapt their channels and masks. Bruce wants bold grain and broad, high-contrast paint that reads in the dungeon. Use the actual game view to set texture scale and contrast.

`review-equipped-creature.mjs PRIVATE.glb REVIEW_DIR [SCALE] [full|stills]` defaults to full motion capture. Use `stills` during bounded fit/color iterations to inspect front/side/back and a wide final death pose quickly; it writes separate `capture-stills.json` and does not overwrite the full-motion evidence. Stills alone never pass the motion gate. The final reviewed export must match the full capture hash. `check-equipped-ground.py` samples every integer source frame, including frame0 clips, and supplements visual inspection; it does not prove body/gear collision correctness.

## Gates for each creature

| Gate | Required work and evidence |
| --- | --- |
| brief | Read pinned book text/image, existing references and source inventory. Perform and record the mandatory owned clothing/gear/prop search, selected candidates and adaptation/attachment plan. Record silhouette, anatomy, signature, equipment, dominant/secondary/accent and material palette, intended feel, donor/license and cost. Reuse existing reference sheets before generating any. |
| model | Preserve original sources; create an editable task-owned copy. Correct body/head/gear and paint. Review front/side/back at game scale. Record source/output hashes, actual triangles, materials, textures and preliminary six-part fit. No automatic welding, hidden-face deletion or topology reduction. |
| motion | Pose for creature identity, then verify idle, locomotion, correct attack, hit and full death. Check grip, weapon travel, eyes/jaw, joints, foot contact and cloth at multiple frames. Export/reimport, compare bones/clips/materials and test actual Three.js skinning. Return failures to the same creature. |
| game-view | Verify actual game appearance factory, equipped identity, all five animation states and game-scale readability. Check the bestiary uses the same asset. No per-creature FPS benchmark: Bruce explicitly deferred performance testing to a final bulk roster pass on November 11. |
| integration | Author-review the actual evidence. Pin the exact GLB/hash/model route and source/license record; add role-specific factory/attack handling where needed. Verify bestiary and combat use the same asset. Run applicable tests, update report/queue/handoff and commit the checkpoint. Self-review and merge passing changes. Defer packaging/installation and user art review until the roster is ready for bulk review; do not update the installed game after each creature. Distinguish source integration from installed delivery. |

Bruce's three approved anchors establish the direction. Keep further creatures cohesive: deliberate sculpted forms, clean readable colors, fitted equipment and polished materials. Triangle count is a measured cost, not a universal target. The wolf's larger mesh passed its actual encounter. Known minor limitations stay visible in the report; passing FPS alone does not satisfy the art gate. New paid services and broad style changes are outside this no-additional-cost workflow.

## Assets and delivery

Private sources/exports stay out of Git. The manifest records paths, hashes, approval/review provenance and private-local distribution status. Builds without private files retain public fallbacks; a changed file at an approved path fails clearly. Delivery builds use `FLD_REQUIRE_APPROVED_CREATURES=1` so missing inputs cannot silently produce the old models. An unreviewed file elsewhere in the private folder is not approved by its filename.

Use a clean committed/index checkout for packaging while unrelated experimental edits exist. Stage Dungeon Mason inputs and only the approved creature exports. Preserve saves/audio settings; back up the old per-user AppImage before using the supported installer. Build both AppImage and `.deb`. No public release containing private exports is implied by local installation.

After completing one creature, commit/push its progress and verify the remote hash before starting the next. Performance remains pending until the final bulk roster pass; never infer FPS from polygon counts or static captures. Do not silently skip broken work or leave progress only in chat. Keep rejected attempts separate and explain the remaining failure if work stops.

## Bulk delivery and user review

Bruce’s latest November 11 instruction: get through the creatures, then deliver the updated game for bulk review and a targeted tweak pass. Keep author visual/motion/runtime checks and source checkpoints per creature. Do not pause for user approval per model, rebuild installers, reinstall the game or repeat native package checks after every creature. Leave the currently installed seven-creature build alone until the roster delivery checkpoint. Performance also remains a final bulk pass.

Bruce further directs continuing across commits/PR checkpoints without stopping. A checkpoint preserves progress; it is not a stopping condition. Continue until the roster is complete unless a significant unresolved failure or decision genuinely requires user input.
