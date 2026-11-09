# 2026-11-09 — Camp UX and held torch lighting

- Branch: `codex/camp-plain-outcomes`; base `70021b4`; PR #108.
- Status: implemented and verified; local Linux launcher rebuilt. Latest published installer remains v0.8.4; this follow-up has no new public release.

## Changes

Camp messages describe found resources, replenishment and care without dice, probability percentages or roll tiers. Two task choices per companion replace detailed condition projections and the bottom hourly rota. Expected HP recovery appears only for injured companions. Required patient selectors and missing-material warnings remain.

Company stores show current supplies per character, actual equipped portraits and possible-increase hints from forecast outcomes. No numerical end-state ranges or consumption counters. Earlier/later controls set explicit work order before camp starts. Order is validated, saved and locked during an active camp so work cannot be repeated or skipped by reordering. Combat formation is unchanged; older camp saves fall back to party order.

Portraits use idle poses and head framing so hidden model bounds do not shift faces off-camera. Torch lighting follows the animated flame anchor for both licensed Dungeon Mason and fallback models, retaining world-scale falloff. Magical lantern light retains its separate fallback position.

## Verification

273 unit tests pass. Production and licensed Linux directory package builds pass. Browser checks cover camp planning, healing, work, pause/save/reload/completion, portraits, order controls, healthy characters without healing clutter, and torch transitions/anchoring in both hands. Desktop and compact screenshots inspected.

The complete native Linux regression passes via the exact `launch-game.sh`, user systemd session and `aa-exec -p unconfined`, with sandboxing enabled, space-free runtime and isolated test saves. Final log: `/tmp/fld-camp-refine-native3.log`. Earlier attempts stopped on outdated QA expectations for the removed foraging wording and provision countdown; those assertions now check the requested interface. GitHub rules/build validation also passes; see PR for final head checks.

## Remaining / transfer

No assigned gameplay work remains. No new installer release was requested or published. Checkout launcher includes this development follow-up; installed releases stay at v0.8.4 until a later release. Existing historical saved journal strings retain their recorded wording. No new private assets or machine setup requirements; licensed exports and build outputs remain ignored and machine-local.
