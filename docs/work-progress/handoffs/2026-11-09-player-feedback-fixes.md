# 2026-11-09 — Player feedback fixes

- Machine/platform: Bruce's Linux desktop; checkout `/home/bruce/Projects/Deep-Dark-Dungeons-HoL`.
- Task: fix field action initiation, diagonal movement, hazardous player routes and creature self-preservation/ally care.
- Work branch: `codex/114-sheet-field-abilities`.
- Base: `23396f5`, fetched and confirmed current before work.
- Issues: #114, #115, #116, #117. Follow the issue/branch/PR/review/merge sequence.
- Status: implementation and verification in progress; no new release.

## Completed

Character sheet activation passes the inspected hero's index, checks their eligibility and selects them before action initiation. Out-of-combat allied field powers open a companion picker in both town and dungeon. Targets show HP and validation reasons, and cancellation is free. Self/world actions retain their existing targeting and combat-only abilities retain their restrictions.

## Decisions

Preserve source rules, printed creature stats/CV and existing terrain/reaction costs. Do not invent healing powers for opponents without them. Mouse diagonal routing already exists; investigate actual behavior before changing rules. A clarification about the reported diagonal interaction is pending.

## Verification

In progress: full unit suite, rebuilt checkout package and actual sandboxed `launch-game.sh` focused native check. Added `verifyFieldAbilities` checks for inspected caster identity, town/dungeon target validation, cancel and actual HP/charge effects.

## Remaining and next steps

Finish #114 native verification and author review, merge passing PR. Then diagnose #115, implement #116 hazardous-route consent and #117 self-preservation/printed ally care, each with reviewed PR. Update this checkpoint with actual results before final delivery.

## Local-only state / transfer needs

Paid Dungeon Mason runtime exports verified on this machine. Existing untracked superseded Borin body/layer prototypes remain untouched. Installed game is 0.8.5; initial checkout package was 0.8.3 and is being rebuilt deliberately. No real player saves or personal running windows used for fixtures.

## Sync status

Not yet pushed; work remains local until branch checkpoint is verified remotely.
