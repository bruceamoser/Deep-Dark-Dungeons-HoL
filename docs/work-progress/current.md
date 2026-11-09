# Current working progress

Updated: 2026-11-09 (America/New_York).

## Baseline

- Product: **Four Lanterns Deep**; canonical repository `bruceamoser/Four-Lanterns-Deep`.
- Latest published release: **[v0.8.5](https://github.com/bruceamoser/Four-Lanterns-Deep/releases/tag/v0.8.5)**, published November 9. Immutable game source/tag: `23effe99ae9ae3d4ba82e12d4fadb999e125c8a3` / `v0.8.5` (PR #110).
- Progression remains the v0.6 Discipline Forge. See [implementation status](../implementation-status.md), [adaptations](../computer-game-deltas.md) and [release process](../releases.md).

## Latest completed work

Bruce requested progress docs, commit/push/merge and a new release while away at dinner. Gameplay PR #110 and release checkpoints #111/#112 are merged; final delivery documentation is PR #113. **v0.8.5 is published as latest**, with licensed AppImage, Debian, Windows NSIS installer, portable Windows ZIP and Linux install bundle.

The release includes tactical creature personalities and ability use across all 58 creatures / 120 Main entries, camp task/supply UX with portraits/order controls and plain outcomes, d8 water, no automatic survival consumption during camp, discipline foraging bonuses, and light following the held torch. See [creature AI coverage](../creature-ai.md), [AI handoff](handoffs/2026-11-09-creature-tactical-ai.md) and [release delivery](handoffs/2026-11-09-v085-release.md). Creature statistics/CV and encounter budgets are unchanged; balance still needs player feedback.

## Verification

- 298 unit tests; complete native Linux regression through the actual rebuilt `launch-game.sh`, sandbox enabled and normal terminal AppArmor context; source-build installer CI; finished licensed local AppImage; isolated Linux bundle installation.
- All three final licensed installer checks pass: AppImage, installed Debian and installed Windows NSIS, [run 42719699495](https://github.com/bruceamoser/Four-Lanterns-Deep/actions/runs/42719699495). Reviewed QA revision `40766f1`; immutable app source/tag `23effe9`. Earlier renderer timing issues and the QA-only fix are recorded in the release handoff.
- Public release assets downloaded after publication: all ten SHA-256 entries pass; Linux/Windows updater sizes and SHA-512 match. Unmodified published 0.8.4 discovered and downloaded 0.8.5 from its original live GitHub feed using isolated data.
- Actual 0.8.4→0.8.5 replacement/restart, save/vault preservation, corrupt-checksum rejection and failed-save install protection pass. No real player saves used or changed.

## Local machine

The checkout launcher is rebuilt as 0.8.5 with verified private licensed runtime exports. Installed system copies are separate: use Settings → Updates or the new installers. This release task did not root-install or replace Bruce's live system package.

Earlier menu diagnosis: a user desktop entry shadowed the installed system entry and launched an old 0.6.0 checkout. It was replaced with the installed Four Lanterns Deep entry and KDE cache refreshed. The historical desktop executable/package name remains `deep-dark-dungeons-hol`; product/menu title is Four Lanterns Deep.

Native checks run from the user systemd session then `aa-exec -p unconfined`: the agent's `NoNewPrivs=1` cannot qualify the SUID sandbox directly. Keep sandboxing enabled and the launcher’s space-free runtime staging.

## Next agent

1. Follow `AGENTS.md` and this folder's startup process; pull before resuming and inspect local changes.
2. Release delivery is complete; no pending publication task. Read the latest release/AI handoffs before new changes.
3. Evaluate creature balance against the new behaviors using player feedback. Coverage and deliberate limitations are explicit in the AI doc.
4. Private licensed exports are verified (251 nodes, 20 animations, 39 weapon grips) and ignored. Preserve finished-release staging rules; source-only CI installers are not public release candidates.

## Transfer gaps

Purchased Dungeon Mason exports, build outputs, saves, local tools and MCP configuration are not transferred by Git. Use [machine setup](machines.md). This repository process preserves explicit project knowledge, not every chat on every device.
