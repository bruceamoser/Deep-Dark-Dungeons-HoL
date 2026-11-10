# Current working progress

Updated: 2026-11-10 (America/New_York).

## Latest work — creature wave 05 and installed menu build

Shieldguard, Crypt Ghoul and Ghast integrated after three parallel DeepSeek authors, two Shieldguard revisions and one Ghast revision (six calls total); Ghoul incorporated live feedback. Fit 26→81/78/78: tall shield/spear hobgoblin, bare hunched corpse, clothed white-haired ghast. First-pass limitations remain; undead below 80, no final/independent art approval. Branch `codex/deepseek-creature-wave-05`, base `428eae9`; see actual Git/PR history for subsequent checkpoint/merge. [Report](../creature-model-wave-05.md), [provenance](../creature-wave-05-provenance.json), [handoff](handoffs/2026-11-10-creature-wave-05.md).

358 tests pass after updating superseded ghoul cast assertion. Byte-identical portable rebuilds, actual render hashes/poses/pixels and factored canonical rig checks pass (Ghoul 1.16 scale explicitly recorded). Muted exact checkout launcher passes 19 updated actors, all 58 adapters/17conditions and58 bestiary comparisons, isolated save/close and sandbox. No rules/stats/IDs/save changes.

**Installed menu corrected:** latest licensed local AppImage now at `~/.local/share/deep-dark-dungeons-hol/Deep-Dark-Dungeons-HoL.AppImage`; normal menu no longer points to old `/opt`. That exact installed executable passes 19 actor and58 bestiary/controls/context checks plus sandbox/save/close. Built Debian too, but system package unchanged; saved original menu backup outside Git. Real saves/sound settings untouched. Local label 0.8.7, public release unchanged; Windows not exercised.

Next requested work: test a local generation/rigging pipeline (Modly/TRELLIS.2, Mesh2Motion and other suggested tools). Bruce explicitly said finish this wave first. Preliminary references only; no experimental installs/weights/generation yet. Verify primary sources/licenses/automation, then one isolated creature pilot. No pending DeepSeek job. Other lowest casts remain Grave Wisp 33, Goblin Firestarter 35, Goblin Rattlechanter 35; check newer scores before assignment.

## Latest work — bestiary model comparison

Bruce requested actual models beside book pictures for local art review. Implemented for all 58 creatures through the real game factory, neutral inspection lighting, fitted framing, drag/wheel/keyboard rotation and zoom, reset, supported animation previews and retained list position. One canvas/context per open guide with model switching and full close cleanup. Both Settings and enemy inspection entry points wired. Branch `codex/bestiary-model-preview`, base `b13e448` after merged wave-04 PR #157; consult Git/PR history for subsequent checkpoint/merge. [Feature](../bestiary-model-review.md), [handoff](handoffs/2026-11-10-bestiary-model-preview.md).

358 tests/build and final muted exact native launcher pass: all 58 models/matching art, same live canvas across selections, controls/poses/search, Escape/Close/reopen/context cleanup, sandbox/seccomp and isolated save/close. Inspected Ash/Werebear screenshots. Earlier test counted canvas data attributes as list buttons; corrected selector and final gate passes. Checkout launcher refreshed (0.8.7 label), installed/public release unchanged; Windows not exercised. No rules/stats/saves/assets changed by this viewer.

No pending worker job. Next art candidates remain Shieldguard/Ghoul/Ghast (26 each), checking current overrides first. First-pass art limitations remain in the wave reports; a functioning preview is not final art approval.

## Latest work — creature wave 04

Bruce asked to continue. Werebear, Hobgoblin Marshal and Ash Demon are integrated after three parallel DeepSeek authors and returned organizer findings for all three; one separate Werebear revision, four calls total. Branch `codex/deepseek-creature-wave-04`, base `af20959`; see actual Git/PR history for subsequent checkpoint/merge. [Report](../creature-model-wave-04.md), [provenance](../creature-wave-04-provenance.json), [handoff](handoffs/2026-11-10-creature-wave-04.md).

Fit 23→78 / 24→83 / 24→74. Bear head/eyes/claws/rustic kit, officer helmet/armor/map board/saber, charcoal winged ash/fire demon replace generic casts. Bear/demon remain below target 80: chunky fur/exaggerated fangs, solid demon anatomy/flat wings/faint smoke need later refinement. First-pass coverage, not final high-end or independent art approval. Source rules/IDs/stats/saves/original donors untouched. Cosmetic demon flicker/boss size preserved; duplicate Marshal weapon suppressed.

