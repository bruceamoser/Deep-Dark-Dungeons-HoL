# Goblin Scrapper — production brief

Status: **brief complete; modeling has not started**. First remaining creature in the sequential queue. No raw mesh, animation or integration is claimed by this report.

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

Model, motion, encounter and integration evidence: **pending**. Next session should resume here, not start another creature.
