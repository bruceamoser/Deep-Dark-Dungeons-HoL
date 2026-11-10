# November 10 — First four creature-model pilots

- Branch: `codex/creature-model-pilots`; base `fea05be0d80ead88579016e91797818979745f31`.
- Machine: `/home/bmoser/Documents/ChatGPT/HoL Procedural Game`.
- Request: start updating models after the survey/toolchain prep. Chosen pilots: Goblin Spearhand, Wererat, Clay Helper, Air Elemental. Bruce additionally requests quiet local testing and asks that DeepSeek be used for worker tasks.

## Completed first batch

Authored five Blender exports and editable sources with a repeatable builder. Spear/pan attach to the goblin rig; shared humanoid spear users prefer the existing thrust animation. Wererat uses the CC0 Ninja rig/body with new rat head/ears/teeth/whiskers, thief clothing and four extra tail joints. Clay Helper uses new clay geometry on the shared humanoid rig. Air Elemental is a skull-free hollow wind/leaf vortex with idle, travel, attack, hit and death animation adapters. Creature IDs, statistics, abilities, AI and saves are unchanged.

[Feature report](../../creature-model-pilots.md), [provenance](../../creature-pilots-provenance.json), [new scores](../../audits/2026-11-10-creature-pilots.json). Same-rubric scores 66/77/76/85 vs 41/19/9/11. These are stylized first-pass art, not completed high-end art approval. Original 58-entry baseline remains historical; no full-roster re-rating claimed. Model-only lineup travels in `art/exports/creatures/pilot-lineup.png`; full book/front/rear comparison is local ignored `test-results/creature-model-pilots/comparison.html`.

## Verification

- 358 unit tests pass (`/tmp/fld-pilot-tests-final.log`), including spear thrust selection and unchanged normal/fallback animation resolution.
- Blender inspection: Wererat 6,490 triangles/27 bones; Clay 2,800/23; Air 1,546; spear 1,492; pan 412. Skin has no unweighted vertices; zero-area faces eliminated. Inspector excludes Blender's bone-display helper geometry; static assets report weight counts as N/A. GLB hashes and donor CC0 source hash recorded. Original Ninja source is unchanged.
- Native exact-launcher scoped creature gallery/17 conditions and pilot animation flow pass (`/tmp/fld-pilot-native-pass.log`). Separate magic weapon/save/reload regression passes (`/tmp/fld-pilot-weapon-native.log`). Latest strengthened pilot check uses every rendered vertex, five distinct world-space poses and muted playback (`/tmp/fld-pilot-native-final-allverts.log`). Normal terminal AppArmor/renderer seccomp/space-free launcher/no --no-sandbox/save-close checks retained. No real saves used.
- Source browser and native images were inspected. Attack/hit/death screenshots use a held animation state so scene idle fallback does not replace a short one-shot before capture. The tests don't certify every possible pose/outfit; grip placement and tail sway remain visual judgments, not node-existence assertions.
- Blender editable files and runtime GLBs are original/CC0-derived, not purchased exports or cloud generation. No new dependency or paid service required.

Resolved checks: first spear was short/occluded; rat neck needed overlap; ribbon tips generated zero-area faces; separate new mesh parts needed joining to reduce calls. The first pose fingerprint was mesh-local and missed wind object motion; corrected to world-space. An initial combined native run closed unexpectedly at an unrelated weapon reload; only subsequent isolated successes are claimed. Quiet-launch assertion initially assumed /proc/cmdline retained separate argv entries; Electron rewrites its process title, so it now checks token boundaries in the joined command line, retaining the same required flag.

## DeepSeek worker

The setup smoke was the only DeepSeek use before Bruce asked during this work. A real bounded Codex/DeepSeek worker then reviewed four supplied files in isolated `/tmp/fld-pilot-worker-*`, read-only with MCP disabled. It found useful gaps: sampled rather than all-vertex validation, incomplete distinct-state assertion, N/A weights and missing material metadata. Those are corrected or explicitly scoped. Missing security/unit evidence in its four-file input is not evidence those checks were absent from the full repo. No image/art assessment or independent full review is claimed. GPT retained model authoring/integration/visual decisions. Worker log: `/tmp/fld-pilot-deepseek-review.jsonl`.

## Quiet testing and local state

AGENTS.md now records Bruce's preference. Native and release test launches use --mute-audio; native QA verifies the flag. Personal sound preferences and desktop master volume are untouched. Checkout `launch-game.sh` is rebuilt with current pilots, version label 0.8.7. Installed 0.8.4 and public 0.8.7 release are unchanged; no release requested. Vite test server is task-owned and should be stopped after final capture. Blender test/workspace state remains separate from personal windows.

## Next / transfer

First-batch implementation is ready for author review/checks/merge, with remaining style/detail gaps explicit. Inspect the lineup with Bruce before broad conversion to this art style. Likely next refinements: goblin body/ears, less mouse-like rat/fur, clay surface/silhouette, softer cloud breakup. Other failing casts (including bat visibility, statue/stone bodies, kobolds, werebear and undead) remain open. Do not rewrite baseline scores or claim the entire roster is fixed.

Source .blend files, builder, GLBs, provenance, report and skill-aware workflow travel through Git. Test screenshots/HTML/reports stay ignored and can be regenerated. No API key, installed Blender binary, purchased source export or live save is in this checkpoint. Verify remote PR/merge before claiming synced.
