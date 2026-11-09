# 2026-11-09 — Plain camp outcomes

- Branch: `codex/camp-plain-outcomes`; base `70021b4`.
- User request: hide camp dice, roll tiers and probabilities; report useful outcomes.
- Changes: foraging found/nothing text, replenished supplies, simple treatment and watch outcomes; no forage odds table or interruption percentage; qualitative camp stock labels. Rules, RNG and save format unchanged.
- Verification: 271 unit tests and production build pass. Camp browser flow passed: planning, hourly work/healing, pause, save/reload and completion. No native packaged launch or installer release for this text-only follow-up.
- v0.8.4 remains the published installer; source changes need a future build to reach installed copies. Existing saved historical event strings are retained as recorded.
- Follow-up: simplified companion rows to two tasks and injured-only expected healing; removed hourly rota and numerical stock projections. Per-character stores use qualitative levels and recipient-aware possible-gain hints from forecast outcomes. Task requirements/patient selectors remain when needed.
- Added a forecast regression check that gain hints follow the foraging hero and disappear when reassigned to guarding.
- No new private assets or machine setup requirements.

## Camp order and torch follow-up

Company store cards include character portraits and earlier/later controls. Work order is explicit, validated, saved, and locked once camp begins to avoid repeating or skipping work mid-watch. Older saves fall back to party order. Combat formation is unchanged. Torch point lighting follows a flame anchor on the animated held torch for both licensed and fallback models, preserving world-scale falloff.

Latest verification: 273 unit tests, production/package build, browser camp planning/save/reload/completion, portrait/order controls and torch model/light anchoring checks pass. Portraits now use an idle pose and head framing to avoid hidden mesh bounds shifting the camera. Full native Linux check is being repeated after updating its HUD assertion from the previous foraging wording; the first attempt stopped on that stale expectation, with actual plain outcomes rendered correctly. No new public release has been published.
