# 2026-11-10 — Live bestiary model comparison

- Machine: bmoser desktop, Ubuntu Linux.
- Request: show the actual game model beside the source picture for local review.
- Branch: `codex/bestiary-model-preview`; base `b13e448477050b02bf9e91f625e24068b49e256b` after merged wave-04 PR #157.
- Status: implementation/local verification complete; consult Git/PR history for subsequent pushed checkpoint and merge. No release requested.

[Feature and evidence](../../bestiary-model-review.md). All 58 entries display book art beside a live clone from the real game factory. Neutral inspection lighting, fitted camera, drag/wheel/keyboard controls, reset and supported idle/walk/attack/hit/fallen preview. Creature-list position and filters preserved. One rendering context across selections; per-model and full modal cleanup; both Settings and enemy inspection entry points wired. No rules/stats/saves/assets changed in this follow-up.

358 tests and production build pass. Final muted exact launcher check (`/tmp/fld-bestiary-native-final.log`) passes all 58 comparisons/context reuse, controls, poses, search, Escape/Close/reopen/context release, sandbox/seccomp and isolated save/close. Ash/Werebear screenshots visually inspected under `test-results/`. An earlier native test counted canvas data attributes as list entries; fixed the selector, final gate passes. Windows desktop not exercised. Checkout launcher refreshed, label 0.8.7; installed/public release unchanged.

Wave-04 creature models were separately merged in PR #157 and retain documented first-pass gaps. Next art candidates remain Hobgoblin Shieldguard, Crypt Ghoul and Ghast (26 each), checking current ratings first. This viewer makes local review easier; it does not rescore or approve assets.

Accepted code/docs travel in Git. Ignored screenshots, installed tools/profile/credentials/private hero exports stay local. No pending DeepSeek jobs. Task-owned Vite5187 is stopped during delivery cleanup. Check actual remote state before calling a future handoff synced.
