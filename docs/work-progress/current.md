# Current working progress

Updated: 2026-11-10 (America/New_York).

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