358 tests pass. Canonical 23-bone rest/bind comparison, separate Three.js/pixel/actual attack review and rated appearance capture pass. Portable Blender rebuilds: bear/demon byte-identical; Marshal geometry/skin/JSON identical, unused UV differences <=5.96e-8. Muted native exact sandboxed launcher passes 16 visible updated creatures, actual claw attacks, props, heat and boss scale, existing checks, all 58 adapters/17 conditions and isolated save/close. Checkout launcher refreshed, label 0.8.7; installed/public release unchanged; Windows not exercised this wave.

Next lowest: Hobgoblin Shieldguard, Crypt Ghoul, Ghast (26 each), checking newer work first. No pending worker/API/task-owned Blender remains. Raw jobs/rejected renders `~/.local/share/four-lanterns-workers/2026-11-10-wave-04/` local only; accepted .blend/GLBs/builders/docs travel in Git. Keep the three-worker limit, explicit donor path/hash, actual rendered acceptance and quiet testing. Full roster high-end refinement unfinished.

## Latest work — creature wave 03

Bruce selected Cinder Strider, Kobold Trapkeeper and Emberling. Three parallel DeepSeek authors and one returned revision per creature completed; all three are integrated after organizer review. Fit scores 11→81, 14→78, 16→85 are scoped editorial first-pass identity scores, not final art approval. Branch `codex/deepseek-creature-wave-03`, base `50c18fe`; use Git/PR history for observed checkpoint/merge. [Wave report](../creature-model-wave-03.md), [provenance](../creature-wave-03-provenance.json), [handoff](handoffs/2026-11-10-creature-wave-03.md).

Strider is tall/narrow with charcoal/fire/smoke and a directly imported canonical rig, replacing a rejected guessed-rig submission. Trapkeeper has clearer marked cords/tools/apron and 16 draw calls instead of 56, plus a one-handed ranged animation preference. Emberling has a visible orange flame crown and dark coal/crack contrast. Both elementals have subtle material flicker, with no new gameplay light. Rules, source files, stats, creature IDs and saves unchanged.

358 tests, three byte-identical portable Blender rebuilds, rig/bind and source/output hash checks, separate Three.js views/pixels/poses and muted native checks pass. Native scope: 13 visible updated creatures, baseline states, Trapkeeper ranged and both actual elemental unarmed attacks, real rendered-material variation, prior brazier/spell checks, all 58 adapters/17 conditions, exact sandboxed launcher/save/close. Fixed a material-cloning integration bug and a Vite capture module-instance mismatch; final native/capture reruns pass. Checkout launcher refreshed (0.8.7 label), installed/public release unchanged. Windows packaging/interaction not run for this wave.

Next lowest remaining: Werebear (23), Hobgoblin Marshal (24), Ash Demon (24); check newer scores/work before another batch. Keep three-worker cap, canonical input verification, actual rendered-pose/cost review and quiet testing. Raw jobs/rejected drafts `~/.local/share/four-lanterns-workers/2026-11-10-wave-03/` remain local; no API worker/task-owned Blender remains. Accepted GLBs, editable `.blend`, portable builders/provenance and progress records travel in Git. Full-roster high-end refinement remains unfinished.

## Latest work — lowest-rated creature wave 02

Bruce requested another parallel DeepSeek batch from the lowest remaining fit scores. Cave Bat (0→78), Animated Statue (2→80) and Kobold Emberkeeper (9→80) are integrated after organizer review and four requested revision jobs. Three authoring jobs ran concurrently; the exact bounded runner now passes live authoring and revision paths. Branch `codex/deepseek-creature-wave-02`, base `4f52b62`; see Git/PR history for checkpoint/merge. [Wave report](../creature-model-wave-02.md), [provenance](../creature-wave-02-provenance.json), [handoff](handoffs/2026-11-10-creature-wave-02.md).

Bat invisibility was fully transparent palette alpha, now repaired/recolored with original geometry/skin/animation payloads preserved. Statue is a civic guardian with authored spear/shield. Emberkeeper has wing/robe identity and an upright, short suspended brazier with floor contact in low poses. Original inputs/rules/creature IDs unchanged. All three have portable builders and editable Blender sources; this remains first-pass art with explicit gaps.

