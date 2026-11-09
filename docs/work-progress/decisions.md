# Durable working decisions

## 2026-11-09 — Local execution, GitHub handoffs

Bruce wants development to execute on each local computer. Use the repository to transfer source, working checkpoints and project knowledge. Do not move execution to Codex Cloud as part of this workflow.

`AGENTS.md` is the shared agent entry point. `docs/work-progress/current.md` is the current handoff index, with dated session records and this decision log. Keep detailed game rules and asset/release policies in their existing docs.

## Existing boundaries

- Bruce is the final design authority. The game is Four Lanterns Deep; Greyhaven is its town.
- The v0.6 Forge replaced old purchase/signature progression. v0.6–v0.8.3 saves remain compatible; earlier saves are separate.
- Purchased source assets stay private. Finished licensed builds use staged Dungeon Mason assets; public source builds have fallbacks. Follow `docs/releases.md`.
- Personal GitHub identity is process-scoped. Never switch global GitHub authentication.
- Passing PRs may be author-reviewed and merged under existing authorization. A WIP checkpoint must remain unmerged until ready.

## 2026-11-09 — Welcome and HUD shortcuts

Keep the logo visible until preload finishes and the player enters explicitly. Place utility controls under one settings gear and center the clock beside the location. Town uses I/M/G/S/L/H/Shift+S/D: Shift+S resolves Bruce's duplicate S requests for Smithy/Shrine. Camp reports show actual completed-hour outcomes, persist across dungeon save/load, and require acknowledgement before returning to planning.

## 2026-11-09 — Camp outcomes, not dice

Bruce wants player-facing camp text to report what happened, without dice, probability percentages or roll tiers. Keep the rules internal. Camp supplies use qualitative stock labels; foraging reports found resources or nothing.

Camp planning shows two tasks per companion and expected HP recovery only when injured. Stores show current supplies per character and a possible-gain hint from assigned work, without numerical end-state projections or hourly rota detail.
