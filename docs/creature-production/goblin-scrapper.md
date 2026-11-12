# Goblin Scrapper — production brief

Status: **model, motion and game-view reviewed; source integration complete**. Installed delivery follows at the next checkpoint. Performance is explicitly deferred to the final roster pass per Bruce’s updated instruction.

## Verified reference

Pinned creature source: `public/vendor/hol/data/creatures.json`, `creature-goblin-scrapper`, source commit `24e545e6d860e8c1b03a21356fd22cae1c039785`; source-text SHA-256 `47ef4163c610f70b6d9f809123f0bdecc43e065c3d183c936c3b49457fbee1fa`. The flavor describes a small wiry salvager with patched work clothes, scrap pockets and keen eyes. The actual attack is a scrap knife. Pinned bestiary illustration inspected: green skin, long ears, head wrap, patchwork workwear, belt pouches, worn boots and a short irregular knife. These define the target; no spear or saucepan helmet for this role.

## Planned reuse and style

Reuse the approved Spearhand's authored goblin head proportions, readable eyes/teeth, source humanoid body/rig and palette workflow. Choose a lean owned body/outfit and a one-handed knife attack from the verified Dungeon Mason animation inventory. Retain deliberate clean painted colors at game scale; patched cloth and scavenged gear should distinguish this creature without relying on a nameplate. Add a head wrap and asymmetric pouches/tool scraps as separate editable parts where practical.

Source character pipeline: `scripts/toolchain/build-goblin-spearhand-pilot.py`, `prepare-mason-spear-pilot.py`, and `docs/owned-assets-pilot.md`. Purchased inputs remain private and untouched. Find existing Scrapper references before considering new art. No paid generator or full-roster run.

## Next concrete work

1. Inspect the donor body's topology and selected knife animation in a task-owned scene; verify matching rest rig.
2. Assemble head, patched clothing, head wrap, pouches and actual knife. Fit the grip in rest/attack poses; do not rename a spear thrust and call it a knife slash.
3. Review front/side/back and six-part fit, then idle/walk/knife/hit/death. Record the candidate hash and counts.
4. Test six Scrappers/four heroes with normal creature AI, including its movement/retreat behavior. Maintain existing combat rules.
5. Promote only the reviewed export, update manifest/queue, merge and update the installed review build.

## Initial November 11 result — headwear superseded below

Preserved the approved authored goblin head and Dungeon Mason Body08/rest rig. Replaced the pot/spear with a fitted ochre head wrap, stitched patch, teal clothing, asymmetric belt pouches/tool scraps, knee patch and a short notched knife. Used actual SingleSword idle/walk/Attack01/hit/death sources, with exact matching rest matrices and hierarchy; no renamed spear motion. The original purchased inputs remain untouched; derivative GLB stays private.

Final export: **32,858 triangles, 43 bones, five clips, 18 materials, 22 rendered primitives, no textures**. Reimport reports **zero zero-area faces, zero unweighted vertices**. An initial cap pole and thin bevel produced degenerate faces; the builder was corrected before acceptance. Open cloth-band edges are intentional. Source knife grip is rigid to `weapon_r`; pouches follow pelvis, wrap follows head.

Author visually inspected front/side/back, game-scale dungeon, attack draw/swing/recovery, walk, hit and full death. A 242-frame/30fps review captures all five states; raw Three.js validation found finite deformed vertices and no binding failures. Both bestiary and dungeon instantiate `GoblinScrapper`, with all five actual clip selections and no JavaScript errors. A stale development-server manifest initially showed the fallback; restarting after manifest changes resolved it, and the repeated game check passed. No FPS measurement or combat-balance claim.

Author six-part fit: A4/S4/F4/G4/M4/D5 = **82/100**. Readable small goblin salvager with knife/tools, distinct from saucepan Spearhand. Limitations: deliberately broad chibi proportions and chunky gloves; less ragged cloth/weathering than book art, no individual finger animation or facial performance. These are explicit stylization differences, not a claim of exact illustration reproduction.

Private evidence: `~/.local/share/four-lanterns-creature-production/goblin-scrapper/`: editable Blender, GLB, provenance with source animation hashes, roundtrip report, `review/` frames/turnarounds, `validation/`, and `game-view/` bestiary/dungeon/results. Builder: `scripts/toolchain/build-goblin-scrapper.py`. Runtime hash is pinned in the approved manifest. Review is by the author under Bruce’s delegated production direction, not separate user or independent reviewer approval.

## Revised headwear — final accepted version

Bruce rejected the shallow authored cap and required using or modifying bundle headwear. Replaced all primitive-cap code with the supplied **Hat04**. Fitted the task-owned copy at scale (1.04, 1.0, 0.86) and a -0.04 Z offset about the source head socket; preserved its crown, seam/ridge and long side/back coverage. Recolored to ochre and left the goblin ears visible. Bruce confirmed “yeah that looks way better.” No original source files changed.

Final export **31,582 triangles**, 43 bones, five clips; reimport has zero zero-area faces and unweighted vertices. Repeated 242-frame motion render and front/side/back review, finite-deformation validation and actual bestiary/dungeon routing all passed. This supersedes the earlier 32,858-triangle cap and its screenshots/hash. Supplied-cap source hash and final GLB hash are recorded in provenance/manifest. Performance remains deferred. Revised fit A4/S4/F4/G5/M4/D5 = **85/100**; clean leather-cap style differs from the book’s tied cloth, deliberately using a finished fitted donor.

## Player review revision — image-to-3D

Fresh neutral reference based on the bestiary's wiry salvager, stitched head wrap, tool pouch and weathered foot wraps. Reconstruct the body and outfit from this image, then fit the owned scrap knife separately. Private working inputs and outputs under `goblin-scrapper/image-rebuild/`.

The final reconstruction preserves the new head wrap, stitched clothes and salvager's pouch. Fitted the reviewed short scrap knife from the earlier weapon-only assembly. Corrected the hands' weight boundaries and removed six inspected microscopic faces. The 74,137-triangle final export passes reimport, five ground checks, quarter-frame knife/head clearance and 474 reviewed animation frames. Development bestiary and the muted six-Scrapper dungeon fixture pass. Final editable scene and evidence are in private `image-rebuild/rigged-clean/`.
