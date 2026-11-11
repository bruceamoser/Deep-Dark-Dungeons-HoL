# One-creature-at-a-time production

This is the active production workflow, approved November 11, 2026. It supersedes the earlier unattended generation batches and old partial-completion spreadsheets. **58 creatures: three approved anchors, 55 remaining.** The user approved Goblin Spearhand, Air Elemental and Wolf for the game. Their exact private exports are pinned in `config/approved-creature-assets.json` and are now normal build defaults when installed.

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
node scripts/creature-production.mjs start goblin-scrapper
node scripts/creature-production.mjs record goblin-scrapper brief docs/creature-production/goblin-scrapper.md
# Record the subsequent gates in order: model, motion, game-view, integration.
node scripts/creature-production.mjs validate
node scripts/creature-production.mjs assets
```

`start` refuses a second active creature or skipping the documented order. `record` requires an existing repository report and ordered gates. The final gate also requires a matching approved manifest entry and the exact asset bytes locally. Evidence content must be reviewed by the author; a command succeeding does not establish visual quality. No new permission is required for each routine refinement within Bruce's authorized direction.

## Reuse before new geometry

Bruce explicitly corrected the shallow authored headwear: use the bundle’s helmets, caps, hoods and accessories first, modifying the owned copy to fit the creature. Preserve the source item’s rounded volume, side/back coverage and finished silhouette. Remove ornaments only after inspecting component topology (e.g. the Soldier’s two separate Hat02 horns); recolor or refit rather than replacing the whole item with a primitive. New geometry is for a demonstrated missing part, not a shortcut around inspecting the bundle.

## Gates for each creature

| Gate | Required work and evidence |
| --- | --- |
| brief | Read pinned book text/image, existing references and source inventory. Record silhouette, anatomy, signature, equipment, palette, donor/license and cost. Reuse existing reference sheets before generating any. |
| model | Preserve original sources; create an editable task-owned copy. Correct body/head/gear and paint. Review front/side/back at game scale. Record source/output hashes, actual triangles, materials, textures and preliminary six-part fit. No automatic welding, hidden-face deletion or topology reduction. |
| motion | Pose for creature identity, then verify idle, locomotion, correct attack, hit and full death. Check grip, weapon travel, eyes/jaw, joints, foot contact and cloth at multiple frames. Export/reimport, compare bones/clips/materials and test actual Three.js skinning. Return failures to the same creature. |
| game-view | Verify actual game appearance factory, equipped identity, all five animation states and game-scale readability. Check the bestiary uses the same asset. No per-creature FPS benchmark: Bruce explicitly deferred performance testing to a final bulk roster pass on November 11. |
| integration | Author-review the actual evidence. Pin the exact GLB/hash/model route and source/license record; add role-specific factory/attack handling where needed. Verify bestiary and combat use the same asset. Run applicable tests, update report/queue/handoff and commit the checkpoint. Self-review and merge passing changes; update and verify the installed review build at delivery checkpoints. Distinguish source integration from installed delivery. |

Bruce's three approved anchors establish the direction. Keep further creatures cohesive: deliberate sculpted forms, clean readable colors, fitted equipment and polished materials. Triangle count is a measured cost, not a universal target. The wolf's larger mesh passed its actual encounter. Known minor limitations stay visible in the report; passing FPS alone does not satisfy the art gate. New paid services and broad style changes are outside this no-additional-cost workflow.

## Assets and delivery

Private sources/exports stay out of Git. The manifest records paths, hashes, approval/review provenance and private-local distribution status. Builds without private files retain public fallbacks; a changed file at an approved path fails clearly. Delivery builds use `FLD_REQUIRE_APPROVED_CREATURES=1` so missing inputs cannot silently produce the old models. An unreviewed file elsewhere in the private folder is not approved by its filename.

Use a clean committed/index checkout for packaging while unrelated experimental edits exist. Stage Dungeon Mason inputs and only the approved creature exports. Preserve saves/audio settings; back up the old per-user AppImage before using the supported installer. Build both AppImage and `.deb`. No public release containing private exports is implied by local installation.

After completing one creature, commit/push its progress and verify the remote hash before starting the next. Performance remains pending until the final bulk roster pass; never infer FPS from polygon counts or static captures. Do not silently skip broken work or leave progress only in chat. Keep rejected attempts separate and explain the remaining failure if work stops.
