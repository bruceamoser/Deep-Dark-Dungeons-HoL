# 2026-11-09 — Discipline foraging benefits

- Machine: Bruce's Linux desktop.
- Branch: `codex/discipline-foraging-benefits`; base `bd001cb` (camp PR #108).
- Task: small discipline bonuses, larger ability bonuses, following the foraging discussion.

## Changes and decisions

Shared game-owned definitions give personal per-rank benefits: Wilderness improves water/wood/food; Craft wood/fletching; Medicine medicinal materials. Each matching resource gains one percentage point per rank, up to rank III. Existing abilities contribute more and stack with disciplines under the existing 85% total find cap. Effective Forge ranks include origin grants and update automatically for old heroes; no save migration or respec needed. Unrelated disciplines do not help foraging.

Forge origin/rank descriptions and the relevant ability descriptions now explain their foraging benefits without numbers, dice or odds tables. Camp remains uncluttered. Source book/vendor files unchanged.

## Verification and delivery

Unit tests cover rank scaling, relevant resource bands, larger stacked ability effects, unrelated disciplines, cap coverage and actor-only integration. Production/licensed Linux directory package rebuilt. Native Forge/camp interaction is checked through the exact launcher under `aa-exec -p unconfined`, with isolated saves and sandboxing enabled. Final outcomes are recorded in the PR; logs `/tmp/fld-discipline-forage-tests.log` and `/tmp/fld-discipline-forage-native.log`.

## Transfer / next

No new private assets or setup needed. Existing ignored licensed exports/builds remain machine-local. This is a source/local launcher update; v0.8.4 remains the published installer. No additional gameplay task assigned beyond this foraging follow-up. Verify the pushed branch/PR before treating this checkpoint as synchronized.

275 unit tests and the production/licensed Linux directory build pass. The focused native flow covers Forge and dungeon camp rather than repeating the unchanged full gameplay suite. The first QA attempt left a search active before clicking the hidden discipline sidebar; the harness now clears search before that interaction. Current native log: `/tmp/fld-discipline-forage-native2.log`.
