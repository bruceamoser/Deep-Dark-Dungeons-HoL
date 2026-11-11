# 2026-11-11 — Promote three creatures and establish sequential production

- Machine: bmoser Linux desktop / RTX 3090.
- Task: Bruce approved the three pilots and requested promotion plus a humanoid-first pipeline for all remaining creatures, one at a time.
- Branch: `codex/modular-owned-assets-pilot`.
- Base checkpoint: `e99ab5c6804b982f9da7593a83ce40bd680b72a8`.
- Status: integration and local delivery; self-reviewed PR/remote verification recorded in final checkpoint history.

## Completed

Pinned three approved exports with hash validation and default build routing. Required delivery mode refuses missing private inputs; public checkouts retain fallbacks. Fixed Wolf's bestiary bite selector and extended bestiary checks to all five states of installed anchors. Added a 58-entry production queue, CLI enforcing one active creature/ordered evidence, meaningful tests and AGENTS instructions. Goblin Scrapper's source brief is complete; modeling has **not** started. See [delivery report](../../creature-production/2026-11-11-approved-anchors.md) and [workflow](../../creature-production/README.md).

## Verification

363 tests passed in the clean reviewed-index checkout; focused queue tests rerun after activating Scrapper. AppImage and Debian built with only approved private creature files plus existing Dungeon Mason inputs. The first symlinked-dependency package was discarded because it omitted updater transitive dependencies; actual `npm ci --ignore-scripts` corrected packaging before any launch/install. ASAR dependency inventory verified.

Exact normal launcher, unconfined AppArmor/user service, enabled sandbox, muted audio and temporary saves: Spearhand 59.70 FPS, Air 59.45 FPS, Wolf 59.65 FPS, six opponents/four heroes each, all five animation states and no JS errors. Fixtures boost HP/pass hero turns and are not combat balance tests. Normal installed-menu AppImage updated through supported checksum installer; installed bestiary/encounter verification results are in the delivery report. Windows runtime and public release not performed.

## Decisions / next steps

Prior pilot-only/no-roster-work constraints are superseded by Bruce's explicit approval. Humanoids first; reuse owned rigs/heads/gear/animations. No new paid generation, Hunyuan installation or parallel creature jobs. Current queue: three integrated, 55 remaining, one active Goblin Scrapper at the model gate. Resume its report; finish model, motion, encounter and integration before the next creature. Known minor wolf/air limitations remain documented rather than hidden by approval.

## Private state and transfer

Models, editable inputs and media remain private at previously documented roots. Approved model paths/hashes are portable metadata; another machine needs separate private transfer. Old per-user AppImage/menu backed up in `~/.local/share/four-lanterns-install-backups/2026-11-11-approved-anchors/`. System Debian install/public release unchanged; new local `.deb` is available under release. Personal saves/audio unchanged.

Unrelated uncommitted historical creature routing, effects, native-check and generation files remain excluded. Do not reset them or assume they were approved by this promotion. Clean build snapshot is `/tmp/fld-approved-build-oTzpHj` on this machine; it is temporary and not the authoritative source.

## Sync

Commit/push this complete integration and self-review/merge the passing PR as previously authorized. Verify the remote branch and main contain the intended checkpoint; Git history/PR identifies final hashes. No silent background model batch remains after delivery.
