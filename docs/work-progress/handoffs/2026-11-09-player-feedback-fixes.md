# 2026-11-09 — Player feedback fixes

- Machine/platform: Bruce's Linux desktop; checkout `/home/bruce/Projects/Deep-Dark-Dungeons-HoL`.
- Task: fix field action initiation, diagonal movement, hazardous player routes and creature self-preservation/ally care.
- Work branch: `codex/114-sheet-field-abilities`.
- Base: `23396f5`, fetched and confirmed current before work.
- Issues: #114, #115, #116, #117. Follow the issue/branch/PR/review/merge sequence.
- Status: #114 ready for author review in PR #118; no new release.

## Completed

Character sheet activation passes the inspected hero's index, checks their eligibility and selects them before action initiation. Out-of-combat allied field powers open a companion picker in both town and dungeon. Targets show HP and validation reasons, and cancellation is free. Self/world actions retain their existing targeting and combat-only abilities retain their restrictions.

## Decisions

Preserve source rules, printed creature stats/CV and existing terrain/reaction costs. Do not invent healing powers for opponents without them. Mouse diagonal routing already exists; investigate actual behavior before changing rules. A clarification about the reported diagonal interaction is pending.

## Verification

All 298 unit tests pass (`/tmp/fld-fixes-unit-full.log`). Rebuilt licensed checkout package. `verifyFieldAbilities` passes inspected caster identity, town/dungeon target validation, free cancel and actual HP/dressing consumption through `launch-game.sh` with sandboxing enabled (`/tmp/fld-114-native.log`). The picker uses the actual Forge-upgraded power description. Initial native-fixture assumptions about old rest charges, d4 exhaustion and town-only selectors were corrected; no gameplay assertions were relaxed.

## Remaining and next steps

Finish #114 author review and merge passing PR #118. Then diagnose #115, implement #116 hazardous-route consent and #117 self-preservation/printed ally care, each with reviewed PR. Update this checkpoint with actual results before final delivery.

## Local-only state / transfer needs

Paid Dungeon Mason runtime exports verified on this machine. Existing untracked superseded Borin body/layer prototypes remain untouched. Installed game is 0.8.5; initial checkout package was 0.8.3 and is being rebuilt deliberately. No real player saves or personal running windows used for fixtures.

## Sync status

PR #118 branch `codex/114-sheet-field-abilities` is pushed; verify the latest checkpoint with `git ls-remote` before handoff.
