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

## November 11 production result

Preserved the approved authored goblin head and Dungeon Mason Body08/rest rig. Replaced the pot/spear with a fitted ochre head wrap, stitched patch, teal clothing, asymmetric belt pouches/tool scraps, knee patch and a short notched knife. Used actual SingleSword idle/walk/Attack01/hit/death sources, with exact matching rest matrices and hierarchy; no renamed spear motion. The original purchased inputs remain untouched; derivative GLB stays private.

Final export: **32,858 triangles, 43 bones, five clips, 18 materials, 22 rendered primitives, no textures**. Reimport reports **zero zero-area faces, zero unweighted vertices**. An initial cap pole and thin bevel produced degenerate faces; the builder was corrected before acceptance. Open cloth-band edges are intentional. Source knife grip is rigid to `weapon_r`; pouches follow pelvis, wrap follows head.

Author visually inspected front/side/back, game-scale dungeon, attack draw/swing/recovery, walk, hit and full death. A 242-frame/30fps review captures all five states; raw Three.js validation found finite deformed vertices and no binding failures. Both bestiary and dungeon instantiate `GoblinScrapper`, with all five actual clip selections and no JavaScript errors. A stale development-server manifest initially showed the fallback; restarting after manifest changes resolved it, and the repeated game check passed. No FPS measurement or combat-balance claim.

Author six-part fit: A4/S4/F4/G4/M4/D5 = **82/100**. Readable small goblin salvager with knife/tools, distinct from saucepan Spearhand. Limitations: deliberately broad chibi proportions and chunky gloves; less ragged cloth/weathering than book art, no individual finger animation or facial performance. These are explicit stylization differences, not a claim of exact illustration reproduction.

Private evidence: `~/.local/share/four-lanterns-creature-production/goblin-scrapper/`: editable Blender, GLB, provenance with source animation hashes, roundtrip report, `review/` frames/turnarounds, `validation/`, and `game-view/` bestiary/dungeon/results. Builder: `scripts/toolchain/build-goblin-scrapper.py`. Runtime hash is pinned in the approved manifest. Review is by the author under Bruce’s delegated production direction, not separate user or independent reviewer approval.