358 tests, three portable rebuilds, separate Three.js/pixel/pose review and muted native checks pass: ten updated creatures, five baseline states (bat shares idle/movement flight), emberkeeper spellcast plus finite measured cup bounds/orientation, 58 adapters/17 conditions, sandboxed exact launcher/save/close. Corrected a test that measured a group rather than mesh children and moved a test-scene entrance prop that obscured a model; rerun screenshots show all ten. Checkout launcher refreshed, still 0.8.7; installed/public release unchanged. Windows packaging/interaction not run for this batch.

Next lowest candidates: Cinder Strider (11), Kobold Trapkeeper (14), Emberling (16), verifying current scores before the next assignment. Keep three-worker cap, isolated jobs/scenes, organizer render/revision gate, quiet QA and editable sources. Raw wave-02 jobs under `~/.local/share/four-lanterns-workers/2026-11-10-wave-02/` are local-only; no worker API or task-owned Blender process remains. Accepted sources/assets/docs travel in Git. Full-roster high-end refinement remains unfinished.

## Latest work — parallel DeepSeek creature wave

Three concurrent DeepSeek authoring workers completed Stone Knuckle, Kobold Tunnel Scout and Plague Zombie; GPT reviewed/returned one zombie revision and integrated all three. Bruce says these look good for a first pass. Branch `codex/deepseek-creature-wave-01`, base `1244c0a`; [PR #154](https://github.com/bruceamoser/Four-Lanterns-Deep/pull/154) records the checkpoint/merge. See [wave report](../creature-model-wave-01.md), [worker process](../asset-worker-process.md) and [handoff](handoffs/2026-11-10-parallel-creature-workers.md). Fit scores 83/77/73 are scoped editorial identity scores, with explicit remaining art gaps. The historical full-roster audit remains unchanged.

358 tests, portable byte-identical Blender rebuilds, separate Three.js/game-clip review, native seven-model/five-pose visibility checks, 58 creature adapters/17 conditions and exact sandboxed Linux launcher/save/close checks pass. Audio muted. Checkout launcher refreshed (version label 0.8.7); installed package/public release unchanged. Windows desktop interaction untested here. No worker API jobs remain active.

Next: continue bounded parallel batches for failed casts, using one scene/job per worker and organizer review/revision; retain editable sources for later detail refinement. Runner `scripts/toolchain/run_asset_worker.py` initially passed a fake-worker cleanup smoke check; its live paths are now verified by wave 02. Raw jobs/rejected renders under `~/.local/share/four-lanterns-workers/2026-11-10-wave-01/` are local-only. Accepted builders, `.blend`, GLBs, provenance and preview travel in Git. Blender shutdown hangs were confined/cleaned; use kill-after bounds and task-owned background processes.

## Latest follow-up — goblin facial contrast

Bruce accepted the first pilots except the monochrome goblin face. Existing eye/brow/mouth/tusk/jewelry geometry now has contrasting vertex colours, preserving the original source and rig with no added facial meshes. See the follow-up in [pilot report](../creature-model-pilots.md) and [handoff](handoffs/2026-11-10-goblin-face-contrast.md). The current launcher includes this change; local tests remain muted.

Bruce approved recognizable/playable roster coverage first, then a high-capability detail-refinement pass. Continue that staged approach rather than over-polish only the first four.

## Latest work — first creature model pilots

Bruce authorized updating models. Goblin Spearhand now has a spear/pan, Wererat has rat anatomy/tail/thief clothing, Clay Helper is a grounded clay humanoid, and Air Elemental is a hollow animated wind vortex. Original sources and game rules are untouched. See [pilot report](../creature-model-pilots.md), [provenance](../creature-pilots-provenance.json) and [handoff](handoffs/2026-11-10-creature-model-pilots.md). Pilot fit scores: 66/77/76/85 respectively, with explicit remaining art gaps; no claim of final art approval.

358 unit tests and scoped native creature/condition/animation checks pass, plus the separate weapon/save/reload native check. Checkout launcher is rebuilt with pilot content (version label remains 0.8.7); installed game and public release unchanged. No release was requested. Next: visual feedback/refinement, then expand the approach to remaining failed casts. Bruce requests quiet testing: native/release harnesses now use --mute-audio; preserve personal sound settings.

## Latest work — asset-production toolchain prepared

Bruce requested Blender/tools, a usable DeepSeek worker and review of the supplied generation/conditioning blueprint. Blender 5.2.4 LTS, bundled Rigify and MCP for Blender 2.2.7 are installed/enabled on this bmoser machine. Official archive checksum verified; live scene inspection and a real skinned/animated GLB round trip pass. Meshy was explicitly clarified as optional and is deferred, with no account, server or paid generation created.

DeepSeek `deepseek-flash` works through a separate Codex profile with local helper-backed credentials. Live Responses, Codex output and a read-only Blender tool call pass; GPT remains default. Native mixed-provider picker/built-in collaboration support is not claimed. See [pipeline/tool setup](../asset-production-pipeline.md), [reusable skill](../../.agents/skills/fld-game-assets/SKILL.md) and [handoff](handoffs/2026-11-10-asset-production-toolchain.md).

Reviewed workflow replaces destructive blanket welding, purging, decimation, origin/transform changes and bounding-box-only rigging with selective, validated operations. Core assets/gameplay are unchanged. Next work is the four pilot creatures, not a completed art overhaul. Existing local launcher/install versions remain as noted below.

## Latest work — complete visual-fit survey

Bruce requested an honest scored comparison of current creatures to source descriptions and illustrations. [The full audit](../audits/2026-11-10-creature-fit.md), JSON and CSV cover all 58 runtime entries, with six explicit criteria, per-entry rationale, source/asset provenance and reproducible side-by-side captures. Source baseline `a56aacc`; 134 other source creatures are outside the runtime roster. Mean 44.8/100: 5 strong, 9 usable, 12 approximate, 14 weak, 18 failing. Scores are editorial judgments, not measured similarity percentages.

Important findings: Golem key is visibly a floating winged creature, not a stone/clay humanoid; kobolds/hybrids/elementals and corpse proxies need appropriate bodies; several roles lack their stated equipment and humanoid theme geometry is bypassed. Bat body is invisible in both neutral capture and focused actual-game browser scene here; packaged/native reproduction is still needed. Earlier casting claims are explicitly superseded. No gameplay/assets changed and no new release made. See [audit handoff](handoffs/2026-11-10-creature-visual-fit-audit.md).

Historical survey checkpoint; first pilot implementation is now recorded above. Local source and rebuilt checkout launcher are 0.8.7 with pilot changes; installed game remains 0.8.4. Other-machine runtime/installed-version claims below do not describe this machine.

## Complete — v0.8.7 published

All nine player-feedback items, including the approved equipment catalogue, are implemented, author-reviewed and merged. Equipment PR 146 closed #127/#144. Release PR 148 merged at `f7da756a951abaff5c5261f257e755765ad027f3`; immutable tag `v0.8.7` points there. [v0.8.7 is public/latest](https://github.com/bruceamoser/Four-Lanterns-Deep/releases/tag/v0.8.7), with eleven finished licensed release assets. Publication run [42772691226](https://github.com/bruceamoser/Four-Lanterns-Deep/actions/runs/42772691226) passed AppImage, installed Debian, installed Windows NSIS and publication.

See [delivery handoff](handoffs/2026-11-10-equipment-release.md), [equipment catalogue](../equipment-bonuses.md) and [release notes](../release-notes.md). Final documentation PR 149 closes release #147 after verification. No gameplay WIP remains. Resume from main; preserve the untracked superseded Borin prototypes.

## Verified

357 rules tests, final focused equipment tests, complete exact-launcher native suite, both source installer platforms, finished licensed AppImage checks and isolated Linux bundle installer passed. Real 0.8.6→0.8.7 replacement/restart preserved the journey and vault, rejected corrupt downloads and blocked installation on save failure. All public download checksums and both updater manifests verify. An unmodified published 0.8.6 client discovered and downloaded public 0.8.7 through its existing feed. Review was author review, not independent review.

## Machine and private state

Installed Debian was verified 0.8.6 and left unchanged; use Settings → Updates to install 0.8.7. Checkout runtime/builds are 0.8.7. Real saves and personal windows were untouched. Purchased exports, installers and QA outputs stay ignored and do not transfer through Git.

Use `TMPDIR="$PWD/release/qa-tmp"` for builds and QA on this desktop because /tmp is almost full. The first Debian packaging attempt failed there; the main-disk retry succeeded. Follow [machine setup](machines.md) and AGENTS.md before resuming on another computer.
