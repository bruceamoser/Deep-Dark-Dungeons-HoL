# Current working progress

Updated: 2026-11-10 (America/New_York).

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
