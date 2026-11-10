# 2026-11-09 — Player feedback fixes

- Machine/platform: Bruce's Linux desktop; checkout `/home/bruce/Projects/Deep-Dark-Dungeons-HoL`.
- Task: fix field action initiation, diagonal movement, hazardous player routes and creature self-preservation/ally care.
- Work branch: `codex/116-hazardous-movement` (base `1a0ea6e`).
- Base: `23396f5`, fetched and confirmed current before work.
- Issues: #114, #115, #116, #117. Follow the issue/branch/PR/review/merge sequence.
- Status: #114 merged in PR #118 at `1a0ea6e`; #116 in progress; no new release.

## Completed

Character sheet activation passes the inspected hero's index, checks their eligibility and selects them before action initiation. Out-of-combat allied field powers open a companion picker in both town and dungeon. Targets show HP and validation reasons, and cancellation is free. Self/world actions retain their existing targeting and combat-only abilities retain their restrictions.

## Decisions

Preserve source rules, printed creature stats/CV and existing terrain/reaction costs. Do not invent healing powers for opponents without them. Mouse diagonal routing already exists; investigate actual behavior before changing rules. Bruce clarified the reported diagonal was a combat mouse click. Native clicking an open diagonal works and costs one point; investigate edge cases in #115.

## Verification

All 298 unit tests pass (`/tmp/fld-fixes-unit-full.log`). Rebuilt licensed checkout package. `verifyFieldAbilities` passes inspected caster identity, town/dungeon target validation, free cancel and actual HP/dressing consumption through `launch-game.sh` with sandboxing enabled (`/tmp/fld-114-native.log`). The picker uses the actual Forge-upgraded power description. Initial native-fixture assumptions about old rest charges, d4 exhaustion and town-only selectors were corrected; no gameplay assertions were relaxed.

## Remaining and next steps

Finish #116 focused tests/rebuilt native verification, review and merge. Then investigate #115 diagonal clicks/corners and implement #117 self-preservation/printed ally care, each with reviewed PR. Update this checkpoint with actual results before final delivery.

## Local-only state / transfer needs

Paid Dungeon Mason runtime exports verified on this machine. Existing untracked superseded Borin body/layer prototypes remain untouched. Installed game is 0.8.5; initial checkout package was 0.8.3 and is being rebuilt deliberately. No real player saves or personal running windows used for fixtures.

## Sync status

PR #118 is merged. Push and verify the current #116 branch before handoff.

## #116 hazardous routes

Core movement plans inspect all heroes' routes for fire and harmful magical traps. Consent is held only in memory, covers the reviewed cells/fields and is checked again before travel. Cancel/Escape spends no new cost; a new hazard on an already-paid path pauses remaining travel and resumes without paying twice. Saved routes are checked again after loading. Click-to-interact intent survives confirmation and is discarded on cancellation. Walking powers, swaps and landings use the same consent before action costs; leaps do not contact crossed ground. Pending casting reactions retain reviewed tokens in their existing options record.

Initial 65/66 relevant tests passed; the failed saved-fixture check used an invalid light radius, corrected to a supported value. Focused desktop click/cancel/confirm passes with normal fire damage and one-point diagonal cost; final check after power coverage is pending. Desktop fixture waits for the camera to settle before clicking, avoiding a projection race.
